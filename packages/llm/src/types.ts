export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** Tool call results attached to a user/tool message (for multi-turn tool use) */
  toolResults?: { toolCallId: string; result: string; isError?: boolean }[];
  /** Tool calls made by the assistant (for reconstructing conversation history) */
  toolCalls?: { id: string; name: string; arguments: string }[];
}

export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
}

export interface ChatChunk {
  type: 'text' | 'tool_call' | 'tool_call_start' | 'tool_call_delta' | 'done';
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
