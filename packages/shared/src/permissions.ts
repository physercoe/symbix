/**
 * Agent permission system.
 *
 * Permissions are stored in agent.config.permissions as a JSON object.
 * Each tool belongs to a "group" and requires an "access level" to execute.
 * Humans can edit permissions per-agent through the UI.
 */

// ── Types ──────────────────────────────────────────────────────

export const TOOL_GROUPS = [
  'channel_tasks',
  'channel_docs',
  'channel_links',
  'channel_files',
  'channel_pins',
  'knowledge',
  'specs',
  'workspace_structure',
  'messages',
] as const;

export type ToolGroup = (typeof TOOL_GROUPS)[number];

export const ACCESS_LEVELS = ['none', 'read', 'read_write'] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

/** The permissions map stored in agent.config.permissions */
export type AgentPermissions = Record<ToolGroup, AccessLevel>;

// ── Tool → Group mapping ───────────────────────────────────────

/** Maps each tool name to its group and the minimum access level required */
export const TOOL_PERMISSION_MAP: Record<string, { group: ToolGroup; requires: AccessLevel }> = {
  // Channel tasks
  list_tasks:       { group: 'channel_tasks', requires: 'read' },
  create_task:      { group: 'channel_tasks', requires: 'read_write' },
  update_task:      { group: 'channel_tasks', requires: 'read_write' },
  delete_task:      { group: 'channel_tasks', requires: 'read_write' },

  // Channel docs
  list_docs:        { group: 'channel_docs', requires: 'read' },
  get_doc:          { group: 'channel_docs', requires: 'read' },
  create_doc:       { group: 'channel_docs', requires: 'read_write' },
  update_doc:       { group: 'channel_docs', requires: 'read_write' },
  delete_doc:       { group: 'channel_docs', requires: 'read_write' },

  // Channel links
  list_links:       { group: 'channel_links', requires: 'read' },
  save_link:        { group: 'channel_links', requires: 'read_write' },
  delete_link:      { group: 'channel_links', requires: 'read_write' },

  // Channel files
  list_files:       { group: 'channel_files', requires: 'read' },
  save_file:        { group: 'channel_files', requires: 'read_write' },
  delete_file:      { group: 'channel_files', requires: 'read_write' },

  // Channel pins
  list_pins:        { group: 'channel_pins', requires: 'read' },
  pin_message:      { group: 'channel_pins', requires: 'read_write' },
  unpin_message:    { group: 'channel_pins', requires: 'read_write' },

  // Workspace knowledge
  search_knowledge:     { group: 'knowledge', requires: 'read' },
  get_knowledge_item:   { group: 'knowledge', requires: 'read' },
  create_knowledge_doc: { group: 'knowledge', requires: 'read_write' },

  // Specs (no write tools exist)
  search_specs:     { group: 'specs', requires: 'read' },
  get_spec:         { group: 'specs', requires: 'read' },

  // Workspace structure (no write tools exist)
  list_channels:         { group: 'workspace_structure', requires: 'read' },
  list_channel_members:  { group: 'workspace_structure', requires: 'read' },
  list_workspace_agents: { group: 'workspace_structure', requires: 'read' },

  // Message search (no write tools exist)
  search_messages:  { group: 'messages', requires: 'read' },
};

// ── Presets ─────────────────────────────────────────────────────

export const PERMISSION_PRESETS = {
  /** Chat only — no tool access */
  minimal: {
    channel_tasks:       'none',
    channel_docs:        'none',
    channel_links:       'none',
    channel_files:       'none',
    channel_pins:        'none',
    knowledge:           'none',
    specs:               'none',
    workspace_structure: 'none',
    messages:            'none',
  },

  /** Read everything, write to channel resources */
  standard: {
    channel_tasks:       'read_write',
    channel_docs:        'read_write',
    channel_links:       'read_write',
    channel_files:       'read_write',
    channel_pins:        'read_write',
    knowledge:           'read',
    specs:               'read',
    workspace_structure: 'read',
    messages:            'read',
  },

  /** Full access — read and write everywhere */
  full: {
    channel_tasks:       'read_write',
    channel_docs:        'read_write',
    channel_links:       'read_write',
    channel_files:       'read_write',
    channel_pins:        'read_write',
    knowledge:           'read_write',
    specs:               'read',
    workspace_structure: 'read',
    messages:            'read',
  },

  /** Read-only observer — can see everything but change nothing */
  observer: {
    channel_tasks:       'read',
    channel_docs:        'read',
    channel_links:       'read',
    channel_files:       'read',
    channel_pins:        'read',
    knowledge:           'read',
    specs:               'read',
    workspace_structure: 'read',
    messages:            'read',
  },
} as const satisfies Record<string, AgentPermissions>;

