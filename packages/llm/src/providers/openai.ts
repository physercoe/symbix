import OpenAI from 'openai';
import type { LLMProvider, ChatParams, ChatChunk } from '../types.js';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;

  constructor({ apiKey, baseURL }: { apiKey: string; baseURL?: string }) {
    this.client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  }

  async *chat(params: ChatParams): AsyncGenerator<ChatChunk> {
    // Build messages with tool results support
    const messages: OpenAI.ChatCompletionMessageParam[] = params.messages.map((m) => {
      if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
          role: 'assistant' as const,
          content: m.content || null,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        };
      }
      if (m.toolResults?.length) {
        // OpenAI expects individual tool result messages
        // Return the first one here; caller should flatten
        return {
          role: 'tool' as const,
          tool_call_id: m.toolResults[0].toolCallId,
          content: m.toolResults[0].result,
        };
      }
      return { role: m.role, content: m.content };
    });

    // Build tools array for OpenAI format
    const tools = params.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));

    const stream = await this.client.chat.completions.create({
      model: params.model,
      messages,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature,
      ...(tools?.length ? { tools } : {}),
      stream: true,
    });

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const content = choice.delta?.content;
      if (content) {
        yield { type: 'text', text: content };
      }

      // Tool calls in streaming come as deltas
      const toolCalls = choice.delta?.tool_calls;
      if (toolCalls) {
        for (const tc of toolCalls) {
          if (tc.id) {
            yield {
              type: 'tool_call_start',
              toolCall: {
                id: tc.id,
                name: tc.function?.name ?? '',
                arguments: tc.function?.arguments ?? '',
              },
            };
          } else if (tc.function?.arguments) {
            yield {
              type: 'tool_call_delta',
              toolCall: {
                id: '',
                name: '',
                arguments: tc.function.arguments,
              },
            };
          }
        }
      }
    }

    yield { type: 'done' };
  }
}
