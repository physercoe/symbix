'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

function ChannelIcon({ type }: { type: string }) {
  if (type === 'dm') return <span className="text-muted-foreground">@</span>;
  return <span className="text-muted-foreground">#</span>;
}

function ChannelGroup({
  label,
  channels,
  workspaceId,
  pathname,
}: {
  label: string;
  channels: Array<{ id: string; name: string; type: string }>;
  workspaceId: string;
  pathname: string;
}) {
  if (channels.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      {channels.map((channel) => {
        const href = `/workspaces/${workspaceId}/channels/${channel.id}`;
        const isActive = pathname === href;
        return (
          <Link
            key={channel.id}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            <ChannelIcon type={channel.type} />
            <span className="truncate">{channel.name}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  const params = useParams();
  const pathname = usePathname();
  const { user } = useUser();
  const workspaceId = params.workspaceId as string | undefined;

  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const { data: channels } = trpc.channels.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId },
  );

  const currentWorkspace = workspaces?.find((w) => w.id === workspaceId);

  const publicChannels = channels?.filter((c) => c.type === 'public') ?? [];
  const privateChannels = channels?.filter((c) => c.type === 'private') ?? [];
  const dmChannels = channels?.filter((c) => c.type === 'dm') ?? [];
  const deviceChannels = channels?.filter((c) => c.type === 'device') ?? [];

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r">
      {/* Workspace selector */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        {currentWorkspace ? (
          <h2 className="text-sm font-semibold truncate">{currentWorkspace.name}</h2>
        ) : (
          <h2 className="text-sm font-semibold">Symbix</h2>
        )}
      </div>

      {/* Workspace list links (other workspaces) */}
      {workspaces && workspaces.length > 1 && (
        <div className="border-b px-2 py-1">
          {workspaces
            .filter((w) => w.id !== workspaceId)
            .map((w) => (
              <Link
                key={w.id}
                href={`/workspaces/${w.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors truncate"
              >
                <span className="truncate">{w.name}</span>
              </Link>
            ))}
        </div>
      )}

      {/* Channel list */}
      <ScrollArea className="flex-1 px-2 py-2">
        {workspaceId && channels ? (
          <>
            <ChannelGroup
              label="Channels"
              channels={publicChannels}
              workspaceId={workspaceId}
              pathname={pathname}
            />
            <ChannelGroup
              label="Private"
              channels={privateChannels}
              workspaceId={workspaceId}
              pathname={pathname}
            />
            <ChannelGroup
              label="Direct Messages"
              channels={dmChannels}
              workspaceId={workspaceId}
              pathname={pathname}
            />
            <ChannelGroup
              label="Devices"
              channels={deviceChannels}
              workspaceId={workspaceId}
              pathname={pathname}
            />
          </>
        ) : (
          !workspaceId && (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Select a workspace to see channels.
            </p>
          )
        )}
      </ScrollArea>

      {/* Create Channel */}
      {workspaceId && (
        <div className="px-3 py-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <Link href={`/workspaces/${workspaceId}/channels/new`}>
              <span className="mr-2 text-base leading-none">+</span>
              Create Channel
            </Link>
          </Button>
        </div>
      )}

      <Separator />

      {/* User section */}
      <div className="flex items-center gap-2 p-3">
        <UserButton afterSignOutUrl="/sign-in" />
        <span className="truncate text-sm">{user?.firstName ?? user?.username ?? 'User'}</span>
      </div>
    </div>
  );
}
