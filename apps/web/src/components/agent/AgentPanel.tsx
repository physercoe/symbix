'use client';

import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Props {
  agent: {
    id: string;
    workspaceId: string;
    name: string;
    agentType: string;
    status: string;
    roleDescription: string;
    systemPrompt: string;
    llmProvider: string;
    llmModel: string;
    machineId: string | null;
    capabilities: string[];
    createdAt: string;
  };
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  sleeping: 'bg-yellow-500/20 text-yellow-400',
  offline: 'bg-gray-500/20 text-gray-400',
  error: 'bg-red-500/20 text-red-400',
  disabled: 'bg-gray-500/20 text-gray-400',
};

export function AgentPanel({ agent, onClose }: Props) {
  const utils = trpc.useUtils();

  const wake = trpc.agents.wake.useMutation({
    onSuccess: () => utils.agents.list.invalidate({ workspaceId: agent.workspaceId }),
  });
  const sleep = trpc.agents.sleep.useMutation({
    onSuccess: () => utils.agents.list.invalidate({ workspaceId: agent.workspaceId }),
  });
  const deleteAgent = trpc.agents.delete.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate({ workspaceId: agent.workspaceId });
      onClose();
    },
  });

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{agent.name}</h4>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">
          Close
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn('text-xs', statusColors[agent.status])}>
          {agent.status}
        </Badge>
        <Badge variant="secondary" className="text-xs">{agent.agentType}</Badge>
      </div>

      {agent.roleDescription && (
        <div>
          <p className="text-xs text-muted-foreground">Role</p>
          <p className="text-sm">{agent.roleDescription}</p>
        </div>
      )}

      {agent.agentType === 'hosted_bot' && (
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Provider</span>
            <span>{agent.llmProvider}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Model</span>
            <span>{agent.llmModel}</span>
          </div>
        </div>
      )}

      <Separator />

      <div className="flex gap-2">
        {agent.status === 'sleeping' || agent.status === 'offline' ? (
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => wake.mutate({ id: agent.id })}
            disabled={wake.isPending}
          >
            {wake.isPending ? 'Waking...' : 'Wake'}
          </Button>
        ) : agent.status === 'active' ? (
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => sleep.mutate({ id: agent.id })}
            disabled={sleep.isPending}
          >
            {sleep.isPending ? 'Sleeping...' : 'Sleep'}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            if (confirm(`Delete agent "${agent.name}"?`)) {
              deleteAgent.mutate({ id: agent.id });
            }
          }}
          disabled={deleteAgent.isPending}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
