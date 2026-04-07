'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/lib/i18n';
import { wsManager } from '@/lib/ws';
import { useMessageStore } from '@/stores/message-store';
import { useAgentStore } from '@/stores/agent-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { AddAgentToChannelDialog } from '@/components/channel/AddAgentToChannelDialog';
import { ChannelPinnedView } from '@/components/channel/ChannelPinnedView';
import { ChannelFilesView } from '@/components/channel/ChannelFilesView';
import { ChannelTasksView } from '@/components/channel/ChannelTasksView';
import { ChannelDocsView } from '@/components/channel/ChannelDocsView';
import { ChannelLinksView } from '@/components/channel/ChannelLinksView';
import { ChannelInfoView } from '@/components/channel/ChannelInfoView';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

const EMPTY_MESSAGES: never[] = [];

interface Props {
  workspaceId: string;
  channelId: string;
}

type ChannelTab = 'chat' | 'tasks' | 'docs' | 'files' | 'links' | 'pinned';
type ChannelView = ChannelTab | 'info';

const TAB_KEYS: { id: ChannelTab; key: 'chat.tabs.chat' | 'chat.tabs.tasks' | 'chat.tabs.docs' | 'chat.tabs.files' | 'chat.tabs.links' | 'chat.tabs.pinned' }[] = [
  { id: 'chat', key: 'chat.tabs.chat' },
  { id: 'tasks', key: 'chat.tabs.tasks' },
  { id: 'docs', key: 'chat.tabs.docs' },
  { id: 'files', key: 'chat.tabs.files' },
  { id: 'links', key: 'chat.tabs.links' },
  { id: 'pinned', key: 'chat.tabs.pinned' },
];

const statusDotColor: Record<string, string> = {
  active: 'bg-green-500',
  sleeping: 'bg-yellow-500',
  offline: 'bg-gray-500',
  error: 'bg-red-500',
  disabled: 'bg-gray-500',
};

