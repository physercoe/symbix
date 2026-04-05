'use client';

import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useAgentStore } from '@/stores/agent-store';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Props {
  channelId: string;
  workspaceId: string;
}

export function TypingIndicator({ channelId, workspaceId }: Props) {
  const streaming = useAgentStore((s) => s.streaming);
  const { data: allAgents } = trpc.agents.list.useQuery({ workspaceId });
  const bottomRef = useRef<HTMLDivElement>(null);

  const streamingAgents = Object.values(streaming).filter(
    (s) => s.channelId === channelId && s.content,
  );

  useEffect(() => {
    if (streamingAgents.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  if (streamingAgents.length === 0) return null;

  return (
    <div className="shrink-0 border-t bg-accent/20 px-4 py-2 space-y-2 max-h-48 overflow-y-auto">
      {streamingAgents.map((s) => {
        const agent = allAgents?.find((a) => a.id === s.agentId);
        const name = agent?.name ?? s.agentId.slice(0, 8);
        return (
          <div key={s.agentId} className="flex gap-3">
            <Avatar
              size="sm"
              fallback={name[0]?.toUpperCase() ?? 'A'}
              className="bg-violet-500/20 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-violet-400">{name}</span>
                <Badge variant="secondary" className="text-[10px] px-1 py-0">Agent</Badge>
                <span className="text-xs text-muted-foreground animate-pulse">streaming...</span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{s.content}</p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
