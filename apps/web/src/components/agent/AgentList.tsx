'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SpawnAgentDialog } from './SpawnAgentDialog';
import { AgentPanel } from './AgentPanel';

interface Props {
  workspaceId: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  sleeping: 'bg-yellow-500/20 text-yellow-400',
  offline: 'bg-gray-500/20 text-gray-400',
  error: 'bg-red-500/20 text-red-400',
  disabled: 'bg-gray-500/20 text-gray-400',
  charging: 'bg-blue-500/20 text-blue-400',
};

export function AgentList({ workspaceId }: Props) {
  const { t } = useTranslation();
  const [spawnOpen, setSpawnOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { data: agents, isLoading } = trpc.agents.list.useQuery({ workspaceId });
  const { data: machines } = trpc.machines.list.useQuery({ workspaceId });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const hostedBots = agents?.filter((a) => !a.machineId) ?? [];
  const machineGroups = new Map<string, typeof agents>();
  agents?.forEach((a) => {
    if (a.machineId) {
      const group = machineGroups.get(a.machineId) ?? [];
      group.push(a);
      machineGroups.set(a.machineId, group);
    }
  });

  const selectedAgent = agents?.find((a) => a.id === selectedAgentId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('agents.title' as any)}</h3>
        <Button size="sm" variant="outline" onClick={() => setSpawnOpen(true)}>
          {t('agents.addAgent' as any)}
        </Button>
      </div>

      {agents && agents.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t('agents.noAgentsDesc' as any)}
        </p>
      )}

      {/* Hosted bots (no machine) */}
      {hostedBots.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{t('agents.hostedBots' as any)}</p>
          <div className="space-y-1">
            {hostedBots.map((agent) => (
              <button
                key={agent.id}
                onClick={() =>
                  setSelectedAgentId(agent.id === selectedAgentId ? null : agent.id)
                }
                className={cn(
                  'w-full flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50',
                  selectedAgentId === agent.id && 'border-primary bg-accent/30',
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-violet-500" />
                  <span>{agent.name}</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn('text-[10px]', statusColors[agent.status])}
                >
                  {agent.status}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Machine-grouped agents */}
      {Array.from(machineGroups.entries()).map(([machineId, machineAgents]) => {
        const machine = machines?.find((m) => m.id === machineId);
        return (
          <div key={machineId}>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {machine?.name ?? 'Unknown machine'}
            </p>
            <div className="space-y-1">
              {machineAgents?.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() =>
                    setSelectedAgentId(agent.id === selectedAgentId ? null : agent.id)
                  }
                  className={cn(
                    'w-full flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50',
                    selectedAgentId === agent.id && 'border-primary bg-accent/30',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{agent.name}</span>
                    <span className="text-xs text-muted-foreground">{agent.agentType}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px]', statusColors[agent.status])}
                  >
                    {agent.status}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <SpawnAgentDialog workspaceId={workspaceId} open={spawnOpen} onOpenChange={setSpawnOpen} />
      {selectedAgent && (
        <AgentPanel agent={selectedAgent} onClose={() => setSelectedAgentId(null)} />
      )}
    </div>
  );
}