export function ChatView({ workspaceId, channelId }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ChannelView>('chat');
  const [replyTo, setReplyTo] = useState<{ id: string; content: string | null; senderName: string } | null>(null);
  const { data: channel } = trpc.channels.getById.useQuery({ id: channelId });
  const { data, isLoading } = trpc.messages.list.useQuery({ channelId, limit: 50 });
  const { data: members } = trpc.channels.listMembers.useQuery({ channelId });
  const { data: allAgents } = trpc.agents.list.useQuery({ workspaceId });
  const setMessages = useMessageStore((s) => s.setMessages);
  const messages = useMessageStore((s) => s.messages.get(channelId)) ?? EMPTY_MESSAGES;
  const streaming = useAgentStore((s) => s.streaming);
  const utils = trpc.useUtils();

  const isDM = channel?.type === 'dm';

  const removeMember = trpc.channels.removeMember.useMutation({
    onSuccess: () => utils.channels.listMembers.invalidate({ channelId }),
  });

  const updateChannel = trpc.channels.update.useMutation({
    onSuccess: () => {
      utils.channels.getById.invalidate({ id: channelId });
      utils.channels.list.invalidate({ workspaceId });
    },
  });

  const deleteChannel = trpc.channels.delete.useMutation({
    onSuccess: () => {
      utils.channels.list.invalidate({ workspaceId });
      router.push(`/workspaces/${workspaceId}`);
    },
  });

  const agentMembers = (members ?? [])
    .filter((m) => m.memberType === 'agent' && m.agentId)
    .map((m) => {
      const agent = allAgents?.find((a) => a.id === m.agentId);
      return agent ? { ...agent, memberId: m.id } : null;
    })
    .filter(Boolean) as Array<{ id: string; name: string; status: string; agentType: string; memberId: string }>;

  const userMembers = (members ?? []).filter((m) => m.memberType === 'user');
  const totalMembers = (members ?? []).length;

  const senderNames = useMemo(() => {
    const map = new Map<string, string>();
    if (allAgents) for (const agent of allAgents) map.set(agent.id, agent.name);
    return map;
  }, [allAgents]);

  const streamingEntries = useMemo(() => {
    const entries: Array<{ agentId: string; name: string; content: string }> = [];
    for (const [agentId, data] of Object.entries(streaming)) {
      if (data.channelId === channelId && data.content) {
        const agent = allAgents?.find((a) => a.id === agentId);
        entries.push({ agentId, name: agent?.name ?? agentId.slice(0, 8), content: data.content });
      }
    }
    return entries;
  }, [streaming, channelId, allAgents]);

  useEffect(() => {
    if (data?.messages) setMessages(channelId, [...data.messages].reverse());
  }, [data, channelId, setMessages]);

  useEffect(() => {
    wsManager.subscribe(channelId);
    return () => { wsManager.unsubscribe(channelId); };
  }, [channelId]);

  // Reset state when switching channels
  useEffect(() => { setReplyTo(null); setActiveTab('chat'); }, [channelId]);

  return (
    <div className="flex h-full flex-col">
      {/* ── Header row ── */}
      <div className="shrink-0 border-b">
        <div className="flex h-12 items-center justify-between px-4">
          {/* Channel name */}
          <div className="flex items-center min-w-0">
            <span className="text-muted-foreground mr-2">{isDM ? '@' : '#'}</span>
            <h2 className="font-semibold text-sm">{channel?.name ?? t('common.loading')}</h2>
            {channel?.description && (
              <span className="ml-3 text-xs text-muted-foreground truncate hidden sm:inline">{channel.description}</span>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {!isDM && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={t('channel.info')}
                onClick={() => setActiveTab('info')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </Button>
            )}

            <Popover open={membersOpen} onOpenChange={setMembersOpen} align="right"
              trigger={
                <Button variant="ghost" size="sm" className="gap-1 h-8 px-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="text-xs">{totalMembers}</span>
                </Button>
              }>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{isDM ? t('channel.conversation') : t('channel.channelMembers')}</p>
                  <span className="text-xs text-muted-foreground">{totalMembers}</span>
                </div>
                {agentMembers.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('nav.agents')}</p>
                    {agentMembers.map((agent) => (
                      <div key={agent.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50 group">
                        <div className={cn('h-2 w-2 rounded-full shrink-0', statusDotColor[agent.status] ?? 'bg-gray-500')} />
                        <span className="truncate">{agent.name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">{agent.agentType === 'hosted_bot' ? t('agents.type.bot') : agent.agentType}</Badge>
                        {!isDM && (
                          <button type="button" onClick={() => { if (confirm(t('members.removeConfirm', { name: agent.name }))) removeMember.mutate({ channelId, memberId: agent.memberId }); }}
                            className="ml-auto text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {userMembers.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('chat.users')}</p>
                    {userMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                        <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                        <span className="truncate">{member.userId?.slice(0, 8)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!isDM && (
                  <><Separator /><Button variant="outline" size="sm" className="w-full" onClick={() => { setMembersOpen(false); setAddAgentOpen(true); }}>{t('channel.addAgent')}</Button></>
                )}
              </div>
            </Popover>
          </div>
        </div>

        {/* ── Tab bar (channels only, not DMs) ── */}
        {!isDM && (
          <div className="flex items-center gap-0.5 px-4 pb-1 overflow-x-auto">
            {TAB_KEYS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-1 text-xs rounded-md transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                )}
              >
                {t(tab.key)}
              </button>
            ))}
          </div>
        )}
      </div>

      {!isDM && (
        <AddAgentToChannelDialog workspaceId={workspaceId} channelId={channelId} open={addAgentOpen} onOpenChange={setAddAgentOpen} />
      )}

      {/* ── Main content area ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        {isDM || activeTab === 'chat' ? (
          <>
            <MessageList messages={messages} isLoading={isLoading} senderNames={senderNames} streaming={streamingEntries} onReply={setReplyTo} />
            <MessageInput channelId={channelId} workspaceId={workspaceId} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
          </>
        ) : activeTab === 'pinned' ? (
          <ChannelPinnedView channelId={channelId} />
        ) : activeTab === 'files' ? (
          <ChannelFilesView channelId={channelId} messages={messages} />
        ) : activeTab === 'tasks' ? (
          <ChannelTasksView channelId={channelId} />
        ) : activeTab === 'docs' ? (
          <ChannelDocsView channelId={channelId} />
        ) : activeTab === 'links' ? (
          <ChannelLinksView channelId={channelId} />
        ) : activeTab === 'info' ? (
          <ChannelInfoView
            channelId={channelId}
            channel={channel}
            onRename={(name) => updateChannel.mutate({ id: channelId, name })}
            onDelete={() => deleteChannel.mutate({ id: channelId })}
          />
        ) : null}
      </div>
    </div>
  );
}
