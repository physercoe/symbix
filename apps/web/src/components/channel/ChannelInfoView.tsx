'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Channel } from '@symbix/shared';

interface Props {
  channelId: string;
  channel: Channel | undefined;
  onRename: (name: string) => void;
  onDelete: () => void;
}

export function ChannelInfoView({ channelId, channel, onRename, onDelete }: Props) {
  const { data: members } = trpc.channels.listMembers.useQuery({ channelId });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const startEdit = () => {
    setName(channel?.name ?? '');
    setEditing(true);
  };

  const submitRename = () => {
    if (name.trim() && name.trim() !== channel?.name) {
      onRename(name.trim());
    }
    setEditing(false);
  };

  return (
    <ScrollArea className="flex-1 p-6">
      <div className="mx-auto max-w-lg">
        <h2 className="text-lg font-semibold mb-6">Channel Info</h2>

        <div className="space-y-5">
          {/* Name — editable */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Name</p>
            {editing ? (
              <form onSubmit={(e) => { e.preventDefault(); submitRename(); }} className="flex items-center gap-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" size="sm" className="h-8 text-xs">Save</Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{channel?.name ?? '—'}</p>
                <button type="button" onClick={startEdit} className="text-muted-foreground hover:text-foreground transition-colors" title="Rename">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            )}
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
            <p className="text-sm">{channel ? new Date(channel.createdAt).toLocaleString() : '—'}</p>
          </div>
        </div>

        {/* Danger zone */}
        <Separator className="my-8" />
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Danger Zone</p>
          <Button
            variant="outline"
            size="sm"
            className="text-red-400 border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
            onClick={() => {
              if (confirm(`Delete #${channel?.name}? All messages will be lost.`)) {
                onDelete();
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete channel
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
