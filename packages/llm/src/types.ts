export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
}

export interface ChatChunk {
  type: 'text' | 'tool_call' | 'done';
  text?: string;
  toolCall?: { id: string; name: string; arguments: string };
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LLMProvider {
  name: string;
  chat(params: ChatParams): AsyncGenerator<ChatChunk>;
}
