import type { ToolDefinition } from './tool-types';

/**
 * Built-in tools that hosted agents can use to interact with channel resources.
 * Each tool is tagged with its permission group and required access level.
 * The agent-response worker filters tools based on the agent's permissions.
 */

export const CHANNEL_TOOLS: ToolDefinition[] = [
  // ── Tasks ──────────────────────────────────────────────────────
  {
    name: 'list_tasks',
    group: 'channel_tasks',
    requiredAccess: 'read',
    description:
      'List tasks in the current channel. Returns an array of task objects with id, title, status, and createdAt.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['open', 'in_progress', 'done'],
          description: 'Filter by status. Omit to list all tasks.',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_task',
    group: 'channel_tasks',
    requiredAccess: 'read_write',
    description:
      'Create a new task in the current channel. Returns the created task object.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title (required).' },
        status: {
          type: 'string',
          enum: ['open', 'in_progress', 'done'],
          description: 'Initial status. Defaults to "open".',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    group: 'channel_tasks',
    requiredAccess: 'read_write',
    description:
      'Update a task\'s title or status. Use list_tasks first to find the task id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task UUID (required).' },
        title: { type: 'string', description: 'New title.' },
        status: {
          type: 'string',
          enum: ['open', 'in_progress', 'done'],
          description: 'New status.',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_task',
    group: 'channel_tasks',
    requiredAccess: 'read_write',
    description: 'Delete a task by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task UUID (required).' },
      },
      required: ['id'],
    },
  },

  // ── Docs ───────────────────────────────────────────────────────
  {
    name: 'list_docs',
    group: 'channel_docs',
    requiredAccess: 'read',
    description:
      'List documents in the current channel. Returns id, title, and createdAt (not full content).',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_doc',
    group: 'channel_docs',
    requiredAccess: 'read',
    description:
      'Get a document\'s full content by id. Use list_docs first to find the id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Document UUID (required).' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_doc',
    group: 'channel_docs',
    requiredAccess: 'read_write',
    description:
      'Create a new document in the current channel. Content supports Markdown.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Document title (required).' },
        content: { type: 'string', description: 'Markdown content.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_doc',
    group: 'channel_docs',
    requiredAccess: 'read_write',
    description:
      'Update a document\'s title or content.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Document UUID (required).' },
        title: { type: 'string', description: 'New title.' },
        content: { type: 'string', description: 'New Markdown content.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_doc',
    group: 'channel_docs',
    requiredAccess: 'read_write',
    description: 'Delete a document by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Document UUID (required).' },
      },
      required: ['id'],
    },
  },

  // ── Links ──────────────────────────────────────────────────────
  {
    name: 'list_links',
    group: 'channel_links',
    requiredAccess: 'read',
    description:
      'List saved links in the current channel. Returns id, title, url, and createdAt.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'save_link',
    group: 'channel_links',
    requiredAccess: 'read_write',
    description:
      'Save a link to the current channel.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Link title (required).' },
        url: { type: 'string', description: 'URL (required).' },
      },
      required: ['title', 'url'],
    },
  },
  {
    name: 'delete_link',
    group: 'channel_links',
    requiredAccess: 'read_write',
    description: 'Delete a saved link by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Link UUID (required).' },
      },
      required: ['id'],
    },
  },

  // ── Files ──────────────────────────────────────────────────────
  {
    name: 'list_files',
    group: 'channel_files',
    requiredAccess: 'read',
    description:
      'List saved file references in the current channel. Returns id, title, url, and createdAt.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'save_file',
    group: 'channel_files',
    requiredAccess: 'read_write',
    description:
      'Save a file reference to the current channel (metadata only — does not upload binary data).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'File name (required).' },
        url: { type: 'string', description: 'File URL (optional).' },
      },
      required: ['title'],
    },
  },
  {
    name: 'delete_file',
    group: 'channel_files',
    requiredAccess: 'read_write',
    description: 'Delete a saved file reference by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'File UUID (required).' },
      },
      required: ['id'],
    },
  },

  // ── Pinned Messages ────────────────────────────────────────────
  {
    name: 'list_pins',
    group: 'channel_pins',
    requiredAccess: 'read',
    description:
      'List pinned messages in the current channel. Returns pin id, message content, sender info, and pinnedAt.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'pin_message',
    group: 'channel_pins',
    requiredAccess: 'read_write',
    description:
      'Pin a message in the current channel by message id.',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'Message UUID to pin (required).' },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'unpin_message',
    group: 'channel_pins',
    requiredAccess: 'read_write',
    description:
      'Unpin a message. Requires the pin id (not the message id). Use list_pins to find pin ids.',
    inputSchema: {
      type: 'object',
      properties: {
        pinId: { type: 'string', description: 'Pin UUID (required).' },
      },
      required: ['pinId'],
    },
  },
];

