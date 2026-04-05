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
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
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
    onSuccess: () => {
      utils.channels.listMembers.invalidate({ channelId });
    },
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

  // Build sender name lookup: agentId -> agent name
  const senderNames = useMemo(() => {
    const map = new Map<string, string>();
    if (allAgents) {
      for (const agent of allAgents) {
        map.set(agent.id, agent.name);
      }
    }
    return map;
  }, [allAgents]);

  // Build streaming entries for current channel
  const streamingEntries = useMemo(() => {
    const entries: Array<{ agentId: string; name: string; content: string }> = [];
    for (const [agentId, data] of Object.entries(streaming)) {
      if (data.channelId === channelId && data.content) {
        const agent = allAgents?.find((a) => a.id === agentId);
        entries.push({
          agentId,
          name: agent?.name ?? agentId.slice(0, 8),
          content: data.content,
        });
      }
    }
    return entries;
  }, [streaming, channelId, allAgents]);

  // Sync fetched messages to store (only initial load)
  useEffect(() => {
    if (data?.messages) {
      setMessages(channelId, [...data.messages].reverse());
    }
  }, [data, channelId, setMessages]);

  // Subscribe to channel WS on mount
  useEffect(() => {
    wsManager.subscribe(channelId);
    return () => {
      wsManager.unsubscribe(channelId);
    };
  }, [channelId]);

  return (
    <div className="flex h-full flex-col">
      {/* Channel header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center min-w-0">
          <span className="text-muted-foreground mr-2">{isDM ? '@' : '#'}</span>
          {editingName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editName.trim()) {
                  updateChannel.mutate({ id: channelId, name: editName.trim() });
                }
              }}
              className="flex items-center gap-1"
            >
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-7 w-40 rounded border border-input bg-background px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setEditingName(false);
                }}
              />
              <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
                Save
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingName(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <h2 className="font-semibold">{channel?.name ?? 'Loading...'}</h2>
          )}
          {!editingName && channel?.description && (
            <span className="ml-3 text-sm text-muted-foreground truncate hidden sm:inline">
              {channel.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Info panel toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setInfoPanelOpen(!infoPanelOpen)}
            title="Channel info"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </Button>

          {/* Channel settings dropdown */}
          {!isDM && (
            <DropdownMenu
              trigger={
                <Button variant="ghost" size="sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                  </svg>
                </Button>
              }
            >
              <DropdownMenuItem
                onClick={() => {
                  setEditName(channel?.name ?? '');
                  setEditingName(true);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Rename channel
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-400 hover:text-red-300"
                onClick={() => {
                  if (confirm(`Delete #${channel?.name}? All messages will be lost.`)) {
                    deleteChannel.mutate({ id: channelId });
                  }
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete channel
              </DropdownMenuItem>
            </DropdownMenu>
          )}

          <Popover
            open={membersOpen}
            onOpenChange={setMembersOpen}
            align="right"
            trigger={
              <Button variant="ghost" size="sm" className="gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
                    <div
                      key={agent.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50 group"
                    >
                      <div className={cn('h-2 w-2 rounded-full shrink-0', statusDotColor[agent.status] ?? 'bg-gray-500')} />
                      <span className="truncate">{agent.name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        {agent.agentType === 'hosted_bot' ? 'Bot' : agent.agentType}
                      </Badge>
                      {!isDM && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove ${agent.name} from this channel?`)) {
                              removeMember.mutate({ channelId, memberId: agent.memberId });
                            }
                          }}
                          className="ml-auto text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from channel"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
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
                    <div
                      key={member.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                    >
                      <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                      <span className="truncate">{member.userId?.slice(0, 8)}</span>
                    </div>
                  ))}
                </div>
              )}

              {!isDM && (
                <>
                  <Separator />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setMembersOpen(false);
                      setAddAgentOpen(true);
                    }}
                  >
                    + Add Agent
                  </Button>
                </>
              )}
            </div>
          </Popover>
        </div>
        {!isDM && (
          <AddAgentToChannelDialog
            workspaceId={workspaceId}
            channelId={channelId}
            open={addAgentOpen}
            onOpenChange={setAddAgentOpen}
          />
        )}
      </div>

      {/* Main content area: messages + optional info panel */}
      <div className="flex flex-1 min-h-0">
        <div className="flex flex-1 flex-col min-w-0">
          {/* Messages + inline streaming */}
          <MessageList
            messages={messages}
            isLoading={isLoading}
            senderNames={senderNames}
            streaming={streamingEntries}
          />

          {/* Input */}
          <MessageInput channelId={channelId} workspaceId={workspaceId} />
        </div>

        {/* Info panel */}
        {infoPanelOpen && (
          <ChannelInfoPanel
            workspaceId={workspaceId}
            channelId={channelId}
            channel={channel}
            messages={messages}
            onClose={() => setInfoPanelOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
