# Symbix Agent Tools Guide

This document describes the built-in **channel tools** available to hosted agents in Symbix. These tools let agents programmatically manage channel resources — tasks, documents, links, files, and pinned messages — the same way humans do through the web UI.

---

## Enabling Channel Tools

Channel tools are opt-in per agent. Enable them in one of two ways:

### Option A: Capabilities array

When creating or updating an agent, include `"channel_tools"` in the capabilities array:

```json
{
  "name": "Project Manager Bot",
  "capabilities": ["channel_tools"],
  "systemPrompt": "You are a project management assistant..."
}
```

### Option B: Config flag

Set `channelTools: true` in the agent's config object:

```json
{
  "name": "Project Manager Bot",
  "config": { "channelTools": true },
  "systemPrompt": "You are a project management assistant..."
}
```

When enabled, the agent receives all channel tool definitions in every LLM call. The LLM decides when to use them based on the conversation context.

---

## How It Works

```
User sends message → agent triggered →
  → LLM receives message + tool definitions →
    → LLM may respond with text, or call one or more tools →
      → Symbix executes tools, returns results to LLM →
        → LLM sees results, may call more tools or respond with text →
          → final text response saved as message
```

- **Max 10 tool rounds** per response to prevent infinite loops.
- Tool execution is server-side — the agent never needs direct DB access.
- Tool results are passed back to the LLM as structured JSON.
- The agent's final text response (after all tool calls) is what appears in chat.

---

## Available Tools

### Tasks

Tasks have three statuses: `open`, `in_progress`, `done`.

#### `list_tasks`

List tasks in the current channel.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | `"open"` \| `"in_progress"` \| `"done"` | No | Filter by status. Omit to list all. |

**Returns:** Array of `{ id, title, status, createdAt }`

**Example prompt:** "What tasks are still open?"

---

#### `create_task`

Create a new task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Task title |
| `status` | `"open"` \| `"in_progress"` \| `"done"` | No | Defaults to `"open"` |

**Returns:** The created task object.

**Example prompt:** "Create a task to review the PR"

---

#### `update_task`

Update a task's title or status.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Task ID (use `list_tasks` to find it) |
| `title` | string | No | New title |
| `status` | `"open"` \| `"in_progress"` \| `"done"` | No | New status |

**Returns:** The updated task object.

**Example prompt:** "Mark the 'review PR' task as done"

---

#### `delete_task`

Delete a task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Task ID |

**Returns:** `{ success: true }`

---

### Documents

Documents support Markdown content and are rendered with full formatting in the UI.

#### `list_docs`

List documents in the current channel (titles only, not content).

**Parameters:** None

**Returns:** Array of `{ id, title, createdAt }`

---

#### `get_doc`

Get a document's full content.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Document ID |

**Returns:** Full document object including `content` (Markdown).

**Example prompt:** "Show me the onboarding doc"

---

#### `create_doc`

Create a new document.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Document title |
| `content` | string | No | Markdown content |

**Returns:** The created document object.

**Example prompt:** "Write a meeting notes doc for today's standup"

---

#### `update_doc`

Update a document's title or content.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Document ID |
| `title` | string | No | New title |
| `content` | string | No | New Markdown content |

**Returns:** The updated document object.

**Example prompt:** "Update the onboarding doc to include the new setup steps"

---

#### `delete_doc`

Delete a document.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Document ID |

**Returns:** `{ success: true }`

---

### Links

Saved bookmarks/references for the channel.

#### `list_links`

List saved links.

**Parameters:** None

**Returns:** Array of `{ id, title, url, createdAt }`

---

#### `save_link`

Save a link to the channel.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Link title/description |
| `url` | string | Yes | URL |

**Returns:** The created link object.

**Example prompt:** "Save this link: https://example.com/api-docs"

---

#### `delete_link`

Delete a saved link.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Link ID |

**Returns:** `{ success: true }`

---

### Files

File references (metadata only — agents cannot upload binary files).

#### `list_files`

List saved file references.

**Parameters:** None

**Returns:** Array of `{ id, title, url, createdAt }`

---

#### `save_file`

