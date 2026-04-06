'use client';

import { useState, useEffect, useCallback } from 'react';
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

type SidebarTab = 'workspace' | 'toolkit';

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

// ── Icons (inline SVG helpers) ──────────────────────────────────

function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ── Section Header ──────────────────────────────────────────────

function SectionHeader({ label, onAdd, addTitle }: { label: string; onAdd?: () => void; addTitle?: string }) {
  return (
    <div className="flex items-center justify-between px-2 py-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      {onAdd && (
        <button type="button" onClick={onAdd} className="text-muted-foreground hover:text-foreground transition-colors" title={addTitle ?? 'Add'}>
          <PlusIcon />
        </button>
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
      <SectionHeader label={label} onAdd={onCreateChannel} addTitle="Create channel" />
      {channels.map((channel) => {
        const href = `/workspaces/${workspaceId}/channels/${channel.id}`;
        const isActive = pathname === href;
        const isDM = channel.type === 'dm';

        const menu = isDM ? (
          <>
            <ContextMenuItem onClick={() => router.push(href)}>Open conversation</ContextMenuItem>
            <ContextMenuItem onClick={() => copyToClipboard(channelUrl(workspaceId, channel.id))}>Copy link</ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuItem onClick={() => router.push(href)}>Open channel</ContextMenuItem>
            <ContextMenuItem onClick={() => copyToClipboard(channelUrl(workspaceId, channel.id))}>Copy link</ContextMenuItem>
            <ContextMenuItem onClick={() => copyToClipboard(channel.id)}>Copy channel ID</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem className="text-red-400 hover:text-red-300"
              onClick={() => { if (confirm(`Delete #${channel.name}? All messages will be lost.`)) deleteChannel.mutate({ id: channel.id }); }}>
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
                isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
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

// ── Team Section (Agents + People grouped) ──────────────────────

function TeamSection({ workspaceId, onSpawnAgent }: { workspaceId: string; onSpawnAgent: () => void }) {
  const router = useRouter();
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [peopleOpen, setPeopleOpen] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const { data: agents } = trpc.agents.list.useQuery({ workspaceId });
  const { data: members } = trpc.workspaces.listMembers.useQuery({ workspaceId });
  const utils = trpc.useUtils();

  const userMembers = members?.filter((m) => m.memberType === 'user') ?? [];

  const openDM = trpc.channels.openDM.useMutation({
    onSuccess: (channel) => {
      utils.channels.list.invalidate({ workspaceId });
      router.push(`/workspaces/${workspaceId}/channels/${channel.id}`);
    },
  });
  const openUserDM = trpc.channels.openUserDM.useMutation({
    onSuccess: (channel) => {
      utils.channels.list.invalidate({ workspaceId });
      router.push(`/workspaces/${workspaceId}/channels/${channel.id}`);
    },
  });
  const wakeAgent = trpc.agents.wake.useMutation({ onSuccess: () => utils.agents.list.invalidate({ workspaceId }) });
  const sleepAgent = trpc.agents.sleep.useMutation({ onSuccess: () => utils.agents.list.invalidate({ workspaceId }) });
  const deleteAgent = trpc.agents.delete.useMutation({ onSuccess: () => utils.agents.list.invalidate({ workspaceId }) });

  return (
    <div className="mt-2">
      <SectionHeader label="Team" />

      {/* Agents sub-section */}
      <button type="button" onClick={() => setAgentsOpen(!agentsOpen)}
        className="flex w-full items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={cn('transition-transform', agentsOpen ? 'rotate-90' : '')}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Agents</span>
        <span className="opacity-60">({agents?.length ?? 0})</span>
        <button type="button" onClick={(e) => { e.stopPropagation(); onSpawnAgent(); }}
          className="ml-auto text-muted-foreground hover:text-foreground" title="Spawn agent">
          <PlusIcon size={12} />
        </button>
      </button>

      {agentsOpen && agents?.map((agent) => (
        <ContextMenu
          key={agent.id}
          menu={
            <>
              <ContextMenuItem onClick={() => openDM.mutate({ workspaceId, agentId: agent.id })}>Message</ContextMenuItem>
              <ContextMenuItem onClick={() => router.push(`/workspaces/${workspaceId}/agents/${agent.id}`)}>Edit agent</ContextMenuItem>
              <ContextMenuItem onClick={() => copyToClipboard(agent.id)}>Copy agent ID</ContextMenuItem>
              <ContextMenuSeparator />
              {(agent.status === 'sleeping' || agent.status === 'offline') && (
                <ContextMenuItem onClick={() => wakeAgent.mutate({ id: agent.id })}>Wake</ContextMenuItem>
              )}
              {agent.status === 'active' && (
                <ContextMenuItem onClick={() => sleepAgent.mutate({ id: agent.id })}>Sleep</ContextMenuItem>
              )}
              <ContextMenuItem className="text-red-400 hover:text-red-300"
                onClick={() => { if (confirm(`Delete agent "${agent.name}"?`)) deleteAgent.mutate({ id: agent.id }); }}>
                Delete agent
              </ContextMenuItem>
            </>
          }
        >
          <div className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground group ml-2">
            <div className={cn('h-2 w-2 rounded-full shrink-0', agentStatusDot[agent.status] ?? 'bg-gray-500')} />
            <button type="button" onClick={() => openDM.mutate({ workspaceId, agentId: agent.id })}
              className="truncate hover:text-foreground transition-colors text-left text-xs" title={`DM ${agent.name}`}>
              {agent.name}
            </button>
            <span className="text-[10px] opacity-50">{agentTypeLabel[agent.agentType] ?? agent.agentType}</span>
          </div>
        </ContextMenu>
      ))}

      {/* People sub-section */}
      <button type="button" onClick={() => setPeopleOpen(!peopleOpen)}
        className="flex w-full items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={cn('transition-transform', peopleOpen ? 'rotate-90' : '')}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>People</span>
        <span className="opacity-60">({userMembers.length})</span>
        <button type="button" onClick={(e) => { e.stopPropagation(); setShowInvite(!showInvite); }}
          className="ml-auto text-muted-foreground hover:text-foreground" title="Invite">
          <PlusIcon size={12} />
        </button>
      </button>

      {showInvite && peopleOpen && (
        <div className="px-3 py-1 ml-2">
          <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email (coming soon)"
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
      )}

      {peopleOpen && userMembers.map((member) => (
        <ContextMenu
          key={member.id}
          menu={
            <>
              <ContextMenuItem onClick={() => member.userId && openUserDM.mutate({ workspaceId, targetUserId: member.userId })}>Message</ContextMenuItem>
              <ContextMenuItem onClick={() => copyToClipboard(member.userId ?? member.id)}>Copy user ID</ContextMenuItem>
            </>
          }
        >
          <div className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground group ml-2">
            <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
            <button type="button"
              onClick={() => member.userId && openUserDM.mutate({ workspaceId, targetUserId: member.userId })}
              className="truncate hover:text-foreground transition-colors text-left text-xs" title={`DM ${member.userName ?? 'User'}`}>
              {member.userName ?? 'User'}
            </button>
            {member.role === 'owner' && <span className="ml-auto text-[10px] opacity-50">owner</span>}
          </div>
        </ContextMenu>
      ))}
    </div>
  );
}

// ── Workspace Tab Content ───────────────────────────────────────

function WorkspaceTabContent({
  workspaceId,
  pathname,
  onCreateChannel,
  onSpawnAgent,
}: {
  workspaceId: string;
  pathname: string;
  onCreateChannel: () => void;
  onSpawnAgent: () => void;
}) {
  const { data: channels } = trpc.channels.list.useQuery(
    { workspaceId },
    { enabled: !!workspaceId },
  );

  const publicChannels = channels?.filter((c) => c.type === 'public') ?? [];
  const privateChannels = channels?.filter((c) => c.type === 'private') ?? [];
  const dmChannels = channels?.filter((c) => c.type === 'dm') ?? [];
  const deviceChannels = channels?.filter((c) => c.type === 'device') ?? [];

  return (
    <>
      <ChannelGroup label="Channels" channels={publicChannels} workspaceId={workspaceId} pathname={pathname} onCreateChannel={onCreateChannel} />
      {privateChannels.length > 0 && (
        <ChannelGroup label="Private" channels={privateChannels} workspaceId={workspaceId} pathname={pathname} />
      )}
      {dmChannels.length > 0 && (
        <ChannelGroup label="Direct Messages" channels={dmChannels} workspaceId={workspaceId} pathname={pathname} />
      )}
      {deviceChannels.length > 0 && (
        <ChannelGroup label="Devices" channels={deviceChannels} workspaceId={workspaceId} pathname={pathname} />
      )}

      <Separator className="my-2" />

      {/* Knowledge */}
      <Link
        href={`/workspaces/${workspaceId}/knowledge`}
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          pathname.includes('/knowledge') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        )}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        Knowledge
      </Link>

      {/* Team */}
      <TeamSection workspaceId={workspaceId} onSpawnAgent={onSpawnAgent} />

      {/* Config */}
      <div className="mt-2">
        <Link
          href={`/workspaces/${workspaceId}/settings`}
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            pathname.endsWith('/settings') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Config
        </Link>
      </div>
    </>
  );
}

// ── Toolkit Tab Content ─────────────────────────────────────────

function ToolkitTabContent({ pathname }: { pathname: string }) {
  const { data: specs } = trpc.specs.list.useQuery({});
  const { data: items } = trpc.userItems.list.useQuery({});

  const agentSpecs = specs?.filter((s) => s.specType === 'agent') ?? [];
  const workspaceSpecs = specs?.filter((s) => s.specType === 'workspace') ?? [];
  const insights = items?.filter((i) => i.type === 'insight') ?? [];
  const references = items?.filter((i) => i.type === 'reference') ?? [];
  const patterns = items?.filter((i) => i.type === 'pattern') ?? [];
  const assets = items?.filter((i) => i.type === 'asset') ?? [];

  const toolkitLinks = [
    {
      href: '/toolkit/specs',
      label: 'Specs',
      count: (agentSpecs.length + workspaceSpecs.length),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      subtitle: `${agentSpecs.length} agent, ${workspaceSpecs.length} workspace`,
    },
    {
      href: '/toolkit/patterns',
      label: 'Patterns',
      count: patterns.length,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
      ),
    },
    {
      href: '/toolkit/references',
      label: 'References',
      count: references.length,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      href: '/toolkit/insights',
      label: 'Insights',
      count: insights.length,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <line x1="9" y1="18" x2="15" y2="18" /><line x1="10" y1="22" x2="14" y2="22" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>
      ),
    },
    {
      href: '/toolkit/assets',
      label: 'Assets',
      count: assets.length,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      ),
    },
    {
      href: '/toolkit/machines',
      label: 'Machines',
      count: undefined,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
  ];

  return (
    <div className="mt-2 space-y-0.5">
      {toolkitLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            pathname.startsWith(link.href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )}
        >
          {link.icon}
          <span className="flex-1">{link.label}</span>
          {link.count !== undefined && link.count > 0 && (
            <span className="text-[10px] opacity-50">{link.count}</span>
          )}
        </Link>
      ))}

      {toolkitLinks[0].subtitle && (
        <p className="px-8 -mt-1 text-[10px] text-muted-foreground">{toolkitLinks[0].subtitle}</p>
      )}
    </div>
  );
}

