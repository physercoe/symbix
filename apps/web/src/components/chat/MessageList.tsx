'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Message } from '@symbix/shared';

interface Props {
  messages: Message[];
  isLoading: boolean;
  senderNames?: Map<string, string>;
}

export function MessageList({ messages, isLoading, senderNames }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p>No messages yet. Start the conversation!</p>
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
            />
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
