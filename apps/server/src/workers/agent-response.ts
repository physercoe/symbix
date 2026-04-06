import type { Job } from 'bullmq';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { agents, messages, agentMemory, channels } from '../db/schema/index.js';
import { redis } from '../redis.js';
import { env } from '../env.js';
import { LLM, AnthropicProvider, OpenAIProvider } from '@symbix/llm';
import type { ChatMessage, ChatChunk } from '@symbix/llm';
import type { Agent } from '../db/schema/agents.js';
import { agentResponseQueue } from '../services/bull.js';
import { executeTool } from '../services/tool-executor.js';
import { ALL_AGENT_TOOLS, resolvePermissions, filterToolsByPermissions, hasToolPermission } from '@symbix/shared';
import type { AgentPermissions } from '@symbix/shared';
import { recordActivity } from '../services/activity.js';

const MAX_TOOL_ROUNDS = 10;

function createLLMForAgent(agent: Agent): LLM {
  const llm = new LLM();
  const provider = agent.llmProvider;

  if (provider === 'anthropic') {
    const apiKey = agent.llmApiKey || env.ANTHROPIC_API_KEY;
    if (apiKey) {
      llm.register(new AnthropicProvider({ apiKey, baseURL: agent.llmBaseUrl ?? undefined }));
    }
  } else if (provider === 'openai') {
    const apiKey = agent.llmApiKey || env.OPENAI_API_KEY;
    if (apiKey) {
      llm.register(new OpenAIProvider({ apiKey, baseURL: agent.llmBaseUrl ?? undefined }));
    }
  }

  return llm;
}

interface AgentResponseJobData {
  agentId: string;
  channelId: string;
  triggerMessageId: string;
}

/**
 * Collect streaming chunks, handling text and tool calls.
 * Returns the full text response and any tool calls made.
 */
async function collectStreamResponse(
  stream: AsyncGenerator<ChatChunk>,
  channelId: string,
  agentId: string,
): Promise<{
  text: string;
  toolCalls: { id: string; name: string; arguments: string }[];
}> {
  let fullText = '';
  const toolCalls: { id: string; name: string; arguments: string }[] = [];
  let currentToolCall: { id: string; name: string; arguments: string } | null = null;

  let chunkCount = 0;
  for await (const chunk of stream) {
    if (chunk.type === 'text' && chunk.text) {
      fullText += chunk.text;
      chunkCount++;

      const published = await redis.publish(
        `channel:${channelId}`,
        JSON.stringify({ type: 'agent_typing', agentId, channelId, chunk: chunk.text }),
      );
      if (chunkCount === 1) {
        console.log(`[streaming] First chunk for agent ${agentId} in channel ${channelId}, subscribers: ${published}`);
      }
    }

    if (chunk.type === 'tool_call_start' && chunk.toolCall) {
      // Finalize previous tool call if any
      if (currentToolCall) toolCalls.push(currentToolCall);
      currentToolCall = { ...chunk.toolCall };
    }

    if (chunk.type === 'tool_call_delta' && chunk.toolCall && currentToolCall) {
      currentToolCall.arguments += chunk.toolCall.arguments;
    }

    if (chunk.type === 'done') {
      if (currentToolCall) {
        toolCalls.push(currentToolCall);
        currentToolCall = null;
      }
    }
  }

  // Safety: push any remaining tool call
  if (currentToolCall) toolCalls.push(currentToolCall);

  console.log(`[streaming] Done: ${chunkCount} text chunks, ${fullText.length} chars, ${toolCalls.length} tool calls`);
  return { text: fullText, toolCalls };
}

