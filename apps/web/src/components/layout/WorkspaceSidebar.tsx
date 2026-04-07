'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
import { trpc } from '@/lib/trpc';
import { useTranslation, useLocaleStore } from '@/lib/i18n';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { CreateChannelDialog } from '@/components/channel/CreateChannelDialog';
import { SpawnAgentDialog } from '@/components/agent/SpawnAgentDialog';

function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function SectionHeader({ label, onAdd, addTitle }: { label: string; onAdd?: () => void; addTitle?: string }) {
  return (
    <div className="flex items-center justify-between px-2 py-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      {onAdd && (
        <button type="button" onClick={onAdd} className="text-muted-foreground hover:text-foreground transition-colors" title={addTitle ?? ''}>
          <PlusIcon />
        </button>
      )}
    </div>
  );
}

function ChannelIcon({ type }: { type: string }) {
  if (type === 'dm') return <span className="text-muted-foreground">@</span>;
  return <span className="text-muted-foreground">#</span>;
}

const agentStatusDot: Record<string, string> = {
  active: 'bg-green-500',
  sleeping: 'bg-yellow-500',
  offline: 'bg-gray-500',
  error: 'bg-red-500',
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function GlobeIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
}

export function WorkspaceSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { t } = useTranslation();
  const { locale, setLocale } = useLocaleStore();
  const teamSlug = params.teamSlug as string;
  const workspaceId = params.workspaceId as string;

  const { data: workspace } = trpc.workspaces.getById.useQuery({ id: workspaceId }, { enabled: !!workspaceId });
  const { data: channels } = trpc.channels.list.useQuery({ workspaceId }, { enabled: !!workspaceId });
  const { data: agents } = trpc.agents.list.useQuery({ workspaceId }, { enabled: !!workspaceId });
  const { data: members } = trpc.workspaces.listMembers.useQuery({ workspaceId }, { enabled: !!workspaceId });
  const utils = trpc.useUtils();

  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [spawnAgentOpen, setSpawnAgentOpen] = useState(false);

  const base = `/t/${teamSlug}/workspaces/${workspaceId}`;

  const publicChannels = channels?.filter((c) => c.type === 'public') ?? [];
  const privateChannels = channels?.filter((c) => c.type === 'private') ?? [];
  const dmChannels = channels?.filter((c) => c.type === 'dm') ?? [];
  const deviceChannels = channels?.filter((c) => c.type === 'device') ?? [];
  const userMembers = members?.filter((m) => m.memberType === 'user') ?? [];

  const openDM = trpc.channels.openDM.useMutation({
    onSuccess: (channel) => {
      utils.channels.list.invalidate({ workspaceId });
      router.push(`${base}/channels/${channel.id}`);
    },
  });
  const openUserDM = trpc.channels.openUserDM.useMutation({
    onSuccess: (channel) => {
      utils.channels.list.invalidate({ workspaceId });
      router.push(`${base}/channels/${channel.id}`);
    },
  });
  const deleteChannel = trpc.channels.delete.useMutation({
    onSuccess: () => {
      utils.channels.list.invalidate({ workspaceId });
      router.push(base);
    },
  });
  const wakeAgent = trpc.agents.wake.useMutation({ onSuccess: () => utils.agents.list.invalidate({ workspaceId }) });
  const sleepAgent = trpc.agents.sleep.useMutation({ onSuccess: () => utils.agents.list.invalidate({ workspaceId }) });

  const agentTypeLabel: Record<string, string> = {
    hosted_bot: t('agents.type.bot'),
    cli_agent: t('agents.type.cli'),
    cloud_agent: t('agents.type.cloud_agent'),
    device_agent: t('agents.type.device_agent'),
  };

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="flex h-full w-[260px] flex-col bg-sidebar text-sidebar-foreground border-r">
      {/* Back to team + workspace name */}
      <div className="shrink-0 border-b px-3 py-2.5">
        <Link
          href={`/t/${teamSlug}`}
          className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors mb-1.5"
        >
          <BackIcon />
          <span>{t('nav.backToTeam')}</span>
        </Link>
        <p className="text-[15px] font-semibold tracking-tight truncate">{workspace?.name ?? t('workspace.workspace')}</p>
      </div>

      <ScrollArea className="flex-1 px-2 py-2">
        {/* Channels */}
        <ChannelGroup
          label={t('nav.channels')}
          channels={publicChannels}
          base={base}
          pathname={pathname}
          onCreateChannel={() => setCreateChannelOpen(true)}
          onDelete={(id, name) => { if (confirm(t('channel.deleteConfirm', { name }))) deleteChannel.mutate({ id }); }}
          t={t}
        />
        {privateChannels.length > 0 && (
          <ChannelGroup label={t('nav.private')} channels={privateChannels} base={base} pathname={pathname} onDelete={(id, name) => { if (confirm(t('channel.deleteConfirm', { name }))) deleteChannel.mutate({ id }); }} t={t} />
        )}
        {dmChannels.length > 0 && (
          <ChannelGroup label={t('nav.directMessages')} channels={dmChannels} base={base} pathname={pathname} t={t} />
        )}
        {deviceChannels.length > 0 && (
          <ChannelGroup label={t('nav.devices')} channels={deviceChannels} base={base} pathname={pathname} t={t} />
        )}

        <Separator className="my-2" />

        {/* Knowledge */}
        <Link
          href={`${base}/knowledge`}
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            pathname.includes('/knowledge') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          {t('nav.knowledge')}
        </Link>

        {/* Members */}
        <Link
          href={`${base}/members`}
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            pathname.includes('/members') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          </svg>
          {t('nav.members')}
        </Link>

        {/* Metrics */}
        <Link
          href={`${base}/metrics`}
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            pathname.includes('/metrics') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
          </svg>
          {t('nav.metrics')}
        </Link>

        <Separator className="my-2" />

        {/* Agents in workspace */}
        <SectionHeader label={t('nav.agents')} onAdd={() => setSpawnAgentOpen(true)} addTitle={t('agents.deployAgent')} />
        {agents?.map((agent) => (
          <ContextMenu
            key={agent.id}
            menu={
              <>
                <ContextMenuItem onClick={() => openDM.mutate({ workspaceId, agentId: agent.id })}>{t('agents.message')}</ContextMenuItem>
                <ContextMenuItem onClick={() => copyToClipboard(agent.id)}>{t('agents.copyId')}</ContextMenuItem>
                <ContextMenuSeparator />
                {(agent.status === 'sleeping' || agent.status === 'offline') && (
                  <ContextMenuItem onClick={() => wakeAgent.mutate({ id: agent.id })}>{t('agents.wake')}</ContextMenuItem>
                )}
                {agent.status === 'active' && (
                  <ContextMenuItem onClick={() => sleepAgent.mutate({ id: agent.id })}>{t('agents.sleep')}</ContextMenuItem>
                )}
              </>
            }
          >
            <div className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground ml-1">
              <div className={cn('h-2 w-2 rounded-full shrink-0', agentStatusDot[agent.status] ?? 'bg-gray-500')} />
              <button
                type="button"
                onClick={() => openDM.mutate({ workspaceId, agentId: agent.id })}
                className="truncate hover:text-foreground transition-colors text-left text-xs"
              >
                {agent.name}
              </button>
              <span className="text-[10px] opacity-50">{agentTypeLabel[agent.agentType] ?? agent.agentType}</span>
            </div>
          </ContextMenu>
        ))}

        {/* People */}
        <div className="mt-1">
          <SectionHeader label={t('nav.people')} />
          {userMembers.map((member) => (
            <div key={member.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground ml-1">
              <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
              <button
                type="button"
                onClick={() => member.userId && openUserDM.mutate({ workspaceId, targetUserId: member.userId })}
                className="truncate hover:text-foreground transition-colors text-left text-xs"
              >
                {member.userName ?? t('common.user')}
              </button>
              {member.role === 'owner' && <span className="ml-auto text-[10px] opacity-50">{t('members.owner')}</span>}
            </div>
          ))}
        </div>

        <Separator className="my-2" />

        {/* Settings */}
        <Link
          href={`${base}/settings`}
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            pathname.endsWith('/settings') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          {t('nav.settings')}
        </Link>
      </ScrollArea>

      {/* Dialogs */}
      {workspaceId && <CreateChannelDialog workspaceId={workspaceId} open={createChannelOpen} onOpenChange={setCreateChannelOpen} />}
      {workspaceId && <SpawnAgentDialog workspaceId={workspaceId} open={spawnAgentOpen} onOpenChange={setSpawnAgentOpen} />}

      <Separator />

      {/* User + Language */}
      <div className="flex items-center gap-2 p-3">
        <UserButton afterSignOutUrl="/sign-in" />
        <span className="truncate text-sm flex-1">{user?.firstName ?? user?.username ?? t('common.user')}</span>
        <button
          type="button"
          onClick={toggleLocale}
          title={t('settings.language')}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
        >
          <GlobeIcon />
          <span>{locale === 'en' ? 'EN' : '中'}</span>
        </button>
      </div>
    </div>
  );
}

