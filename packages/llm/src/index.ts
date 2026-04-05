import type { LLMProvider, ChatParams, ChatChunk, ChatMessage, ToolDefinition } from './types.js';

export type { LLMProvider, ChatParams, ChatChunk, ChatMessage, ToolDefinition };
export { AnthropicProvider } from './providers/anthropic.js';
export { OpenAIProvider } from './providers/openai.js';

export class LLM {
  private providers = new Map<string, LLMProvider>();

  register(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): LLMProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`LLM provider "${name}" not registered. Available: ${[...this.providers.keys()].join(', ')}`);
    }
    return provider;
  }

  async *chat(params: ChatParams & { provider: string }): AsyncGenerator<ChatChunk> {
    const { provider: providerName, ...chatParams } = params;
    const provider = this.getProvider(providerName);
    yield* provider.chat(chatParams);
  }
}
