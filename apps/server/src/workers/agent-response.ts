import type { Job } from 'bullmq';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { agents, messages, agentMemory } from '../db/schema/index.js';
import { redis } from '../redis.js';
import { env } from '../env.js';
import { LLM, AnthropicProvider, OpenAIProvider } from '@symbix/llm';
import type { Agent } from '../db/schema/agents.js';
import { agentResponseQueue } from '../services/bull.js';

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

export async function processAgentResponse(job: Job<AgentResponseJobData>) {
  const { agentId, channelId } = job.data;

  // 1. Load agent
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent) return;

  // 2. Wake agent
  await db
    .update(agents)
    .set({ status: 'active' })
    .where(eq(agents.id, agentId));

  await redis.publish(
    `channel:${channelId}`,
    JSON.stringify({ type: 'agent_status', agentId, status: 'active' }),
  );

  // 3. Load last 50 messages as context
  const recentMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.channelId, channelId))
    .orderBy(desc(messages.createdAt))
    .limit(50);

  // 4. Load agent memory
  const memory = await db
    .select()
    .from(agentMemory)
    .where(eq(agentMemory.agentId, agentId));

  // 5. Build LLM messages
  const memoryContext = memory.length
    ? `\n\nYour persistent memory:\n${memory.map((m) => `- ${m.key}: ${m.content}`).join('\n')}`
    : '';

  const chatMessages = [
    {
      role: 'system' as const,
      content: `${agent.systemPrompt}${memoryContext}\n\nYou are "${agent.name}". ${agent.roleDescription}`,
    },
    ...recentMessages.reverse().map((msg) => ({
      role: (msg.senderType === 'agent' && msg.senderId === agentId
        ? 'assistant'
        : 'user') as 'user' | 'assistant',
      content: msg.content ?? '',
    })),
  ];

  // 6. Stream LLM response
  let fullResponse = '';

  const llm = createLLMForAgent(agent);

  try {
    const stream = llm.chat({
      provider: agent.llmProvider,
      model: agent.llmModel,
      messages: chatMessages,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'text' && chunk.text) {
        fullResponse += chunk.text;

        // Publish streaming chunk for real-time display
        await redis.publish(
          `channel:${channelId}`,
          JSON.stringify({
            type: 'agent_typing',
            agentId,
            channelId,
            chunk: chunk.text,
          }),
        );
      }
    }
  } catch (err) {
    console.error(`LLM error for agent ${agentId}:`, err);
    console.error(`Agent LLM config: provider=${agent.llmProvider}, model=${agent.llmModel}, baseUrl=${agent.llmBaseUrl}, hasApiKey=${!!agent.llmApiKey}, hasEnvKey=${agent.llmProvider === 'anthropic' ? !!env.ANTHROPIC_API_KEY : !!env.OPENAI_API_KEY}`);
    fullResponse = 'Sorry, I encountered an error generating a response.';
  }

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

  // Broadcast the final message
  await redis.publish(
    `channel:${channelId}`,
    JSON.stringify({ type: 'new_message', message: savedMessage }),
  );

  // 8. Schedule sleep after 5 minutes of inactivity
  await agentResponseQueue.add(
    'sleep',
    { agentId },
    { delay: 5 * 60 * 1000, jobId: `sleep-${agentId}` },
  );
}

export async function processAgentSleep(job: Job<{ agentId: string }>) {
  const { agentId } = job.data;

  await db
    .update(agents)
    .set({ status: 'sleeping' })
    .where(eq(agents.id, agentId));
}