Save a file reference.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | File name |
| `url` | string | No | File URL |

**Returns:** The created file object.

---

#### `delete_file`

Delete a saved file reference.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | File ID |

**Returns:** `{ success: true }`

---

### Pinned Messages

Pin or unpin messages in the channel.

#### `list_pins`

List pinned messages.

**Parameters:** None

**Returns:** Array of `{ pinId, messageId, content, senderType, senderId, pinnedAt, createdAt }`

---

#### `pin_message`

Pin a message.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messageId` | string (UUID) | Yes | Message ID to pin |

**Returns:** The pin object (or `{ alreadyPinned: true }` if already pinned).

**Example prompt:** "Pin the last message"

> **Note:** The agent receives the last 50 messages as context. Each message has an `id` field. The agent can reference message IDs from its context window to pin specific messages.

---

#### `unpin_message`

Unpin a message.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pinId` | string (UUID) | Yes | Pin ID (not the message ID — use `list_pins` to find it) |

**Returns:** `{ success: true }`

---

## System Prompt Tips

To get the best results from channel tools, include guidance in your agent's system prompt:

### Project Manager Agent

```
You are a project management assistant. When users discuss tasks or action items,
proactively create tasks to track them. When a task is completed, mark it as done.
Keep the task board organized and up to date.

When someone shares an important document or link, save it to the channel's
docs or links section so the team can find it later.
```

### Documentation Agent

```
You are a documentation assistant. When users ask you to write or update docs,
use the create_doc and update_doc tools to save content as channel documents.
Write in clear Markdown with headings, lists, and code blocks as appropriate.

When users share important links or references, save them to the channel's
links section.
```

### Meeting Notes Agent

```
You are a meeting notes bot. When users say "start meeting" or discuss agenda items:
1. Create a doc titled "Meeting Notes - [date]"
2. As the conversation progresses, update the doc with key points
3. Create tasks for any action items discussed
4. Pin the final meeting notes message for easy reference
```

---

## Limitations

- **No binary file upload:** `save_file` stores metadata/URLs only. Agents cannot upload files to the server.
- **No message search:** Agents see the last 50 messages as context but cannot search older messages.
- **No cross-channel access:** Tools only operate on the channel where the conversation is happening.
- **Max 10 tool rounds:** If the LLM keeps calling tools after 10 rounds, the loop stops and returns whatever text has been accumulated.
- **Channel membership required:** The agent must be a member of the channel to use tools in it.

---

## For External Agents (Machine/CLI Agents)

External agents connected via the agent-bridge CLI receive messages over WebSocket and can call the Symbix HTTP API directly. The same channel operations are available via tRPC endpoints:

| Tool | tRPC Endpoint |
|------|---------------|
| `list_tasks` | `channelItems.list({ channelId, type: 'task' })` |
| `create_task` | `channelItems.create({ channelId, type: 'task', title, status })` |
| `update_task` | `channelItems.update({ id, title?, status? })` |
| `delete_task` | `channelItems.delete({ id })` |
| `list_docs` | `channelItems.list({ channelId, type: 'doc' })` |
| `create_doc` | `channelItems.create({ channelId, type: 'doc', title, content })` |
| `update_doc` | `channelItems.update({ id, title?, content? })` |
| `delete_doc` | `channelItems.delete({ id })` |
| `list_links` | `channelItems.list({ channelId, type: 'link' })` |
| `save_link` | `channelItems.create({ channelId, type: 'link', title, url })` |
| `delete_link` | `channelItems.delete({ id })` |
| `list_files` | `channelItems.list({ channelId, type: 'file' })` |
| `save_file` | `channelItems.create({ channelId, type: 'file', title, url? })` |
| `delete_file` | `channelItems.delete({ id })` |
| `list_pins` | `channelItems.listPins({ channelId })` |
| `pin_message` | `channelItems.pin({ channelId, messageId })` |
| `unpin_message` | `channelItems.unpin({ id })` |

> **Auth note:** External agents authenticate via the machine API key. The tRPC endpoints currently require Clerk user auth. A future update will add agent-level auth tokens for external agents to call these endpoints directly.
