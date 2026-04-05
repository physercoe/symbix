/** Tool definition — matches the LLM package's ToolDefinition interface */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/** Result of executing a tool */
export interface ToolResult {
  toolCallId: string;
  name: string;
  result: string;
  isError?: boolean;
}
