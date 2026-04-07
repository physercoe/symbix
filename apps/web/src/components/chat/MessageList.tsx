'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';
import type { Message } from '@symbix/shared';

interface StreamingEntry {
  agentId: string;
  name: string;
  content: string;
}

interface Props {
  messages: Message[];
  isLoading: boolean;
  senderNames?: Map<string, string>;
  streaming?: StreamingEntry[];
  onReply?: (msg: { id: string; content: string | null; senderName: string }) => void;
}

export function MessageList({ messages, isLoading, senderNames, streaming, onReply }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streaming]);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0 && (!streaming || streaming.length === 0)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground gap-2 px-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p className="text-sm">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <ScrollArea ref={containerRef} className="flex-1 p-4">
      <div className="space-y-1">
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const showHeader =
            !prev ||
            prev.senderId !== msg.senderId ||
            prev.senderType !== msg.senderType;
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              showHeader={showHeader}
              senderName={senderNames?.get(msg.senderId)}
              onReply={onReply}
            />
          );
        })}
        {streaming && streaming.map((s) => {
          const lastMsg = messages[messages.length - 1];
          const showHeader = !lastMsg || lastMsg.senderId !== s.agentId || lastMsg.senderType !== 'agent';
          return (
            <div
              key={`streaming-${s.agentId}`}
              className="group flex gap-3 px-1 py-0.5 rounded"
              style={!showHeader ? { paddingLeft: '3rem' } : undefined}
            >
              {showHeader && (
                <Avatar
                  size="sm"
                  fallback={s.name[0]?.toUpperCase() ?? 'A'}
                  className="bg-violet-500/20 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                {showHeader && (
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-violet-400">{s.name}</span>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">Agent</Badge>
                    <span className="text-xs text-muted-foreground animate-pulse">streaming...</span>
                  </div>
                )}
                <Markdown content={s.content} className="text-sm" />
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
