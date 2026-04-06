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
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { CreateChannelDialog } from '@/components/channel/CreateChannelDialog';
import { CreateWorkspaceDialog } from '@/components/workspace/CreateWorkspaceDialog';
import { SpawnAgentDialog } from '@/components/agent/SpawnAgentDialog';
import { AddMachineDialog } from '@/components/machine/AddMachineDialog';

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

// ── Helpers ─────────────────────────────────────────────────────

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function channelUrl(workspaceId: string, channelId: string) {
  return `${window.location.origin}/workspaces/${workspaceId}/channels/${channelId}`;
}

// ── Machine Section ─────────────────────────────────────────────

function MachineSection({ workspaceId, onAddMachine }: { workspaceId: string; onAddMachine: () => void }) {
  const router = useRouter();
  const { data: machines } = trpc.machines.list.useQuery({ workspaceId });
  const utils = trpc.useUtils();

  const deregister = trpc.machines.deregister.useMutation({
    onSuccess: () => utils.machines.list.invalidate({ workspaceId }),
  });

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-2 py-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Machines
        </p>
        <button type="button" onClick={onAddMachine}
          className="text-muted-foreground hover:text-foreground transition-colors" title="Add machine">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      {machines && machines.length > 0 && machines.map((machine) => (
        <ContextMenu
          key={machine.id}
          menu={
            <>
              <ContextMenuItem onClick={() => router.push(`/workspaces/${workspaceId}/machines/${machine.id}`)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                View machine
              </ContextMenuItem>
              <ContextMenuItem onClick={() => copyToClipboard(machine.id)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy machine ID
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="text-red-400 hover:text-red-300"
                onClick={() => { if (confirm(`Deregister "${machine.name}"?`)) deregister.mutate({ id: machine.id }); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Deregister
              </ContextMenuItem>
            </>
          }
        >
          <button
            type="button"
            onClick={() => router.push(`/workspaces/${workspaceId}/machines/${machine.id}`)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <div className={cn('h-2 w-2 rounded-full shrink-0', machineStatusDot[machine.status] ?? 'bg-gray-500')} />
            <span className="truncate">{machine.name}</span>
            <span className="ml-auto text-[10px] opacity-60">{machine.machineType}</span>
          </button>
        </ContextMenu>
      ))}
      {(!machines || machines.length === 0) && (
        <p className="px-2 py-1 text-xs text-muted-foreground">No machines yet</p>
      )}
    </div>
  );
}

// ── Agent Section ───────────────────────────────────────────────

function AgentSection({ workspaceId, onSpawnAgent }: { workspaceId: string; onSpawnAgent: () => void }) {
  const router = useRouter();
  const { data: agents } = trpc.agents.list.useQuery({ workspaceId });
  const utils = trpc.useUtils();

  const openDM = trpc.channels.openDM.useMutation({
    onSuccess: (channel) => {
      utils.channels.list.invalidate({ workspaceId });
      router.push(`/workspaces/${workspaceId}/channels/${channel.id}`);
    },
  });

  const wakeAgent = trpc.agents.wake.useMutation({
    onSuccess: () => utils.agents.list.invalidate({ workspaceId }),
  });
  const sleepAgent = trpc.agents.sleep.useMutation({
    onSuccess: () => utils.agents.list.invalidate({ workspaceId }),
  });
  const deleteAgent = trpc.agents.delete.useMutation({
    onSuccess: () => utils.agents.list.invalidate({ workspaceId }),
  });

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-2 py-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Agents
        </p>
        <button type="button" onClick={onSpawnAgent}
          className="text-muted-foreground hover:text-foreground transition-colors" title="Add agent">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      {agents && agents.length > 0 && agents.map((agent) => (
        <ContextMenu
          key={agent.id}
          menu={
            <>
              <ContextMenuItem onClick={() => openDM.mutate({ workspaceId, agentId: agent.id })}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Message
              </ContextMenuItem>
              <ContextMenuItem onClick={() => router.push(`/workspaces/${workspaceId}/agents/${agent.id}`)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Edit agent
              </ContextMenuItem>
              <ContextMenuItem onClick={() => copyToClipboard(agent.id)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy agent ID
              </ContextMenuItem>
              <ContextMenuSeparator />
              {agent.status === 'sleeping' || agent.status === 'offline' ? (
                <ContextMenuItem onClick={() => wakeAgent.mutate({ id: agent.id })}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Wake
                </ContextMenuItem>
              ) : agent.status === 'active' ? (
                <ContextMenuItem onClick={() => sleepAgent.mutate({ id: agent.id })}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                  </svg>
                  Sleep
                </ContextMenuItem>
              ) : null}
              <ContextMenuItem
                className="text-red-400 hover:text-red-300"
                onClick={() => { if (confirm(`Delete agent "${agent.name}"?`)) deleteAgent.mutate({ id: agent.id }); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete agent
              </ContextMenuItem>
            </>
          }
        >
          <div className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground group">
            <div className={cn('h-2 w-2 rounded-full shrink-0', agentStatusDot[agent.status] ?? 'bg-gray-500')} />
            <button
              type="button"
              onClick={() => openDM.mutate({ workspaceId, agentId: agent.id })}
              className="truncate hover:text-foreground transition-colors text-left"
              title={`DM ${agent.name}`}
            >
              {agent.name}
            </button>
            <span className="text-[10px] opacity-60">
              {agentTypeLabel[agent.agentType] ?? agent.agentType}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/workspaces/${workspaceId}/agents/${agent.id}`);
              }}
              className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
              title="Edit agent"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        </ContextMenu>
      ))}
      {(!agents || agents.length === 0) && (
        <p className="px-2 py-1 text-xs text-muted-foreground">No agents yet</p>
      )}
    </div>
  );
}

// ── Members Section ─────────────────────────────────────────────

function MembersSection({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const { data: members } = trpc.workspaces.listMembers.useQuery({ workspaceId });
  const utils = trpc.useUtils();
  const userMembers = members?.filter((m) => m.memberType === 'user') ?? [];

  const openUserDM = trpc.channels.openUserDM.useMutation({
    onSuccess: (channel) => {
      utils.channels.list.invalidate({ workspaceId });
      router.push(`/workspaces/${workspaceId}/channels/${channel.id}`);
    },
  });

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-2 py-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Members
        </p>
        <button type="button" onClick={() => setShowInvite(!showInvite)}
          className="text-muted-foreground hover:text-foreground transition-colors" title="Invite member">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" />
          </svg>
        </button>
      </div>
      {showInvite && (
        <div className="px-2 py-1">
          <p className="text-xs text-muted-foreground mb-1">Invite by email (coming soon)</p>
          <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com"
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
      )}
      {userMembers.map((member) => (
        <ContextMenu
          key={member.id}
          menu={
            <>
              <ContextMenuItem
                onClick={() => member.userId && openUserDM.mutate({ workspaceId, targetUserId: member.userId })}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Message
              </ContextMenuItem>
              <ContextMenuItem onClick={() => copyToClipboard(member.userId ?? member.id)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy user ID
              </ContextMenuItem>
            </>
          }
        >
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground group">
            <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
            <button
              type="button"
              onClick={() => member.userId && openUserDM.mutate({ workspaceId, targetUserId: member.userId })}
              className="truncate hover:text-foreground transition-colors text-left"
              title={`DM ${member.userName ?? 'User'}`}
            >
              {member.userName ?? 'User'}
            </button>
            {member.role === 'owner' && (
              <span className="ml-auto text-[10px] opacity-60">owner</span>
            )}
          </div>
        </ContextMenu>
      ))}
      {userMembers.length === 0 && (
        <p className="px-2 py-1 text-xs text-muted-foreground">No members</p>
      )}
    </div>
  );
}

// ── Channel helpers ─────────────────────────────────────────────

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
  const router = useRouter();
  const utils = trpc.useUtils();

  const deleteChannel = trpc.channels.delete.useMutation({
    onSuccess: () => {
      utils.channels.list.invalidate({ workspaceId });
      router.push(`/workspaces/${workspaceId}`);
    },
  });

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-2 py-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        {onCreateChannel && (
          <button type="button" onClick={onCreateChannel}
            className="text-muted-foreground hover:text-foreground transition-colors" title="Create channel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>
      {channels.map((channel) => {
        const href = `/workspaces/${workspaceId}/channels/${channel.id}`;
        const isActive = pathname === href;
        const isDM = channel.type === 'dm';

        const menu = isDM ? (
          <>
            <ContextMenuItem onClick={() => router.push(href)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Open conversation
            </ContextMenuItem>
            <ContextMenuItem onClick={() => copyToClipboard(channelUrl(workspaceId, channel.id))}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Copy link
            </ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuItem onClick={() => router.push(href)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Open channel
            </ContextMenuItem>
            <ContextMenuItem onClick={() => copyToClipboard(channelUrl(workspaceId, channel.id))}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Copy link
            </ContextMenuItem>
            <ContextMenuItem onClick={() => copyToClipboard(channel.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy channel ID
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-red-400 hover:text-red-300"
              onClick={() => {
                if (confirm(`Delete #${channel.name}? All messages will be lost.`)) {
                  deleteChannel.mutate({ id: channel.id });
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-60">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete channel
            </ContextMenuItem>
          </>
        );

        return (
          <ContextMenu key={channel.id} menu={menu}>
            <Link
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
          </ContextMenu>
        );
      })}
      {channels.length === 0 && (
        <p className="px-2 py-1 text-xs text-muted-foreground">None</p>
      )}
    </div>
  );
}

// ── Main Sidebar ────────────────────────────────────────────────

export function Sidebar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const workspaceId = params.workspaceId as string | undefined;
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [addMachineOpen, setAddMachineOpen] = useState(false);
  const [spawnAgentOpen, setSpawnAgentOpen] = useState(false);

  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const utils = trpc.useUtils();
  const { data: channels } = trpc.channels.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId },
  );

  const deleteWorkspace = trpc.workspaces.delete.useMutation({
    onSuccess: () => {
      utils.workspaces.list.invalidate();
      router.push('/workspaces');
    },
  });

  const currentWorkspace = workspaces?.find((w) => w.id === workspaceId);

  const publicChannels = channels?.filter((c) => c.type === 'public') ?? [];
  const privateChannels = channels?.filter((c) => c.type === 'private') ?? [];
  const dmChannels = channels?.filter((c) => c.type === 'dm') ?? [];
  const deviceChannels = channels?.filter((c) => c.type === 'device') ?? [];

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r">
      {/* Workspace selector */}
      <div className="flex h-14 items-center justify-between border-b px-3">
        <DropdownMenu
          trigger={
            <div className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/50 transition-colors min-w-0 flex-1">
              {currentWorkspace ? (
                <>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-semibold">
                    {currentWorkspace.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold truncate">{currentWorkspace.name}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </>
              ) : (
                <>
                  <span className="text-sm font-semibold">Symbix</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </>
              )}
            </div>
          }
        >
          {workspaces && workspaces.length > 0 && (
            <>
              <p className="px-2 py-1 text-xs text-muted-foreground">Switch workspace</p>
              {workspaces.map((w) => (
                <DropdownMenuItem
                  key={w.id}
                  onClick={() => router.push(`/workspaces/${w.id}`)}
                  className={cn(w.id === workspaceId && 'bg-accent')}
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-[10px] font-semibold mr-2">
                    {w.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{w.name}</span>
                  {w.id === workspaceId && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </DropdownMenuItem>
              ))}
              <div className="my-1 h-px bg-border" />
            </>
          )}
          <DropdownMenuItem onClick={() => setCreateWorkspaceOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 shrink-0">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create workspace
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/workspaces')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 shrink-0">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            All workspaces
          </DropdownMenuItem>
          {currentWorkspace && (
            <>
              <div className="my-1 h-px bg-border" />
              <DropdownMenuItem
                className="text-red-400 hover:text-red-300"
                onClick={() => {
                  if (confirm(`Delete workspace "${currentWorkspace.name}"? This will delete all channels, messages, and agents.`)) {
                    deleteWorkspace.mutate({ id: currentWorkspace.id });
                  }
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 shrink-0">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete workspace
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenu>
      </div>

      {/* Channel list + Agents + Members */}
      <ScrollArea className="flex-1 px-2 py-2">
        {workspaceId ? (
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
            {/* Workspace Library */}
            <div className="mt-1">
              <Link
                href={`/workspaces/${workspaceId}/library`}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  pathname.includes('/library')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                Library
              </Link>
            </div>
            <Separator className="my-2" />
            <AgentSection workspaceId={workspaceId} onSpawnAgent={() => setSpawnAgentOpen(true)} />
            <MachineSection workspaceId={workspaceId} onAddMachine={() => setAddMachineOpen(true)} />
            <MembersSection workspaceId={workspaceId} />
          </>
        ) : (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            Select a workspace to see channels.
          </p>
        )}
      </ScrollArea>

      {/* Dialogs */}
      {workspaceId && (
        <CreateChannelDialog workspaceId={workspaceId} open={createChannelOpen} onOpenChange={setCreateChannelOpen} />
      )}
      {workspaceId && (
        <SpawnAgentDialog workspaceId={workspaceId} open={spawnAgentOpen} onOpenChange={setSpawnAgentOpen} />
      )}
      {workspaceId && (
        <AddMachineDialog workspaceId={workspaceId} open={addMachineOpen} onOpenChange={setAddMachineOpen} />
      )}
      <CreateWorkspaceDialog open={createWorkspaceOpen} onOpenChange={setCreateWorkspaceOpen} />

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

      {/* Personal items link */}
      <div className="px-3 py-1">
        <Link
          href="/personal"
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            pathname === '/personal'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          My Items
        </Link>
      </div>

      {/* User section */}
      <div className="flex items-center gap-2 p-3">
        <UserButton afterSignOutUrl="/sign-in" />
        <span className="truncate text-sm">{user?.firstName ?? user?.username ?? 'User'}</span>
      </div>
    </div>
  );
}
