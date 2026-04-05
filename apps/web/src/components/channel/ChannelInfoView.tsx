'use client';

import { trpc } from '@/lib/trpc';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Channel } from '@symbix/shared';

interface Props {
  channelId: string;
  channel: Channel | undefined;
}

export function ChannelInfoView({ channelId, channel }: Props) {
  const { data: members } = trpc.channels.listMembers.useQuery({ channelId });

  return (
    <ScrollArea className="flex-1 p-6">
      <div className="mx-auto max-w-lg">
        <h2 className="text-lg font-semibold mb-6">Channel Info</h2>

        <div className="space-y-5">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Name</p>
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
            <p className="text-sm">{channel ? new Date(channel.createdAt).toLocaleString() : '—'}</p>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