export async function processAgentResponse(job: Job<AgentResponseJobData>) {
  const { agentId, channelId } = job.data;

  // 1. Load agent
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
  if (!agent) return;

  // 1b. Resolve workspaceId from channel (agents are now team-scoped, not workspace-scoped)
  const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
  const channelWorkspaceId = channel?.workspaceId ?? '';

  const responseStartTime = Date.now();

  // 2. Wake agent
  await db.update(agents).set({ status: 'active' }).where(eq(agents.id, agentId));
  await redis.publish(
    `channel:${channelId}`,
    JSON.stringify({ type: 'agent_status', agentId, status: 'active' }),
  );

  // Record wake event
  recordActivity({
    teamId: agent.teamId,
    workspaceId: channelWorkspaceId || undefined,
    actorType: 'agent',
    actorId: agentId,
    eventType: 'agent_wake',
  });

  // 3. Load last 50 messages as context
  const recentMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.channelId, channelId))
    .orderBy(desc(messages.createdAt))
    .limit(50);

  // 4. Load agent memory
  const memory = await db.select().from(agentMemory).where(eq(agentMemory.agentId, agentId));

  // 5. Build LLM messages
  const memoryContext = memory.length
    ? `\n\nYour persistent memory:\n${memory.map((m) => `- ${m.key}: ${m.content}`).join('\n')}`
    : '';

  // Resolve permissions from config (supports legacy boolean flags + new granular permissions)
  const agentConfig = (agent.config as Record<string, unknown>) ?? {};
  const caps = agent.capabilities ?? [];

  // Legacy compat: if capabilities array has tool flags, merge into config for resolvePermissions
  const configForPerms = { ...agentConfig };
  if (caps.includes('channel_tools')) configForPerms.channelTools = true;
  if (caps.includes('workspace_tools')) configForPerms.workspaceTools = true;
  const permissions: AgentPermissions = resolvePermissions(configForPerms);

  // Filter all tools to only those this agent has permission for
  const allowedTools = filterToolsByPermissions(ALL_AGENT_TOOLS, permissions);

  let toolInstructions = '';
  if (allowedTools.length > 0) {
    const groupSummary = allowedTools
      .map((t) => t.group)
      .filter((g, i, arr) => g && arr.indexOf(g) === i);
    toolInstructions = `\n\nYou have access to the following tool groups: ${groupSummary.join(', ')}. Use them when relevant to help the user. Always confirm what you did after using a tool.`;
  }

  const chatMessages: ChatMessage[] = [
    {
      role: 'system',
      content: `${agent.systemPrompt}${memoryContext}${toolInstructions}\n\nYou are "${agent.name}". ${agent.roleDescription}`,
    },
    ...recentMessages.reverse().map((msg) => ({
      role: (msg.senderType === 'agent' && msg.senderId === agentId
        ? 'assistant'
        : 'user') as 'user' | 'assistant',
      content: msg.content ?? '',
    })),
  ];

  console.log(`[agent ${agent.name}] Context: ${chatMessages.length} msgs → ${agent.llmProvider}/${agent.llmModel}, tools=${allowedTools.length}/${ALL_AGENT_TOOLS.length}`);

  const llm = createLLMForAgent(agent);
  let fullResponse = '';

  try {
    const tools = allowedTools.length > 0 ? allowedTools : undefined;

    // Tool-calling loop: LLM may call tools, we execute them, then continue
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stream = llm.chat({
        provider: agent.llmProvider,
        model: agent.llmModel,
        messages: chatMessages,
        tools,
      });

      const { text, toolCalls } = await collectStreamResponse(stream, channelId, agentId);
      fullResponse += text;

      if (toolCalls.length === 0) {
        // No tool calls — we're done
        break;
      }

      // Execute tool calls
      console.log(`[agent ${agent.name}] Round ${round + 1}: ${toolCalls.length} tool call(s)`);

      // Add assistant message with tool calls to history
      chatMessages.push({
        role: 'assistant',
        content: text,
        toolCalls,
      });

      // Execute each tool and add results
      for (const tc of toolCalls) {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(tc.arguments || '{}');
        } catch {
          console.error(`[agent ${agent.name}] Failed to parse tool args for ${tc.name}: ${tc.arguments}`);
        }

        console.log(`[agent ${agent.name}] Executing tool: ${tc.name}(${JSON.stringify(parsedArgs)})`);

        const toolStartTime = Date.now();
        const { result, isError } = await executeTool(tc.name, parsedArgs, {
          channelId,
          agentId,
          workspaceId: channelWorkspaceId,
          permissions,
        });
        const toolDurationMs = Date.now() - toolStartTime;

        console.log(`[agent ${agent.name}] Tool result (${isError ? 'ERROR' : 'OK'}): ${result.slice(0, 200)}`);

        // Record tool call event
        recordActivity({
          teamId: agent.teamId,
          workspaceId: channelWorkspaceId || undefined,
          actorType: 'agent',
          actorId: agentId,
          eventType: 'tool_call',
          metadata: { tool_name: tc.name, success: !isError, duration_ms: toolDurationMs },
        });

        chatMessages.push({
          role: 'user',
          content: '',
          toolResults: [{ toolCallId: tc.id, result, isError }],
        });
      }

      // Continue the loop — LLM will see tool results and may call more tools or respond with text
    }
  } catch (err) {
    console.error(`LLM error for agent ${agentId}:`, err);
    console.error(`Agent LLM config: provider=${agent.llmProvider}, model=${agent.llmModel}, baseUrl=${agent.llmBaseUrl}, hasApiKey=${!!agent.llmApiKey}, hasEnvKey=${agent.llmProvider === 'anthropic' ? !!env.ANTHROPIC_API_KEY : !!env.OPENAI_API_KEY}`);
    fullResponse = 'Sorry, I encountered an error generating a response.';

    // Record error event
    recordActivity({
      teamId: agent.teamId,
      workspaceId: channelWorkspaceId || undefined,
      actorType: 'agent',
      actorId: agentId,
      eventType: 'agent_error',
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  const latencyMs = Date.now() - responseStartTime;

  // 7. Save response as message
  const [savedMessage] = await db
    .insert(messages)
    .values({
      channelId,
      senderType: 'agent',
      senderId: agentId,
      content: fullResponse,
      contentType: 'text',
    })
    .returning();

  await redis.publish(
    `channel:${channelId}`,
    JSON.stringify({ type: 'new_message', message: savedMessage }),
  );

  // Record agent response event
  recordActivity({
    teamId: agent.teamId,
    workspaceId: channelWorkspaceId || undefined,
    actorType: 'agent',
    actorId: agentId,
    eventType: 'agent_response',
    metadata: { latency_ms: latencyMs, response_length: fullResponse.length },
  });

  // 8. Schedule sleep after 5 minutes of inactivity
  await agentResponseQueue.add(
    'sleep',
    { agentId },
    { delay: 5 * 60 * 1000, jobId: `sleep-${agentId}` },
  );
}

export async function processAgentSleep(job: Job<{ agentId: string }>) {
  const { agentId } = job.data;
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
  await db.update(agents).set({ status: 'sleeping' }).where(eq(agents.id, agentId));

  if (agent) {
    recordActivity({
      teamId: agent.teamId,
      actorType: 'agent',
      actorId: agentId,
      eventType: 'agent_sleep',
    });
  }
}
