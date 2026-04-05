'use client';

import { useAgentStore } from '@/stores/agent-store';

interface Props {
  channelId: string;
}

export function TypingIndicator({ channelId }: Props) {
  const typing = useAgentStore((s) => {
    const result: string[] = [];
    for (const [agentId, data] of s.typing) {
      if (data.channelId === channelId) {
        result.push(agentId.slice(0, 8));
      }
    }
    return result;
  });

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
