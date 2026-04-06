/**
 * Records activity events for metrics/monitoring.
 * Fire-and-forget — errors are logged but never thrown.
 */

import { db } from '../db/index.js';
import { activityEvents } from '../db/schema/index.js';

interface RecordEventParams {
  teamId: string;
  workspaceId?: string | null;
  actorType: 'user' | 'agent' | 'system';
  actorId: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}

export async function recordActivity(params: RecordEventParams): Promise<void> {
  try {
    await db.insert(activityEvents).values({
      teamId: params.teamId,
      workspaceId: params.workspaceId ?? undefined,
      actorType: params.actorType,
      actorId: params.actorId,
      eventType: params.eventType,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    console.error('[activity] Failed to record event:', params.eventType, err);
  }
}
