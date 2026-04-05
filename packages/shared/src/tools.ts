import type { ToolDefinition } from './tool-types.js';

/**
 * Built-in tools that hosted agents can use to interact with channel resources.
 * These are injected into the LLM tool-calling API when the agent has the
 * corresponding capability enabled.
 */

export const CHANNEL_TOOLS: ToolDefinition[] = [
  // ── Tasks ──────────────────────────────────────────────────────
  {
    name: 'list_tasks',
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