export type PermissionPreset = keyof typeof PERMISSION_PRESETS;

export const PERMISSION_PRESET_NAMES = Object.keys(PERMISSION_PRESETS) as PermissionPreset[];

// ── Helpers ─────────────────────────────────────────────────────

/** Human-readable labels for UI */
export const TOOL_GROUP_LABELS: Record<ToolGroup, string> = {
  channel_tasks:       'Channel Tasks',
  channel_docs:        'Channel Docs',
  channel_links:       'Channel Links',
  channel_files:       'Channel Files',
  channel_pins:        'Channel Pins',
  knowledge:           'Workspace Knowledge',
  specs:               'Specs (Blueprints)',
  workspace_structure: 'Workspace Structure',
  messages:            'Message Search',
};

export const TOOL_GROUP_DESCRIPTIONS: Record<ToolGroup, string> = {
  channel_tasks:       'Create, update, and manage tasks in channels',
  channel_docs:        'Read and write channel documents',
  channel_links:       'Save and manage channel links',
  channel_files:       'Save and manage file references in channels',
  channel_pins:        'Pin and unpin messages in channels',
  knowledge:           'Search and contribute to workspace knowledge base',
  specs:               'Browse agent and workspace specs',
  workspace_structure: 'List channels, members, and other agents',
  messages:            'Search message history beyond context window',
};

/**
 * Resolve permissions for an agent. Reads from config.permissions,
 * falls back to 'standard' preset for missing keys, handles legacy
 * boolean flags (channelTools / workspaceTools) for backward compat.
 */
export function resolvePermissions(config: Record<string, unknown>): AgentPermissions {
  const stored = config.permissions as Partial<AgentPermissions> | undefined;

  if (stored && typeof stored === 'object') {
    // Fill any missing groups from the standard preset
    const result = { ...PERMISSION_PRESETS.standard };
    for (const group of TOOL_GROUPS) {
      if (stored[group] && ACCESS_LEVELS.includes(stored[group] as AccessLevel)) {
        result[group] = stored[group] as AccessLevel;
      }
    }
    return result;
  }

  // Legacy: check old boolean flags
  const hasChannelTools = config.channelTools === true;
  const hasWorkspaceTools = config.workspaceTools === true;

  if (hasChannelTools && hasWorkspaceTools) return { ...PERMISSION_PRESETS.full };
  if (hasChannelTools) return { ...PERMISSION_PRESETS.standard };
  if (hasWorkspaceTools) return { ...PERMISSION_PRESETS.observer };

  // No config at all → minimal (chat only)
  return { ...PERMISSION_PRESETS.minimal };
}

/**
 * Check if an agent has permission to execute a specific tool.
 * Returns true if allowed, false if denied.
 */
export function hasToolPermission(
  permissions: AgentPermissions,
  toolName: string,
): boolean {
  const mapping = TOOL_PERMISSION_MAP[toolName];
  if (!mapping) return false; // unknown tool → deny

  const agentLevel = permissions[mapping.group];
  if (agentLevel === 'none') return false;
  if (mapping.requires === 'read') return agentLevel === 'read' || agentLevel === 'read_write';
  if (mapping.requires === 'read_write') return agentLevel === 'read_write';
  return false;
}

/**
 * Filter a list of tool definitions to only those the agent has permission for.
 */
export function filterToolsByPermissions<T extends { name: string }>(
  tools: T[],
  permissions: AgentPermissions,
): T[] {
  return tools.filter((t) => hasToolPermission(permissions, t.name));
}

/**
 * Detect which preset matches the given permissions, or 'custom' if none match.
 */
export function detectPreset(permissions: AgentPermissions): PermissionPreset | 'custom' {
  for (const [name, preset] of Object.entries(PERMISSION_PRESETS)) {
    const match = TOOL_GROUPS.every((g) => permissions[g] === preset[g]);
    if (match) return name as PermissionPreset;
  }
  return 'custom';
}
