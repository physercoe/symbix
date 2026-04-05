'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Message } from '@symbix/shared';

interface Props {
  channelId: string;
  messages: Message[];
}

export function ChannelFilesView({ channelId, messages }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const { data: savedFiles } = trpc.channelItems.list.useQuery({ channelId, type: 'file' });
  const utils = trpc.useUtils();

  const create = trpc.channelItems.create.useMutation({
    onSuccess: () => { utils.channelItems.list.invalidate({ channelId, type: 'file' }); setTitle(''); setUrl(''); setShowAdd(false); },
  });
  const remove = trpc.channelItems.delete.useMutation({
    onSuccess: () => utils.channelItems.list.invalidate({ channelId, type: 'file' }),
  });

  // Files shared in messages
  const fileMessages = messages.filter((m) => m.mediaUrl && m.contentType !== 'text');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  return (
    <ScrollArea className="flex-1 p-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-lg font-semibold mb-4">Files</h2>

        {/* Shared in chat */}
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Shared in Chat</h3>
        {fileMessages.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-6">No files shared in chat yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {fileMessages.map((msg) => {
              const fileUrl = msg.mediaUrl!.startsWith('http') ? msg.mediaUrl! : `${apiUrl}${msg.mediaUrl}`;
              const filename = msg.mediaUrl!.split('/').pop() || 'file';
              return (
                <a key={msg.id} href={fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/30 transition-colors">
                  {msg.contentType === 'image' ? (
                    <img src={fileUrl} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-accent shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm truncate text-blue-400">{filename}</p>
                    <p className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleDateString()}</p>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        <Separator className="my-4" />

        {/* Saved files */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saved Files</h3>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAdd(!showAdd)}>+ Add File</Button>
        </div>

        {showAdd && (
          <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) create.mutate({ channelId, type: 'file', title: title.trim(), url: url.trim() || undefined }); }}
            className="mb-4 space-y-2 rounded-lg border p-3">
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="File name"
              className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL (optional)"
              className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="h-7 text-xs" disabled={create.isPending}>Add</Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {!savedFiles?.length && !showAdd && <p className="text-sm text-muted-foreground">No saved files.</p>}

        <div className="space-y-2">
          {savedFiles?.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3 group hover:bg-accent/20 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-accent shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline truncate block">{item.title}</a>
                ) : (
                  <p className="text-sm truncate">{item.title}</p>
                )}
                <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
              <button type="button" onClick={() => { if (confirm('Remove?')) remove.mutate({ id: item.id }); }}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