/** Lookup map for quick access by tool name */
export const CHANNEL_TOOLS_MAP = new Map(CHANNEL_TOOLS.map((t) => [t.name, t]));

/**
 * Workspace-level tools that give agents visibility beyond their current channel.
 */
export const WORKSPACE_TOOLS: ToolDefinition[] = [
  // ── Knowledge (Workspace Items) ─────────────────────────────
  {
    name: 'search_knowledge',
    group: 'knowledge',
    requiredAccess: 'read',
    description:
      'Search the workspace knowledge base (docs, files, links, templates). Returns matching items with title, type, content preview, and url. Use this to find project documentation, reference materials, and shared resources.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query — matched against titles and content. Omit to list recent items.',
        },
        type: {
          type: 'string',
          enum: ['doc', 'file', 'link', 'template'],
          description: 'Filter by item type. Omit to search all types.',
        },
        category: {
          type: 'string',
          description: 'Filter by category tag.',
        },
        limit: {
          type: 'number',
          description: 'Max results to return. Defaults to 20.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_knowledge_item',
    group: 'knowledge',
    requiredAccess: 'read',
    description:
      'Get the full content of a workspace knowledge item by id. Use search_knowledge first to find the id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Item UUID (required).' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_knowledge_doc',
    group: 'knowledge',
    requiredAccess: 'read_write',
    description:
      'Create a new document in the workspace knowledge base. Use this to contribute documentation, meeting notes, or research findings that should be shared across channels.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Document title (required).' },
        content: { type: 'string', description: 'Markdown content.' },
        category: { type: 'string', description: 'Category tag (e.g. "onboarding", "api-docs").' },
      },
      required: ['title'],
    },
  },

  // ── Specs ───────────────────────────────────────────────────
  {
    name: 'search_specs',
    group: 'specs',
    requiredAccess: 'read',
    description:
      'Search agent and workspace specs (blueprints/templates). Returns matching specs with name, type, description, and version. Specs define reusable agent configurations and workspace setups.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query — matched against name and description. Omit to list all.',
        },
        specType: {
          type: 'string',
          enum: ['agent', 'workspace'],
          description: 'Filter by spec type.',
        },
        limit: {
          type: 'number',
          description: 'Max results. Defaults to 20.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_spec',
    group: 'specs',
    requiredAccess: 'read',
    description:
      'Get the full structured content of a spec by id. Returns the complete JSON spec with all sections (identity, capabilities, behavior, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Spec UUID (required).' },
      },
      required: ['id'],
    },
  },

  // ── Workspace Structure ─────────────────────────────────────
  {
    name: 'list_channels',
    group: 'workspace_structure',
    requiredAccess: 'read',
    description:
      'List all channels in the workspace. Returns channel name, type (public/private/dm/device), and description. Useful for understanding workspace structure.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['public', 'private', 'dm', 'device'],
          description: 'Filter by channel type. Omit to list all.',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_channel_members',
    group: 'workspace_structure',
    requiredAccess: 'read',
    description:
      'List members (humans and agents) in a specific channel. Returns member name, type (user/agent), and join date.',
    inputSchema: {
      type: 'object',
      properties: {
        channelId: {
          type: 'string',
          description: 'Channel UUID. Omit to list members of the current channel.',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_workspace_agents',
    group: 'workspace_structure',
    requiredAccess: 'read',
    description:
      'List all agents in the workspace with their status, role, and capabilities. Useful for knowing what other agents exist and what they do.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'sleeping', 'disabled', 'offline', 'error'],
          description: 'Filter by agent status. Omit to list all.',
        },
      },
      required: [],
    },
  },

  // ── Message Search ──────────────────────────────────────────
  {
    name: 'search_messages',
    group: 'messages',
    requiredAccess: 'read',
    description:
      'Search messages across the current channel (beyond the 50-message context window). Returns matching messages with sender info and timestamps. Use this to find older conversations, decisions, or information.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query — matched against message content (required).',
        },
        channelId: {
          type: 'string',
          description: 'Channel to search. Defaults to the current channel.',
        },
        limit: {
          type: 'number',
          description: 'Max results. Defaults to 20.',
        },
      },
      required: ['query'],
    },
  },
];

/** Lookup map for workspace tools */
export const WORKSPACE_TOOLS_MAP = new Map(WORKSPACE_TOOLS.map((t) => [t.name, t]));

/** All agent tools combined */
export const ALL_AGENT_TOOLS = [...CHANNEL_TOOLS, ...WORKSPACE_TOOLS];
