import { eq, and, gte, sql, count, desc } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import {
  teams,
  teamMembers,
  workspaces,
  workspaceMembers,
  channels,
  agents,
  machines,
  messages,
  activityEvents,
} from '../db/schema/index.js';

export const metricsRouter = router({
  // Team-level overview: counts + summary
  teamOverview: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [memberCount] = await ctx.db
        .select({ count: count() })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, input.teamId));

      const [workspaceCount] = await ctx.db
        .select({ count: count() })
        .from(workspaces)
        .where(eq(workspaces.teamId, input.teamId));

      const teamAgents = await ctx.db
        .select({ id: agents.id, status: agents.status })
        .from(agents)
        .where(eq(agents.teamId, input.teamId));

      const activeAgents = teamAgents.filter((a) => a.status === 'active').length;

      const teamMachines = await ctx.db
        .select({ id: machines.id, status: machines.status })
        .from(machines)
        .where(eq(machines.teamId, input.teamId));

      const onlineMachines = teamMachines.filter((m) => m.status === 'online').length;

      // Message count (7d) — join through workspaces → channels → messages
      const teamWorkspaces = await ctx.db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.teamId, input.teamId));

      let messageCount7d = 0;
      if (teamWorkspaces.length > 0) {
        for (const ws of teamWorkspaces) {
          const wsChannels = await ctx.db
            .select({ id: channels.id })
            .from(channels)
            .where(eq(channels.workspaceId, ws.id));

          for (const ch of wsChannels) {
            const [result] = await ctx.db
              .select({ count: count() })
              .from(messages)
              .where(and(eq(messages.channelId, ch.id), gte(messages.createdAt, sevenDaysAgo)));
            messageCount7d += result.count;
          }
        }
      }

      return {
        members: memberCount.count,
        workspaces: workspaceCount.count,
        agents: { total: teamAgents.length, active: activeAgents },
        machines: { total: teamMachines.length, online: onlineMachines },
        messages7d: messageCount7d,
      };
    }),

  // Team activity timeline (messages per day, last 30 days)
  teamActivity: protectedProcedure
    .input(z.object({ teamId: z.string().uuid(), days: z.number().int().min(1).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

      const events = await ctx.db
        .select({
          date: sql<string>`date_trunc('day', ${activityEvents.createdAt})::date::text`,
          eventType: activityEvents.eventType,
          count: count(),
        })
        .from(activityEvents)
        .where(and(eq(activityEvents.teamId, input.teamId), gte(activityEvents.createdAt, since)))
        .groupBy(sql`date_trunc('day', ${activityEvents.createdAt})::date`, activityEvents.eventType)
        .orderBy(sql`date_trunc('day', ${activityEvents.createdAt})::date`);

      return events;
    }),

  // Workspace-level overview
  workspaceOverview: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [channelCount] = await ctx.db
        .select({ count: count() })
        .from(channels)
        .where(eq(channels.workspaceId, input.workspaceId));

      const [memberCount] = await ctx.db
        .select({ count: count() })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, input.workspaceId));

      const deployedAgents = await ctx.db
        .select({ count: count() })
        .from(workspaceMembers)
        .where(and(
          eq(workspaceMembers.workspaceId, input.workspaceId),
          eq(workspaceMembers.memberType, 'agent'),
        ));

      // Messages in last 7 days
      const wsChannels = await ctx.db
        .select({ id: channels.id })
        .from(channels)
        .where(eq(channels.workspaceId, input.workspaceId));

      let messageCount7d = 0;
      for (const ch of wsChannels) {
        const [result] = await ctx.db
          .select({ count: count() })
          .from(messages)
          .where(and(eq(messages.channelId, ch.id), gte(messages.createdAt, sevenDaysAgo)));
        messageCount7d += result.count;
      }

      return {
        channels: channelCount.count,
        members: memberCount.count,
        deployedAgents: deployedAgents[0].count,
        messages7d: messageCount7d,
      };
    }),

  // Agent-level overview
  agentOverview: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Messages sent by this agent
      const [msgCount] = await ctx.db
        .select({ count: count() })
        .from(messages)
        .where(and(
          eq(messages.senderId, input.agentId),
          eq(messages.senderType, 'agent'),
          gte(messages.createdAt, thirtyDaysAgo),
        ));

      // Activity events (tool calls, responses, etc.)
      const toolCalls = await ctx.db
        .select({ count: count() })
        .from(activityEvents)
        .where(and(
          eq(activityEvents.actorId, input.agentId),
          eq(activityEvents.eventType, 'tool_call'),
          gte(activityEvents.createdAt, thirtyDaysAgo),
        ));

      const responses = await ctx.db
        .select({ count: count() })
        .from(activityEvents)
        .where(and(
          eq(activityEvents.actorId, input.agentId),
          eq(activityEvents.eventType, 'agent_response'),
          gte(activityEvents.createdAt, thirtyDaysAgo),
        ));

      // Average response latency from activity_events metadata
      const latencyResult = await ctx.db
        .select({
          avgLatency: sql<number>`avg((${activityEvents.metadata}->>'latency_ms')::numeric)`,
        })
        .from(activityEvents)
        .where(and(
          eq(activityEvents.actorId, input.agentId),
          eq(activityEvents.eventType, 'agent_response'),
          gte(activityEvents.createdAt, thirtyDaysAgo),
        ));

      return {
        messages30d: msgCount.count,
        toolCalls30d: toolCalls[0].count,
        responses30d: responses[0].count,
        avgLatencyMs: latencyResult[0]?.avgLatency ? Math.round(latencyResult[0].avgLatency) : null,
      };
    }),

  // Agent tool usage breakdown
  agentToolUsage: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const usage = await ctx.db
        .select({
          toolName: sql<string>`${activityEvents.metadata}->>'tool_name'`,
          count: count(),
        })
        .from(activityEvents)
        .where(and(
          eq(activityEvents.actorId, input.agentId),
          eq(activityEvents.eventType, 'tool_call'),
          gte(activityEvents.createdAt, thirtyDaysAgo),
        ))
        .groupBy(sql`${activityEvents.metadata}->>'tool_name'`)
        .orderBy(desc(count()));

      return usage;
    }),

  // Recent activity feed
  recentActivity: protectedProcedure
    .input(z.object({
      teamId: z.string().uuid(),
      workspaceId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(activityEvents.teamId, input.teamId)];
      if (input.workspaceId) {
        conditions.push(eq(activityEvents.workspaceId, input.workspaceId));
      }

      return ctx.db
        .select()
        .from(activityEvents)
        .where(and(...conditions))
        .orderBy(desc(activityEvents.createdAt))
        .limit(input.limit);
    }),
});
