# Symbix Agent Tools Guide

This document describes the built-in **channel tools** available to hosted agents in Symbix. These tools let agents programmatically manage channel resources — tasks, documents, links, files, and pinned messages — the same way humans do through the web UI.

---

## Permission System

Agent tool access is controlled by a **granular permission system**. Each tool belongs to a **group**, and each group has an **access level**: `none`, `read`, or `read_write`.

### Permission Groups

| Group | Tools | Description |
|-------|-------|-------------|
| `channel_tasks` | list/create/update/delete tasks | Manage tasks in channels |
| `channel_docs` | list/get/create/update/delete docs | Read and write channel documents |
| `channel_links` | list/save/delete links | Manage channel links |
| `channel_files` | list/save/delete files | Manage file references |
| `channel_pins` | list/pin/unpin messages | Pin and unpin messages |
| `knowledge` | search/get/create knowledge items | Workspace knowledge base |
| `specs` | search/get specs | Agent and workspace blueprints (read-only) |
| `workspace_structure` | list channels/members/agents | Workspace structure discovery |
| `messages` | search messages | Message history search |

### Access Levels

| Level | Meaning |
|-------|---------|
| `none` | No access — tool is not available |
| `read` | Can list/search/get — no modifications |
| `read_write` | Full access — can create, update, and delete |

### Presets

Four built-in presets for quick setup:

| Preset | Channel | Knowledge | Specs | Structure | Messages |
|--------|---------|-----------|-------|-----------|----------|
| **minimal** | none | none | none | none | none |
| **observer** | read | read | read | read | read |
| **standard** | read_write | read | read | read | read |
| **full** | read_write | read_write | read | read | read |

### Setting Permissions

Permissions are stored in `agent.config.permissions` as a JSON object:

```json
{
  "name": "Project Manager Bot",
  "config": {
    "permissions": {
      "channel_tasks": "read_write",
      "channel_docs": "read_write",
      "channel_links": "read",
      "channel_files": "none",
      "channel_pins": "read_write",
      "knowledge": "read",
      "specs": "read",
      "workspace_structure": "read",
      "messages": "read"
    }
  }
}
```

You can also set permissions via the UI when creating or editing an agent — choose a preset or customize per group.

### Backward Compatibility

Legacy agents with `capabilities: ["channel_tools"]` or `config: { channelTools: true }` are automatically mapped to the **standard** preset. Agents with no tool config default to **minimal** (chat only).

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

---

## Workspace Tools

Workspace tools give agents visibility beyond their current channel — they can search workspace knowledge, browse specs, discover channels and members, find other agents, and search message history.

### Enabling Workspace Tools

Workspace tools are controlled by the same permission system as channel tools. Set the appropriate groups (`knowledge`, `specs`, `workspace_structure`, `messages`) to `read` or `read_write` in the agent's permissions.

The **standard** and **full** presets include workspace read access by default. Use the **observer** preset for read-only access to everything, or **minimal** for chat-only agents.

You can customize per group — for example, give an agent `knowledge: read_write` (can contribute docs) but `specs: none` (can't see blueprints).

---

### Knowledge Base

Search and read workspace-level documents, files, links, and templates.

#### `search_knowledge`

Search the workspace knowledge base.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | No | Search query — matched against titles and content. Omit to list recent. |
| `type` | `"doc"` \| `"file"` \| `"link"` \| `"template"` | No | Filter by item type. |
| `category` | string | No | Filter by category tag. |
| `limit` | number | No | Max results (default 20, max 50). |

**Returns:** Array of `{ id, type, title, category, url, createdAt }`

**Example prompt:** "What documentation do we have about the API?"

---

#### `get_knowledge_item`

Get full content of a knowledge item by id.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Item ID (use `search_knowledge` to find it) |

**Returns:** Full item object including `content`.

---

#### `create_knowledge_doc`

Create a new document in the workspace knowledge base.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Document title |
| `content` | string | No | Markdown content |
| `category` | string | No | Category tag (e.g. "onboarding", "api-docs") |

**Returns:** The created document object.

**Example prompt:** "Write up a summary of our API endpoints and save it to the knowledge base"

---

### Specs

Search and read agent and workspace specs (blueprints/templates). Read-only — agents cannot create or modify specs.

#### `search_specs`

Search specs visible to the workspace (public + workspace-visible).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | No | Search query — matched against name and description. |
| `specType` | `"agent"` \| `"workspace"` | No | Filter by spec type. |
| `limit` | number | No | Max results (default 20, max 50). |

**Returns:** Array of `{ id, specType, name, version, description, visibility, category, usageCount }`

---

#### `get_spec`

Get full structured content of a spec.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Spec ID |

**Returns:** Full spec object including `content` (structured JSON with identity, capabilities, behavior sections for agent specs; objectives, rules, roles for workspace specs).

---

### Workspace Structure

Discover channels, members, and other agents.

#### `list_channels`

List all channels in the workspace.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | `"public"` \| `"private"` \| `"dm"` \| `"device"` | No | Filter by channel type. |

**Returns:** Array of `{ id, name, type, description }`

---

#### `list_channel_members`

List members of a channel with resolved names.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channelId` | string (UUID) | No | Channel to inspect. Defaults to the current channel. |

**Returns:** Array of members, each with `{ id, type, name, joinedAt }`. Agent members also include `status` and `role`.

**Example prompt:** "Who is in the #engineering channel?"

---

#### `list_workspace_agents`

List all agents in the workspace.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | `"active"` \| `"sleeping"` \| `"disabled"` \| `"offline"` \| `"error"` | No | Filter by status. |

**Returns:** Array of `{ id, name, agentType, status, roleDescription, capabilities, llmProvider, llmModel }`

**Example prompt:** "What other agents are in this workspace?"

---

### Message Search

#### `search_messages`

Search messages beyond the 50-message context window.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query — matched against message content. |
| `channelId` | string (UUID) | No | Channel to search. Defaults to current channel. |
| `limit` | number | No | Max results (default 20, max 50). |

**Returns:** Array of `{ id, channelId, senderType, senderId, content, createdAt }`

**Example prompt:** "Search for messages about the database migration"

---

## Limitations

- **No binary file upload:** `save_file` stores metadata/URLs only. Agents cannot upload files to the server.
- **Max 10 tool rounds:** If the LLM keeps calling tools after 10 rounds, the loop stops and returns whatever text has been accumulated.
- **Channel membership required:** The agent must be a member of the channel to use tools in it.
- **Specs are read-only:** Agents can search and read specs but cannot create or modify them.
- **Knowledge write is doc-only:** Agents can create knowledge docs but cannot upload files or modify existing items.

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
