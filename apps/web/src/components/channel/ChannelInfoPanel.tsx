'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Channel, Message } from '@symbix/shared';

// Note: Tab navigation is rendered in ChatView header bar. This panel just shows content.

type Tab = 'info' | 'pinned' | 'files' | 'tasks' | 'docs' | 'links';

interface Props {
  workspaceId: string;
  channelId: string;
  channel: Channel | undefined;
  messages: Message[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onClose: () => void;
}

function InfoTab({ channel, channelId }: { channel: Channel | undefined; channelId: string }) {
  const { data: members } = trpc.channels.listMembers.useQuery({ channelId });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Channel Name</p>
        <p className="text-sm font-medium">{channel?.name ?? '—'}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Description</p>
        <p className="text-sm">{channel?.description || 'No description'}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Type</p>
        <p className="text-sm capitalize">{channel?.type ?? '—'}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Members</p>
        <p className="text-sm">{members?.length ?? 0}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Created</p>
        <p className="text-sm">{channel ? new Date(channel.createdAt).toLocaleDateString() : '—'}</p>
      </div>
    </div>
  );
}

function PinnedTab({ channelId }: { channelId: string }) {
  const { data: pins } = trpc.channelItems.listPins.useQuery({ channelId });
  const utils = trpc.useUtils();
  const unpin = trpc.channelItems.unpin.useMutation({
    onSuccess: () => utils.channelItems.listPins.invalidate({ channelId }),
  });

  if (!pins?.length) {
    return <p className="text-sm text-muted-foreground">No pinned messages yet. Right-click a message to pin it.</p>;
  }

  return (
    <div className="space-y-2">
      {pins.map((pin) => (
        <div key={pin.id} className="rounded-md border p-2 text-sm group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              {new Date(pin.createdAt).toLocaleDateString()}
            </span>
            <button
              type="button"
              onClick={() => unpin.mutate({ id: pin.id })}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity"
              title="Unpin"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="line-clamp-3">{pin.content || '(media)'}</p>
        </div>
      ))}
    </div>
  );
}

function ItemsTab({ channelId, type, emptyText, showStatus }: {
  channelId: string;
  type: 'task' | 'doc' | 'link' | 'file';
  emptyText: string;
  showStatus?: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const { data: items } = trpc.channelItems.list.useQuery({ channelId, type });
  const utils = trpc.useUtils();

  const create = trpc.channelItems.create.useMutation({
    onSuccess: () => {
      utils.channelItems.list.invalidate({ channelId, type });
      setTitle('');
      setUrl('');
      setShowAdd(false);
    },
  });

  const update = trpc.channelItems.update.useMutation({
    onSuccess: () => utils.channelItems.list.invalidate({ channelId, type }),
  });

  const remove = trpc.channelItems.delete.useMutation({
    onSuccess: () => utils.channelItems.list.invalidate({ channelId, type }),
  });

  const statusColors: Record<string, string> = {
    open: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    done: 'bg-green-500',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{items?.length ?? 0} items</span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowAdd(!showAdd)}>
          + Add
        </Button>
      </div>

      {showAdd && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            create.mutate({
              channelId,
              type,
              title: title.trim(),
              url: url.trim() || undefined,
              status: type === 'task' ? 'open' : undefined,
            });
          }}
          className="space-y-2 rounded-md border p-2"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'link' ? 'Link title' : type === 'task' ? 'Task description' : `${type} title`}
            className="w-full rounded border border-input bg-background px-2 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {(type === 'link' || type === 'file' || type === 'doc') && (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL (optional)"
              className="w-full rounded border border-input bg-background px-2 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
          <div className="flex gap-1">
            <Button type="submit" size="sm" className="h-7 text-xs" disabled={create.isPending}>
              Add
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {!items?.length && !showAdd && (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}

      {items?.map((item) => (
        <div key={item.id} className="flex items-start gap-2 rounded-md border p-2 text-sm group">
          {showStatus && item.status && (
            <button
              type="button"
              onClick={() => {
                const next = item.status === 'open' ? 'in_progress' : item.status === 'in_progress' ? 'done' : 'open';
                update.mutate({ id: item.id, status: next });
              }}
              className="mt-0.5 shrink-0"
              title={`Status: ${item.status}. Click to cycle.`}
            >
              <div className={cn('h-3 w-3 rounded-full', statusColors[item.status ?? 'open'] ?? 'bg-gray-500')} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate block">
                {item.title}
              </a>
            ) : (
              <p className={cn('truncate', showStatus && item.status === 'done' && 'line-through text-muted-foreground')}>
                {item.title}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(item.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('Remove this item?')) remove.mutate({ id: item.id });
            }}
            className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function FilesFromMessages({ messages }: { messages: Message[] }) {
  const fileMessages = messages.filter((m) => m.mediaUrl && m.contentType !== 'text');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  if (!fileMessages.length) {
    return <p className="text-sm text-muted-foreground mb-3">No shared files in messages yet.</p>;
  }

  return (
    <div className="space-y-2 mb-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">Shared in chat</p>
      {fileMessages.map((msg) => {
        const url = msg.mediaUrl!.startsWith('http') ? msg.mediaUrl! : `${apiUrl}${msg.mediaUrl}`;
        const filename = msg.mediaUrl!.split('/').pop() || 'file';
        return (
          <a
            key={msg.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent/30 transition-colors"
          >
            {msg.contentType === 'image' ? (
              <img src={url} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
            )}
            <span className="truncate text-blue-400">{filename}</span>
            <span className="ml-auto text-xs text-muted-foreground shrink-0">
              {new Date(msg.createdAt).toLocaleDateString()}
            </span>
          </a>
        );
      })}
    </div>
  );
}

export function ChannelInfoPanel({ workspaceId, channelId, channel, messages, activeTab, onTabChange, onClose }: Props) {
  // Tab labels for the panel header
  const tabLabels: Record<Tab, string> = {
    info: 'Channel Info',
    pinned: 'Pinned Messages',
    files: 'Files',
    tasks: 'Tasks',
    docs: 'Documents',
    links: 'Links',
  };

  return (
    <div className="flex w-80 shrink-0 flex-col border-l bg-background">
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b px-3">
        <h3 className="text-sm font-semibold">{tabLabels[activeTab]}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Tab content */}
      <ScrollArea className="flex-1 p-3">
        {activeTab === 'info' && <InfoTab channel={channel} channelId={channelId} />}
        {activeTab === 'pinned' && <PinnedTab channelId={channelId} />}
        {activeTab === 'files' && (
          <>
            <FilesFromMessages messages={messages} />
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Saved files</p>
            <ItemsTab channelId={channelId} type="file" emptyText="No saved files." />
          </>
        )}
        {activeTab === 'tasks' && (
          <ItemsTab channelId={channelId} type="task" emptyText="No tasks yet. Add one to track work." showStatus />
        )}
        {activeTab === 'docs' && (
          <ItemsTab channelId={channelId} type="doc" emptyText="No docs yet. Add links to important documents." />
        )}
        {activeTab === 'links' && (
          <ItemsTab channelId={channelId} type="link" emptyText="No saved links yet." />
        )}
      </ScrollArea>
    </div>
  );
}