// ── Channel Group ─────────────────────────────────────────────────

function ChannelGroup({
  label,
  channels,
  base,
  pathname,
  onCreateChannel,
  onDelete,
  t,
}: {
  label: string;
  channels: Array<{ id: string; name: string; type: string }>;
  base: string;
  pathname: string;
  onCreateChannel?: () => void;
  onDelete?: (id: string, name: string) => void;
  t: (key: any, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className="mt-2">
      <SectionHeader label={label} onAdd={onCreateChannel} addTitle={t('channel.createChannel')} />
      {channels.map((channel) => {
        const href = `${base}/channels/${channel.id}`;
        const isActive = pathname === href;
        const isDM = channel.type === 'dm';

        const menu = isDM ? (
          <ContextMenuItem onClick={() => copyToClipboard(channel.id)}>{t('channel.copyId')}</ContextMenuItem>
        ) : (
          <>
            <ContextMenuItem onClick={() => copyToClipboard(channel.id)}>{t('channel.copyId')}</ContextMenuItem>
            {onDelete && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem className="text-red-400" onClick={() => onDelete(channel.id, channel.name)}>
                  {t('channel.deleteChannel')}
                </ContextMenuItem>
              </>
            )}
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
      {channels.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">{t('common.none')}</p>}
    </div>
  );
}
