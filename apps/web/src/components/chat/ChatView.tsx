'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { wsManager } from '@/lib/ws';
import { useMessageStore } from '@/stores/message-store';
import { Button } from '@/components/ui/button';
import { AddAgentToChannelDialog } from '@/components/channel/AddAgentToChannelDialog';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';

const EMPTY_MESSAGES: never[] = [];

interface Props {
  workspaceId: string;
  channelId: string;
}

export function ChatView({ workspaceId, channelId }: Props) {
  const [addAgentOpen, setAddAgentOpen] = useState(false);
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
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center min-w-0">
          <span className="text-muted-foreground mr-2">#</span>
          <h2 className="font-semibold">{channel?.name ?? 'Loading...'}</h2>
          {channel?.description && (
            <span className="ml-3 text-sm text-muted-foreground truncate hidden sm:inline">
              {channel.description}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setAddAgentOpen(true)}>
          + Agent
        </Button>
        <AddAgentToChannelDialog
          workspaceId={workspaceId}
          channelId={channelId}
          open={addAgentOpen}
          onOpenChange={setAddAgentOpen}
        />
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
