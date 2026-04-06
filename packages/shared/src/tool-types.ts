import type { ToolGroup, AccessLevel } from './permissions';

/** Tool definition — matches the LLM package's ToolDefinition interface */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Which permission group this tool belongs to */
  group?: ToolGroup;
  /** Minimum access level required to use this tool */
  requiredAccess?: AccessLevel;
}

/** Result of executing a tool */
export interface ToolResult {
  toolCallId: string;
  name: string;
  result: string;
  isError?: boolean;
}
