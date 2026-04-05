'use client';

import { useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { wsManager } from '@/lib/ws';
import { useMessageStore } from '@/stores/message-store';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';

const EMPTY_MESSAGES: never[] = [];

interface Props {
  channelId: string;
}

export function ChatView({ channelId }: Props) {
  const { data: channel } = trpc.channels.getById.useQuery({ id: channelId });
  const { data, isLoading } = trpc.messages.list.useQuery({ channelId, limit: 50 });
  const setMessages = useMessageStore((s) => s.setMessages);
  const messages = useMessageStore((s) => s.messages.get(channelId)) ?? EMPTY_MESSAGES;

  // Sync fetched messages to store (only initial load)
  useEffect(() => {
    if (data?.messages) {
      // API returns newest-first, reverse for display (oldest first)
      setMessages(channelId, [...data.messages].reverse());
    }
  }, [data, channelId, setMessages]);

  // Subscribe to channel WS on mount
  useEffect(() => {
    wsManager.subscribe(channelId);
    return () => {
      wsManager.unsubscribe(channelId);
    };
  }, [channelId]);

  return (
    <div className="flex h-full flex-col">
      {/* Channel header */}
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <span className="text-muted-foreground mr-2">#</span>
        <h2 className="font-semibold">{channel?.name ?? 'Loading...'}</h2>
        {channel?.description && (
          <span className="ml-3 text-sm text-muted-foreground truncate hidden sm:inline">
            {channel.description}
          </span>
        )}
      </div>

      {/* Messages */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* Typing indicator */}
      <TypingIndicator channelId={channelId} />

      {/* Input */}
      <MessageInput channelId={channelId} />
    </div>
  );
}
