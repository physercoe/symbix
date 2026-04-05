'use client';

import { useMemo } from 'react';
import { useAgentStore } from '@/stores/agent-store';

interface Props {
  channelId: string;
}

export function TypingIndicator({ channelId }: Props) {
  const typingMap = useAgentStore((s) => s.typing);
  const typing = useMemo(() => {
    const result: string[] = [];
    for (const [agentId, data] of typingMap) {
      if (data.channelId === channelId) {
        result.push(agentId.slice(0, 8));
      }
    }
    return result;
  }, [typingMap, channelId]);

  if (typing.length === 0) return null;

  return (
    <div className="shrink-0 px-4 py-1">
      <p className="text-xs text-muted-foreground animate-pulse">
        {typing.length === 1
          ? `${typing[0]} is typing...`
          : `${typing.length} agents are typing...`}
      </p>
    </div>
  );
}
