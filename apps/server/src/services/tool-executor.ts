/**
 * Executes built-in channel tools on behalf of an agent.
 * Called from the agent-response worker when the LLM returns tool_call chunks.
 */

import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { channelItems, pinnedMessages, messages } from '../db/schema/index.js';

interface ToolContext {
  channelId: string;
  agentId: string;
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

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
