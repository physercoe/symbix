'use client';

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useAgentStore } from '@/stores/agent-store';

interface Props {
  channelId: string;
  workspaceId: string;
}

export function TypingIndicator({ channelId, workspaceId }: Props) {
  const typingMap = useAgentStore((s) => s.typing);
  const { data: allAgents } = trpc.agents.list.useQuery({ workspaceId });

  const typing = useMemo(() => {
    const result: string[] = [];
    for (const [agentId, data] of typingMap) {
      if (data.channelId === channelId) {
        const agent = allAgents?.find((a) => a.id === agentId);
        result.push(agent?.name ?? agentId.slice(0, 8));
      }
    }
    return result;
  }, [typingMap, channelId, allAgents]);

  if (typing.length === 0) return null;

  return (
    <div className="shrink-0 px-4 py-1">
      <p className="text-xs text-muted-foreground animate-pulse">
        {typing.length === 1
          ? `${typing[0]} is typing...`
          : `${typing.join(', ')} are typing...`}
      </p>
    </div>
  );
}
