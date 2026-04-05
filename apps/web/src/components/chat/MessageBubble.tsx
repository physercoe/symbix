'use client';

import { trpc } from '@/lib/trpc';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import type { Message } from '@symbix/shared';

interface Props {
  message: Message;
  showHeader: boolean;
  senderName?: string;
}

function MediaAttachment({ message }: { message: Message }) {
  if (!message.mediaUrl) return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const url = message.mediaUrl.startsWith('http') ? message.mediaUrl : `${apiUrl}${message.mediaUrl}`;

  switch (message.contentType) {
    case 'image':
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block my-1">
          <img
            src={url}
            alt="attachment"
            className="max-h-80 max-w-sm rounded-md object-contain"
            loading="lazy"
          />
        </a>
      );
    case 'video':
      return (
        <video
          src={url}
          controls
          className="max-h-80 max-w-sm rounded-md my-1"
          preload="metadata"
        />
      );
    case 'audio':
      return <audio src={url} controls className="my-1 max-w-sm" preload="metadata" />;
    case 'file':
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="my-1 flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent/30 transition-colors max-w-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="truncate text-blue-400">
            {message.mediaUrl.split('/').pop() || 'Download file'}
          </span>
        </a>
      );
    default:
      return null;
  }
}

export function MessageBubble({ message, showHeader, senderName }: Props) {
  const isAgent = message.senderType === 'agent';
  const isSystem = message.senderType === 'system';
  const utils = trpc.useUtils();

  const pinMessage = trpc.channelItems.pin.useMutation({
    onSuccess: () => utils.channelItems.listPins.invalidate({ channelId: message.channelId }),
  });

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-xs text-muted-foreground italic">
          {message.content}
        </span>
      </div>
    );
  }

  const displayName = senderName || message.senderId.slice(0, 8);
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={cn(
        'group relative flex gap-3 px-1 py-0.5 hover:bg-accent/30 rounded',
        !showHeader && 'pl-12',
      )}
    >
      {/* Hover actions */}
      <div className="absolute -top-3 right-2 hidden group-hover:flex items-center gap-0.5 rounded-md border bg-popover px-1 py-0.5 shadow-sm z-10">
        <button
          type="button"
          onClick={() => pinMessage.mutate({ channelId: message.channelId, messageId: message.id })}
          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Pin message"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
          </svg>
        </button>
      </div>

      {showHeader && (
        <Avatar
          size="sm"
          fallback={isAgent ? displayName[0]?.toUpperCase() ?? 'A' : displayName[0]?.toUpperCase() ?? 'U'}
          className={cn(isAgent && 'bg-violet-500/20')}
        />
      )}
      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={cn(
                'text-sm font-semibold',
                isAgent && 'text-violet-400',
              )}
            >
              {displayName}
            </span>
            {isAgent && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                Agent
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
        )}
        {message.content && (
          <Markdown content={message.content} className="text-sm" />
        )}
        <MediaAttachment message={message} />
      </div>
    </div>
  );
}
