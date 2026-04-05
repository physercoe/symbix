import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, ChatParams, ChatChunk } from '../types.js';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private client: Anthropic;

  constructor({ apiKey, baseURL }: { apiKey: string; baseURL?: string }) {
    this.client = new Anthropic({ apiKey, ...(baseURL ? { baseURL } : {}) });
  }

  async *chat(params: ChatParams): AsyncGenerator<ChatChunk> {
    const systemMessage = params.messages.find((m) => m.role === 'system');
    const messages = params.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.toolResults
          ? [
              // Text part if present
              ...(m.content ? [{ type: 'text' as const, text: m.content }] : []),
              // Tool result blocks
              ...m.toolResults.map((tr) => ({
                type: 'tool_result' as const,
                tool_use_id: tr.toolCallId,
                content: tr.result,
                is_error: tr.isError ?? false,
              })),
            ]
          : m.content,
      }));

    // Build tools array for Anthropic format
    const tools = params.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
    }));

    const stream = await this.client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature,
      system: systemMessage?.content,
      messages: messages as Anthropic.MessageParam[],
      ...(tools?.length ? { tools } : {}),
      stream: true,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield { type: 'text', text: event.delta.text };
      }
      if (
        event.type === 'content_block_start' &&
        event.content_block.type === 'tool_use'
      ) {
        // Start of a tool call — collect the id and name
        yield {
          type: 'tool_call_start',
          toolCall: {
            id: event.content_block.id,
            name: event.content_block.name,
            arguments: '',
          },
        };
      }
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'input_json_delta'
      ) {
        yield {
          type: 'tool_call_delta',
          toolCall: {
            id: '',
            name: '',
            arguments: event.delta.partial_json,
          },
        };
      }
    }

    yield { type: 'done' };
  }
}
