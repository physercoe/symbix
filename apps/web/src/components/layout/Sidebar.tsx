'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { CreateChannelDialog } from '@/components/channel/CreateChannelDialog';
import { SpawnAgentDialog } from '@/components/agent/SpawnAgentDialog';

const agentStatusDot: Record<string, string> = {
  active: 'bg-green-500',
  sleeping: 'bg-yellow-500',
  offline: 'bg-gray-500',
  error: 'bg-red-500',
  disabled: 'bg-gray-500',
};

const agentTypeLabel: Record<string, string> = {
  hosted_bot: 'Bot',
  cli_agent: 'CLI',
  cloud_agent: 'Cloud',
  device_agent: 'Device',
};

const machineStatusDot: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
};

function MachineSection({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const { data: machines } = trpc.machines.list.useQuery({ workspaceId });
  if (!machines || machines.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Machines
      </p>
      {machines.map((machine) => (
        <button
          key={machine.id}
          type="button"
          onClick={() => router.push(`/workspaces/${workspaceId}/settings`)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
        >
          <div className={cn('h-2 w-2 rounded-full shrink-0', machineStatusDot[machine.status] ?? 'bg-gray-500')} />
          <span className="truncate">{machine.name}</span>
          <span className="ml-auto text-[10px] opacity-60">{machine.machineType}</span>
        </button>
      ))}
    </div>
  );
}

function AgentSection({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [spawnOpen, setSpawnOpen] = useState(false);
  const { data: agents } = trpc.agents.list.useQuery({ workspaceId });

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-2 py-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Agents
        </p>
        <button
          type="button"
          onClick={() => setSpawnOpen(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Add agent"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      {agents && agents.length > 0 && agents.map((agent) => (
        <button
          key={agent.id}
          type="button"
          onClick={() => router.push(`/workspaces/${workspaceId}/settings`)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
        >
          <div className={cn('h-2 w-2 rounded-full shrink-0', agentStatusDot[agent.status] ?? 'bg-gray-500')} />
          <span className="truncate">{agent.name}</span>
          <span className="ml-auto text-[10px] opacity-60">
            {agentTypeLabel[agent.agentType] ?? agent.agentType}
          </span>
        </button>
      ))}
      {(!agents || agents.length === 0) && (
        <p className="px-2 py-1 text-xs text-muted-foreground">No agents yet</p>
      )}
      <SpawnAgentDialog workspaceId={workspaceId} open={spawnOpen} onOpenChange={setSpawnOpen} />
    </div>
  );
}

function ChannelIcon({ type }: { type: string }) {
  if (type === 'dm') return <span className="text-muted-foreground">@</span>;
  return <span className="text-muted-foreground">#</span>;
}

function ChannelGroup({
  label,
  channels,
  workspaceId,
  pathname,
  onCreateChannel,
}: {
  label: string;
  channels: Array<{ id: string; name: string; type: string }>;
  workspaceId: string;
  pathname: string;
  onCreateChannel?: () => void;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-2 py-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        {onCreateChannel && (
          <button
            type="button"
            onClick={onCreateChannel}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Create channel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>
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
      {channels.length === 0 && (
        <p className="px-2 py-1 text-xs text-muted-foreground">None</p>
      )}
    </div>
  );
}

export function Sidebar() {
  const params = useParams();
  const pathname = usePathname();
  const { user } = useUser();
  const workspaceId = params.workspaceId as string | undefined;
  const [createChannelOpen, setCreateChannelOpen] = useState(false);

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

      {/* Channel list + Agents */}
      <ScrollArea className="flex-1 px-2 py-2">
        {workspaceId && channels ? (
          <>
            <ChannelGroup
              label="Channels"
              channels={publicChannels}
              workspaceId={workspaceId}
              pathname={pathname}
              onCreateChannel={() => setCreateChannelOpen(true)}
            />
            {privateChannels.length > 0 && (
              <ChannelGroup
                label="Private"
                channels={privateChannels}
                workspaceId={workspaceId}
                pathname={pathname}
              />
            )}
            {dmChannels.length > 0 && (
              <ChannelGroup
                label="Direct Messages"
                channels={dmChannels}
                workspaceId={workspaceId}
                pathname={pathname}
              />
            )}
            {deviceChannels.length > 0 && (
              <ChannelGroup
                label="Devices"
                channels={deviceChannels}
                workspaceId={workspaceId}
                pathname={pathname}
              />
            )}
            <Separator className="my-2" />
            <AgentSection workspaceId={workspaceId} />
            <MachineSection workspaceId={workspaceId} />
          </>
        ) : (
          !workspaceId && (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Select a workspace to see channels.
            </p>
          )
        )}
      </ScrollArea>

      {/* Create Channel Dialog */}
      {workspaceId && (
        <CreateChannelDialog
          workspaceId={workspaceId}
          open={createChannelOpen}
          onOpenChange={setCreateChannelOpen}
        />
      )}

      {/* Settings link */}
      {workspaceId && (
        <div className="px-3 py-1">
          <Link
            href={`/workspaces/${workspaceId}/settings`}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              pathname.endsWith('/settings')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </Link>
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
