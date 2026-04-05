import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { agents, channelMembers } from '../db/schema/index.js';
import { agentResponseQueue } from './bull.js';

export async function routeMessageToAgents(message: {
  id: string;
  channelId: string;
  content: string | null;
  senderType: string;
  senderId: string;
}) {
  // Don't route agent messages (avoid loops)
  if (message.senderType === 'agent') return;
  if (!message.content) return;

  // Find all agent members of this channel
  const agentMembers = await db
    .select({ agentId: channelMembers.agentId })
    .from(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, message.channelId),
        eq(channelMembers.memberType, 'agent'),
      ),
    );

  for (const member of agentMembers) {
    if (!member.agentId) continue;

    // Load agent to check if it should respond
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, member.agentId))
      .limit(1);

    if (!agent) continue;
    if (agent.status === 'disabled' || agent.status === 'error') continue;

    // Only auto-route for hosted bots — external agents receive messages via WS and decide themselves
    if (agent.agentType !== 'hosted_bot') continue;

    // Check if agent is @mentioned or has autoRespond enabled
    const isMentioned = message.content.includes(`@${agent.name}`);
    const autoRespond = (agent.config as Record<string, unknown>)?.autoRespond === true;

    if (isMentioned || autoRespond) {
      await agentResponseQueue.add('respond', {
        agentId: agent.id,
        channelId: message.channelId,
        triggerMessageId: message.id,
      });
    }
  }
}
