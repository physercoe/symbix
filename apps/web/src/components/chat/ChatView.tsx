'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { wsManager } from '@/lib/ws';
import { useMessageStore } from '@/stores/message-store';
import { useAgentStore } from '@/stores/agent-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { AddAgentToChannelDialog } from '@/components/channel/AddAgentToChannelDialog';
import { ChannelInfoPanel } from '@/components/channel/ChannelInfoPanel';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

const EMPTY_MESSAGES: never[] = [];

interface Props {
  workspaceId: string;
  channelId: string;
}

type PanelTab = 'pinned' | 'files' | 'tasks' | 'docs' | 'links' | 'info' | null;

const statusDotColor: Record<string, string> = {
  active: 'bg-green-500',
  sleeping: 'bg-yellow-500',
  offline: 'bg-gray-500',
  error: 'bg-red-500',
  disabled: 'bg-gray-500',
};

export function ChatView({ workspaceId, channelId }: Props) {
  const router = useRouter();
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelTab>(null);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
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
      setEditingName(false);
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
    if (allAgents) {
      for (const agent of allAgents) map.set(agent.id, agent.name);
    }
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

  // Reset reply when switching channels
  useEffect(() => { setReplyTo(null); }, [channelId]);

  const togglePanel = (tab: PanelTab) => {
    setActivePanel((prev) => prev === tab ? null : tab);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Channel header */}
      <div className="shrink-0 border-b">
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center min-w-0">
            <span className="text-muted-foreground mr-2">{isDM ? '@' : '#'}</span>
            {editingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editName.trim()) updateChannel.mutate({ id: channelId, name: editName.trim() });
                }}
                className="flex items-center gap-1"
              >
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 w-40 rounded border border-input bg-background px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onKeyDown={(e) => { if (e.key === 'Escape') setEditingName(false); }}
                />
                <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">Save</Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingName(false)}>Cancel</Button>
              </form>
            ) : (
              <h2 className="font-semibold text-sm">{channel?.name ?? 'Loading...'}</h2>
            )}
            {!editingName && channel?.description && (
              <span className="ml-3 text-xs text-muted-foreground truncate hidden sm:inline">{channel.description}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Channel settings dropdown */}
            {!isDM && (
              <DropdownMenu
                trigger={
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                    </svg>
                  </Button>
                }
              >
                <DropdownMenuItem onClick={() => { setEditName(channel?.name ?? ''); setEditingName(true); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Rename channel
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-400 hover:text-red-300"
                  onClick={() => { if (confirm(`Delete #${channel?.name}? All messages will be lost.`)) deleteChannel.mutate({ id: channelId }); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete channel
                </DropdownMenuItem>
              </DropdownMenu>
            )}

            {/* Members popover */}
            <Popover
              open={membersOpen}
              onOpenChange={setMembersOpen}
              align="right"
              trigger={
                <Button variant="ghost" size="sm" className="gap-1 h-8 px-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="text-xs">{totalMembers}</span>
                </Button>
              }
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{isDM ? 'Conversation' : 'Channel Members'}</p>
                  <span className="text-xs text-muted-foreground">{totalMembers}</span>
                </div>
                {agentMembers.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Agents</p>
                    {agentMembers.map((agent) => (
                      <div key={agent.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50 group">
                        <div className={cn('h-2 w-2 rounded-full shrink-0', statusDotColor[agent.status] ?? 'bg-gray-500')} />
                        <span className="truncate">{agent.name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">{agent.agentType === 'hosted_bot' ? 'Bot' : agent.agentType}</Badge>
                        {!isDM && (
                          <button
                            type="button"
                            onClick={() => { if (confirm(`Remove ${agent.name}?`)) removeMember.mutate({ channelId, memberId: agent.memberId }); }}
                            className="ml-auto text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {userMembers.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Users</p>
                    {userMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                        <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                        <span className="truncate">{member.userId?.slice(0, 8)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!isDM && (
                  <>
                    <Separator />
                    <Button variant="outline" size="sm" className="w-full" onClick={() => { setMembersOpen(false); setAddAgentOpen(true); }}>
                      + Add Agent
                    </Button>
                  </>
                )}
              </div>
            </Popover>
          </div>
        </div>

        {/* Elevated tab bar for channel resources */}
        <div className="flex items-center gap-0.5 px-4 pb-1 overflow-x-auto">
          {([
            { id: 'pinned' as const, label: 'Pinned', icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
              </svg>
            )},
            { id: 'files' as const, label: 'Files', icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
            )},
            { id: 'tasks' as const, label: 'Tasks', icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            )},
            { id: 'docs' as const, label: 'Docs', icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            )},
            { id: 'links' as const, label: 'Links', icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            )},
            { id: 'info' as const, label: 'Info', icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )},
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => togglePanel(tab.id)}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors whitespace-nowrap',
                activePanel === tab.id
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {!isDM && (
        <AddAgentToChannelDialog
          workspaceId={workspaceId}
          channelId={channelId}
          open={addAgentOpen}
          onOpenChange={setAddAgentOpen}
        />
      )}

      {/* Main content area: messages + optional info panel */}
      <div className="flex flex-1 min-h-0">
        <div className="flex flex-1 flex-col min-w-0">
          <MessageList
            messages={messages}
            isLoading={isLoading}
            senderNames={senderNames}
            streaming={streamingEntries}
            onReply={setReplyTo}
          />
          <MessageInput
            channelId={channelId}
            workspaceId={workspaceId}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </div>

        {/* Side panel */}
        {activePanel && (
          <ChannelInfoPanel
            workspaceId={workspaceId}
            channelId={channelId}
            channel={channel}
            messages={messages}
            activeTab={activePanel}
            onTabChange={(tab) => setActivePanel(tab)}
            onClose={() => setActivePanel(null)}
          />
        )}
      </div>
    </div>
  );
}
