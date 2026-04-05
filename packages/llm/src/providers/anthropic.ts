import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, ChatParams, ChatChunk } from '../types.js';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private client: Anthropic;

  constructor({ apiKey }: { apiKey: string }) {
    this.client = new Anthropic({ apiKey });
  }

  async *chat(params: ChatParams): AsyncGenerator<ChatChunk> {
    const systemMessage = params.messages.find((m) => m.role === 'system');
    const messages = params.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const stream = await this.client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature,
      system: systemMessage?.content,
      messages,
      stream: true,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield { type: 'text', text: event.delta.text };
      }
    }

    yield { type: 'done' };
  }
}
