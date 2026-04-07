'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import type { Message } from '@symbix/shared';

interface Attachment {
  url: string;
  contentType: string;
  filename: string;
  size?: number;
}

interface Props {
  message: Message;
  showHeader: boolean;
  senderName?: string;
  onReply?: (msg: { id: string; content: string | null; senderName: string }) => void;
}

function resolveUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return `${apiUrl}${path}`;
}

function AttachmentCard({ att }: { att: Attachment }) {
  const url = resolveUrl(att.url);

  if (att.contentType === 'image') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img src={url} alt={att.filename} className="max-h-60 max-w-xs rounded-md object-contain" loading="lazy" />
      </a>
    );
  }
  if (att.contentType === 'video') {
    return <video src={url} controls className="max-h-60 max-w-xs rounded-md" preload="metadata" />;
  }
  if (att.contentType === 'audio') {
    return <audio src={url} controls className="max-w-xs" preload="metadata" />;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent/30 transition-colors max-w-xs"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
      <span className="truncate text-blue-400">{att.filename}</span>
      {att.size && <span className="text-xs text-muted-foreground shrink-0">{(att.size / 1024).toFixed(0)} KB</span>}
    </a>
  );
}

function MessageAttachments({ message }: { message: Message }) {
  const meta = message.metadata as Record<string, unknown> | null;
  const attachments = (meta?.attachments as Attachment[] | undefined) ?? [];

  // Fallback: legacy single mediaUrl
  if (attachments.length === 0 && message.mediaUrl) {
    attachments.push({
      url: message.mediaUrl,
      contentType: message.contentType === 'text' ? 'file' : message.contentType,
      filename: message.mediaUrl.split('/').pop() || 'file',
    });
  }

  if (attachments.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {attachments.map((att, i) => (
        <AttachmentCard key={i} att={att} />
      ))}
    </div>
  );
}

export function MessageBubble({ message, showHeader, senderName, onReply }: Props) {
  const [copied, setCopied] = useState(false);
  const isAgent = message.senderType === 'agent';
  const isSystem = message.senderType === 'system';
  const utils = trpc.useUtils();

  const pinMessage = trpc.channelItems.pin.useMutation({
    onSuccess: () => utils.channelItems.listPins.invalidate({ channelId: message.channelId }),
  });

  const saveMessage = trpc.userItems.saveMessage.useMutation();

  const handleCopy = () => {
    const text = message.content || '';
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-xs text-muted-foreground italic">{message.content}</span>
      </div>
    );
  }

  const displayName = senderName || message.senderId.slice(0, 8);
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const contextMenuItems = (
    <>
      {/* Copy text */}
      <ContextMenuItem onClick={handleCopy}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {copied ? 'Copied!' : 'Copy text'}
      </ContextMenuItem>

      {/* Reply */}
      <ContextMenuItem onClick={() => onReply?.({ id: message.id, content: message.content, senderName: displayName })}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
          <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
        </svg>
        Reply
      </ContextMenuItem>

      {/* Pin */}
      <ContextMenuItem onClick={() => pinMessage.mutate({ channelId: message.channelId, messageId: message.id })}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
          <line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
        </svg>
        Pin to channel
      </ContextMenuItem>

      <ContextMenuSeparator />

      {/* Save to personal */}
      <ContextMenuItem onClick={() => {
        saveMessage.mutate({
          channelId: message.channelId,
          messageId: message.id,
          content: message.content || '',
          senderName: displayName,
        });
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        Save to references
      </ContextMenuItem>

      {/* Copy message ID */}
      <ContextMenuItem onClick={() => navigator.clipboard.writeText(message.id).catch(() => {})}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
          <path d="M4 9h16" /><path d="M4 15h16" /><path d="M10 3 8 21" /><path d="M16 3 14 21" />
        </svg>
        Copy message ID
      </ContextMenuItem>
    </>
  );

  return (
    <ContextMenu menu={contextMenuItems}>
      <div
        className={cn(
          'group relative flex gap-3 px-2 py-1 hover:bg-accent/20 rounded-md transition-colors duration-100',
          !showHeader && 'pl-12',
        )}
      >
        {/* Hover action bar */}
        <div className="absolute -top-3 right-2 hidden group-hover:flex items-center gap-0.5 rounded-md border bg-popover px-0.5 py-0.5 shadow-md z-10">
          <button type="button" onClick={handleCopy}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title={copied ? 'Copied!' : 'Copy'}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button type="button" onClick={() => onReply?.({ id: message.id, content: message.content, senderName: displayName })}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Reply">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
            </svg>
          </button>
          <button type="button" onClick={() => pinMessage.mutate({ channelId: message.channelId, messageId: message.id })}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Pin">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              <span className={cn('text-sm font-semibold', isAgent && 'text-violet-400')}>
                {displayName}
              </span>
              {isAgent && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0">Agent</Badge>
              )}
              <span className="text-xs text-muted-foreground">{time}</span>
            </div>
          )}
          {message.parentId && (
            <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
              </svg>
              <span className="italic truncate">replying to a message</span>
            </div>
          )}
          {message.content && (
            <Markdown content={message.content} className="text-sm" />
          )}
          <MessageAttachments message={message} />
        </div>
      </div>
    </ContextMenu>
  );
}
