'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/lib/i18n';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  workspaceId: string;
  channelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAgentToChannelDialog({ workspaceId, channelId, open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: agents } = trpc.agents.list.useQuery({ workspaceId });
  const { data: members } = trpc.channels.listMembers.useQuery({ channelId });

  const existingAgentIds = new Set(
    members?.filter((m) => m.memberType === 'agent').map((m) => m.agentId) ?? [],
  );
  const availableAgents = agents?.filter((a) => !existingAgentIds.has(a.id)) ?? [];

  const addMember = trpc.channels.addMember.useMutation({
    onSuccess: () => {
      utils.channels.listMembers.invalidate({ channelId });
      onOpenChange(false);
      setSelectedAgentId(null);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{t('channel.addAgentTitle' as any)}</DialogTitle>
        <DialogDescription>
          {t('channel.addAgentDesc' as any)}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {availableAgents.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            {agents?.length === 0
              ? t('channel.noAgentsToAdd' as any)
              : t('channel.allAgentsAdded' as any)}
          </p>
        )}
        {availableAgents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            onClick={() => setSelectedAgentId(agent.id === selectedAgentId ? null : agent.id)}
            className={cn(
              'w-full flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
              selectedAgentId === agent.id
                ? 'border-primary bg-primary/10'
                : 'border-input hover:bg-accent/50',
            )}
          >
            <div className="h-2 w-2 rounded-full bg-violet-500 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium truncate">{agent.name}</p>
              {agent.roleDescription && (
                <p className="text-xs text-muted-foreground truncate">{agent.roleDescription}</p>
              )}
            </div>
          </button>
        ))}
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          {t('common.cancel' as any)}
        </Button>
        <Button
          type="button"
          disabled={!selectedAgentId || addMember.isPending}
          onClick={() => {
            if (selectedAgentId) {
              addMember.mutate({
                channelId,
                memberType: 'agent',
                agentId: selectedAgentId,
              });
            }
          }}
        >
          {addMember.isPending ? t('common.adding' as any) : t('channel.addToChannel' as any)}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
