import OpenAI from 'openai';
import type { LLMProvider, ChatParams, ChatChunk } from '../types.js';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;

  constructor({ apiKey, baseURL }: { apiKey: string; baseURL?: string }) {
    this.client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  }

  async *chat(params: ChatParams): AsyncGenerator<ChatChunk> {
    const stream = await this.client.chat.completions.create({
      model: params.model,
      messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield { type: 'text', text: content };
      }
    }

    yield { type: 'done' };
  }
}
