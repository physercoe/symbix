/**
 * Executes built-in tools on behalf of an agent.
 * Called from the agent-response worker when the LLM returns tool_call chunks.
 *
 * Two scopes:
 *  - Channel tools: operate on the current channel (tasks, docs, links, files, pins)
 *  - Workspace tools: read workspace-level resources (knowledge, specs, channels, members, messages)
 */

import { eq, and, desc, ilike, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  channelItems,
  pinnedMessages,
  messages,
  workspaceItems,
  specs,
  channels,
  channelMembers,
  agents,
  users,
} from '../db/schema/index.js';

export interface ToolContext {
  channelId: string;
  agentId: string;
  workspaceId: string;
}

/**
 * Execute a single tool call. Returns a JSON string result.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<{ result: string; isError: boolean }> {
  try {
    const result = await dispatch(name, args, ctx);
    return { result: JSON.stringify(result), isError: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { result: JSON.stringify({ error: message }), isError: true };
  }
}

async function dispatch(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  switch (name) {
    // ── Tasks ──────────────────────────────────────────────────
    case 'list_tasks': {
      const conditions = [
        eq(channelItems.channelId, ctx.channelId),
        eq(channelItems.type, 'task'),
      ];
      if (args.status && typeof args.status === 'string') {
        conditions.push(eq(channelItems.status, args.status));
      }
      const rows = await db
        .select({ id: channelItems.id, title: channelItems.title, status: channelItems.status, createdAt: channelItems.createdAt })
        .from(channelItems)
        .where(and(...conditions))
        .orderBy(desc(channelItems.createdAt));
      return rows;
    }

    case 'create_task': {
      const [item] = await db
        .insert(channelItems)
        .values({
          channelId: ctx.channelId,
          type: 'task',
          title: String(args.title),
          status: (args.status as string) ?? 'open',
          createdBy: ctx.agentId,
        })
        .returning();
      return item;
    }

    case 'update_task': {
      const updates: Record<string, unknown> = {};
      if (args.title) updates.title = String(args.title);
      if (args.status) updates.status = String(args.status);
      const [updated] = await db
        .update(channelItems)
        .set(updates)
        .where(eq(channelItems.id, String(args.id)))
        .returning();
      if (!updated) throw new Error(`Task ${args.id} not found`);
      return updated;
    }

    case 'delete_task': {
      await db.delete(channelItems).where(eq(channelItems.id, String(args.id)));
      return { success: true };
    }

    // ── Docs ───────────────────────────────────────────────────
    case 'list_docs': {
      const rows = await db
        .select({ id: channelItems.id, title: channelItems.title, createdAt: channelItems.createdAt })
        .from(channelItems)
        .where(and(eq(channelItems.channelId, ctx.channelId), eq(channelItems.type, 'doc')))
        .orderBy(desc(channelItems.createdAt));
      return rows;
    }

    case 'get_doc': {
      const [doc] = await db
        .select()
        .from(channelItems)
        .where(and(eq(channelItems.id, String(args.id)), eq(channelItems.type, 'doc')))
        .limit(1);
      if (!doc) throw new Error(`Document ${args.id} not found`);
      return doc;
    }

    case 'create_doc': {
      const [item] = await db
        .insert(channelItems)
        .values({
          channelId: ctx.channelId,
          type: 'doc',
          title: String(args.title),
          content: args.content ? String(args.content) : undefined,
          createdBy: ctx.agentId,
        })
        .returning();
      return item;
    }

    case 'update_doc': {
      const updates: Record<string, unknown> = {};
      if (args.title) updates.title = String(args.title);
      if (args.content !== undefined) updates.content = String(args.content);
      const [updated] = await db
        .update(channelItems)
        .set(updates)
        .where(eq(channelItems.id, String(args.id)))
        .returning();
      if (!updated) throw new Error(`Document ${args.id} not found`);
      return updated;
    }

    case 'delete_doc': {
      await db.delete(channelItems).where(eq(channelItems.id, String(args.id)));
      return { success: true };
    }

    // ── Links ──────────────────────────────────────────────────
    case 'list_links': {
      const rows = await db
        .select({ id: channelItems.id, title: channelItems.title, url: channelItems.url, createdAt: channelItems.createdAt })
        .from(channelItems)
        .where(and(eq(channelItems.channelId, ctx.channelId), eq(channelItems.type, 'link')))
        .orderBy(desc(channelItems.createdAt));
      return rows;
    }

    case 'save_link': {
      const [item] = await db
        .insert(channelItems)
        .values({
          channelId: ctx.channelId,
          type: 'link',
          title: String(args.title),
          url: String(args.url),
          createdBy: ctx.agentId,
        })
        .returning();
      return item;
    }

    case 'delete_link': {
      await db.delete(channelItems).where(eq(channelItems.id, String(args.id)));
      return { success: true };
    }

    // ── Files ──────────────────────────────────────────────────
    case 'list_files': {
      const rows = await db
        .select({ id: channelItems.id, title: channelItems.title, url: channelItems.url, createdAt: channelItems.createdAt })
        .from(channelItems)
        .where(and(eq(channelItems.channelId, ctx.channelId), eq(channelItems.type, 'file')))
        .orderBy(desc(channelItems.createdAt));
      return rows;
    }

    case 'save_file': {
      const [item] = await db
        .insert(channelItems)
        .values({
          channelId: ctx.channelId,
          type: 'file',
          title: String(args.title),
          url: args.url ? String(args.url) : undefined,
          createdBy: ctx.agentId,
        })
        .returning();
      return item;
    }

    case 'delete_file': {
      await db.delete(channelItems).where(eq(channelItems.id, String(args.id)));
      return { success: true };
    }

    // ── Pinned Messages ────────────────────────────────────────
    case 'list_pins': {
      const pins = await db
        .select({
          pinId: pinnedMessages.id,
          messageId: pinnedMessages.messageId,
          pinnedAt: pinnedMessages.pinnedAt,
          content: messages.content,
          senderType: messages.senderType,
          senderId: messages.senderId,
          createdAt: messages.createdAt,
        })
        .from(pinnedMessages)
        .innerJoin(messages, eq(pinnedMessages.messageId, messages.id))
        .where(eq(pinnedMessages.channelId, ctx.channelId))
        .orderBy(desc(pinnedMessages.pinnedAt));
      return pins;
    }

    case 'pin_message': {
      const [existing] = await db
        .select()
        .from(pinnedMessages)
        .where(
          and(
            eq(pinnedMessages.channelId, ctx.channelId),
            eq(pinnedMessages.messageId, String(args.messageId)),
          ),
        )
        .limit(1);
      if (existing) return { alreadyPinned: true, ...existing };

      const [pin] = await db
        .insert(pinnedMessages)
        .values({
          channelId: ctx.channelId,
          messageId: String(args.messageId),
          pinnedBy: ctx.agentId,
        })
        .returning();
      return pin;
    }

    case 'unpin_message': {
      await db.delete(pinnedMessages).where(eq(pinnedMessages.id, String(args.pinId)));
      return { success: true };
    }

    // ════════════════════════════════════════════════════════════
    // WORKSPACE TOOLS — read workspace-level resources
    // ════════════════════════════════════════════════════════════

    // ── Knowledge (Workspace Items) ────────────────────────────
    case 'search_knowledge': {
      const limit = Math.min(Number(args.limit) || 20, 50);
      const conditions = [eq(workspaceItems.workspaceId, ctx.workspaceId)];

      if (args.type && typeof args.type === 'string') {
        conditions.push(eq(workspaceItems.type, args.type));
      }
      if (args.category && typeof args.category === 'string') {
        conditions.push(eq(workspaceItems.category, args.category));
      }
      if (args.query && typeof args.query === 'string') {
        const q = `%${args.query}%`;
        conditions.push(
          or(ilike(workspaceItems.title, q), ilike(workspaceItems.content, q))!,
        );
      }

      const rows = await db
        .select({
          id: workspaceItems.id,
          type: workspaceItems.type,
          title: workspaceItems.title,
          category: workspaceItems.category,
          url: workspaceItems.url,
          createdAt: workspaceItems.createdAt,
        })
        .from(workspaceItems)
        .where(and(...conditions))
        .orderBy(desc(workspaceItems.updatedAt))
        .limit(limit);
      return rows;
    }

    case 'get_knowledge_item': {
      const [item] = await db
        .select()
        .from(workspaceItems)
        .where(
          and(
            eq(workspaceItems.id, String(args.id)),
            eq(workspaceItems.workspaceId, ctx.workspaceId),
          ),
        )
        .limit(1);
      if (!item) throw new Error(`Knowledge item ${args.id} not found`);
      return item;
    }

    case 'create_knowledge_doc': {
      const [item] = await db
        .insert(workspaceItems)
        .values({
          workspaceId: ctx.workspaceId,
          type: 'doc',
          title: String(args.title),
          content: args.content ? String(args.content) : undefined,
          category: args.category ? String(args.category) : undefined,
          createdBy: ctx.agentId,
        })
        .returning();
      return item;
    }

    // ── Specs ──────────────────────────────────────────────────
    case 'search_specs': {
      const limit = Math.min(Number(args.limit) || 20, 50);
      const conditions = [
        or(eq(specs.visibility, 'public'), eq(specs.visibility, 'workspace'))!,
      ];

      if (args.specType && typeof args.specType === 'string') {
        conditions.push(eq(specs.specType, args.specType));
      }
      if (args.query && typeof args.query === 'string') {
        const q = `%${args.query}%`;
        conditions.push(
          or(ilike(specs.name, q), ilike(specs.description, q))!,
        );
      }

      const rows = await db
        .select({
          id: specs.id,
          specType: specs.specType,
          name: specs.name,
          version: specs.version,
          description: specs.description,
          visibility: specs.visibility,
          category: specs.category,
          usageCount: specs.usageCount,
        })
        .from(specs)
        .where(and(...conditions))
        .orderBy(desc(specs.updatedAt))
        .limit(limit);
      return rows;
    }

    case 'get_spec': {
      const [spec] = await db
        .select()
        .from(specs)
        .where(
          and(
            eq(specs.id, String(args.id)),
            or(eq(specs.visibility, 'public'), eq(specs.visibility, 'workspace'))!,
          ),
        )
        .limit(1);
      if (!spec) throw new Error(`Spec ${args.id} not found or is private`);
      return spec;
    }

    // ── Workspace Structure ────────────────────────────────────
    case 'list_channels': {
      const conditions = [eq(channels.workspaceId, ctx.workspaceId)];
      if (args.type && typeof args.type === 'string') {
        conditions.push(eq(channels.type, args.type));
      }
      const rows = await db
        .select({
          id: channels.id,
          name: channels.name,
          type: channels.type,
          description: channels.description,
        })
        .from(channels)
        .where(and(...conditions))
        .orderBy(channels.name);
      return rows;
    }

    case 'list_channel_members': {
      const targetChannelId = (args.channelId as string) || ctx.channelId;
      const rows = await db
        .select({
          id: channelMembers.id,
          memberType: channelMembers.memberType,
          userId: channelMembers.userId,
          agentId: channelMembers.agentId,
          joinedAt: channelMembers.joinedAt,
        })
        .from(channelMembers)
        .where(eq(channelMembers.channelId, targetChannelId));

      // Resolve names for a friendlier result
      const resolved = await Promise.all(
        rows.map(async (m) => {
          if (m.memberType === 'user' && m.userId) {
            const [user] = await db
              .select({ name: users.name })
              .from(users)
              .where(eq(users.id, m.userId))
              .limit(1);
            return { id: m.id, type: 'user', name: user?.name ?? 'Unknown', userId: m.userId, joinedAt: m.joinedAt };
          }
          if (m.memberType === 'agent' && m.agentId) {
            const [agent] = await db
              .select({ name: agents.name, status: agents.status, roleDescription: agents.roleDescription })
              .from(agents)
              .where(eq(agents.id, m.agentId))
              .limit(1);
            return {
              id: m.id,
              type: 'agent',
              name: agent?.name ?? 'Unknown',
              agentId: m.agentId,
              status: agent?.status,
              role: agent?.roleDescription,
              joinedAt: m.joinedAt,
            };
          }
          return m;
        }),
      );
      return resolved;
    }

    case 'list_workspace_agents': {
      const conditions = [eq(agents.workspaceId, ctx.workspaceId)];
      if (args.status && typeof args.status === 'string') {
        conditions.push(eq(agents.status, args.status));
      }
      const rows = await db
        .select({
          id: agents.id,
          name: agents.name,
          agentType: agents.agentType,
          status: agents.status,
          roleDescription: agents.roleDescription,
          capabilities: agents.capabilities,
          llmProvider: agents.llmProvider,
          llmModel: agents.llmModel,
        })
        .from(agents)
        .where(and(...conditions))
        .orderBy(agents.name);
      return rows;
    }

    // ── Message Search ─────────────────────────────────────────
    case 'search_messages': {
      const limit = Math.min(Number(args.limit) || 20, 50);
      const targetChannelId = (args.channelId as string) || ctx.channelId;
      const q = `%${String(args.query)}%`;

      const rows = await db
        .select({
          id: messages.id,
          channelId: messages.channelId,
          senderType: messages.senderType,
          senderId: messages.senderId,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(
          and(
            eq(messages.channelId, targetChannelId),
            ilike(messages.content, q),
          ),
        )
        .orderBy(desc(messages.createdAt))
        .limit(limit);
      return rows;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
