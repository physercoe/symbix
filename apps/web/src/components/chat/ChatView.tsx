'use client';

import { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { wsManager } from '@/lib/ws';
import { useMessageStore } from '@/stores/message-store';
import { useAgentStore } from '@/stores/agent-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { AddAgentToChannelDialog } from '@/components/channel/AddAgentToChannelDialog';
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
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
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
          <h2 className="font-semibold">{channel?.name ?? 'Loading...'}</h2>
          {channel?.description && (
            <span className="ml-3 text-sm text-muted-foreground truncate hidden sm:inline">
              {channel.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
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
  );
}