// ── Workspace Selector ──────────────────────────────────────────

function WorkspaceSelector({
  workspaces,
  currentWorkspace,
  workspaceId,
  onCreateWorkspace,
  onDeleteWorkspace,
}: {
  workspaces: Array<{ id: string; name: string }> | undefined;
  currentWorkspace: { id: string; name: string } | undefined;
  workspaceId: string | undefined;
  onCreateWorkspace: () => void;
  onDeleteWorkspace: () => void;
}) {
  const router = useRouter();

  return (
    <DropdownMenu
      trigger={
        <div className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/50 transition-colors min-w-0 flex-1">
          {currentWorkspace ? (
            <>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-semibold">
                {currentWorkspace.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold truncate">{currentWorkspace.name}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </>
          ) : (
            <span className="text-sm font-semibold">Symbix</span>
          )}
        </div>
      }
    >
      {workspaces && workspaces.length > 0 && (
        <>
          <p className="px-2 py-1 text-xs text-muted-foreground">Switch workspace</p>
          {workspaces.map((w) => (
            <DropdownMenuItem key={w.id} onClick={() => router.push(`/workspaces/${w.id}`)}
              className={cn(w.id === workspaceId && 'bg-accent')}>
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-[10px] font-semibold mr-2">
                {w.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{w.name}</span>
            </DropdownMenuItem>
          ))}
          <div className="my-1 h-px bg-border" />
        </>
      )}
      <DropdownMenuItem onClick={onCreateWorkspace}>+ Create workspace</DropdownMenuItem>
      <DropdownMenuItem onClick={() => router.push('/workspaces')}>All workspaces</DropdownMenuItem>
      {currentWorkspace && (
        <>
          <div className="my-1 h-px bg-border" />
          <DropdownMenuItem className="text-red-400 hover:text-red-300" onClick={onDeleteWorkspace}>
            Delete workspace
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenu>
  );
}

// ── Main Sidebar ────────────────────────────────────────────────

export function Sidebar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const paramWorkspaceId = params.workspaceId as string | undefined;

  // Persist last workspace so Toolkit tab can switch back to it
  const [lastWorkspaceId, setLastWorkspaceId] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    return localStorage.getItem('symbix:lastWorkspaceId') ?? undefined;
  });

  const workspaceId = paramWorkspaceId ?? lastWorkspaceId;

  // Save to localStorage whenever we're on a workspace route
  useEffect(() => {
    if (paramWorkspaceId) {
      setLastWorkspaceId(paramWorkspaceId);
      localStorage.setItem('symbix:lastWorkspaceId', paramWorkspaceId);
    }
  }, [paramWorkspaceId]);

  // Sync sidebar tab with URL
  const isToolkitPath = pathname.startsWith('/toolkit') || pathname.startsWith('/personal');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>(isToolkitPath ? 'toolkit' : 'workspace');

  useEffect(() => {
    if (isToolkitPath && sidebarTab !== 'toolkit') setSidebarTab('toolkit');
    else if (!isToolkitPath && sidebarTab !== 'workspace') setSidebarTab('workspace');
  }, [pathname, isToolkitPath]);

  // When clicking Workspace tab, navigate to last workspace if not already there
  const handleWorkspaceTab = useCallback(() => {
    setSidebarTab('workspace');
    if (isToolkitPath && workspaceId) {
      router.push(`/workspaces/${workspaceId}`);
    }
  }, [isToolkitPath, workspaceId, router]);

  // When clicking Toolkit tab, navigate to toolkit if not already there
  const handleToolkitTab = useCallback(() => {
    setSidebarTab('toolkit');
    if (!isToolkitPath) {
      router.push('/toolkit/specs');
    }
  }, [isToolkitPath, router]);

  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [addMachineOpen, setAddMachineOpen] = useState(false);
  const [spawnAgentOpen, setSpawnAgentOpen] = useState(false);

  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const utils = trpc.useUtils();

  const deleteWorkspace = trpc.workspaces.delete.useMutation({
    onSuccess: () => {
      utils.workspaces.list.invalidate();
      router.push('/workspaces');
    },
  });

  // Also set lastWorkspaceId from first workspace if we don't have one yet
  useEffect(() => {
    if (!lastWorkspaceId && workspaces && workspaces.length > 0) {
      const first = workspaces[0].id;
      setLastWorkspaceId(first);
      localStorage.setItem('symbix:lastWorkspaceId', first);
    }
  }, [workspaces, lastWorkspaceId]);

  const currentWorkspace = workspaces?.find((w) => w.id === workspaceId);

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r">
      {/* Tab toggle */}
      <div className="shrink-0 border-b px-3 pt-2 pb-1">
        <div className="flex rounded-md bg-accent/30 p-0.5">
          <button
            type="button"
            onClick={handleWorkspaceTab}
            className={cn(
              'flex-1 rounded px-2 py-1 text-xs font-medium transition-colors',
              sidebarTab === 'workspace'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Workspace
          </button>
          <button
            type="button"
            onClick={handleToolkitTab}
            className={cn(
              'flex-1 rounded px-2 py-1 text-xs font-medium transition-colors',
              sidebarTab === 'toolkit'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Toolkit
          </button>
        </div>
      </div>

      {/* Workspace selector (only in workspace tab) */}
      {sidebarTab === 'workspace' && (
        <div className="flex h-12 items-center border-b px-3">
          <WorkspaceSelector
            workspaces={workspaces}
            currentWorkspace={currentWorkspace}
            workspaceId={paramWorkspaceId ?? lastWorkspaceId}
            onCreateWorkspace={() => setCreateWorkspaceOpen(true)}
            onDeleteWorkspace={() => {
              if (currentWorkspace && confirm(`Delete workspace "${currentWorkspace.name}"? All data will be lost.`)) {
                deleteWorkspace.mutate({ id: currentWorkspace.id });
              }
            }}
          />
        </div>
      )}

      {/* Scrollable content */}
      <ScrollArea className="flex-1 px-2 py-2">
        {sidebarTab === 'workspace' ? (
          workspaceId ? (
            <WorkspaceTabContent
              workspaceId={workspaceId}
              pathname={pathname}
              onCreateChannel={() => setCreateChannelOpen(true)}
              onSpawnAgent={() => setSpawnAgentOpen(true)}
            />
          ) : (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Select a workspace to see channels.
            </p>
          )
        ) : (
          <ToolkitTabContent pathname={pathname} />
        )}
      </ScrollArea>

      {/* Dialogs */}
      {workspaceId && <CreateChannelDialog workspaceId={workspaceId} open={createChannelOpen} onOpenChange={setCreateChannelOpen} />}
      {workspaceId && <SpawnAgentDialog workspaceId={workspaceId} open={spawnAgentOpen} onOpenChange={setSpawnAgentOpen} />}
      {workspaceId && <AddMachineDialog workspaceId={workspaceId} open={addMachineOpen} onOpenChange={setAddMachineOpen} />}
      <CreateWorkspaceDialog open={createWorkspaceOpen} onOpenChange={setCreateWorkspaceOpen} />

      <Separator />

      {/* User section */}
      <div className="flex items-center gap-2 p-3">
        <UserButton afterSignOutUrl="/sign-in" />
        <span className="truncate text-sm">{user?.firstName ?? user?.username ?? 'User'}</span>
      </div>
    </div>
  );
}
