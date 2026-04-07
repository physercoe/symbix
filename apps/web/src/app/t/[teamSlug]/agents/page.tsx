'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SpawnAgentDialog } from '@/components/agent/SpawnAgentDialog';
import { cn } from '@/lib/utils';

const statusDot: Record<string, string> = {
  active: 'bg-green-500',
  sleeping: 'bg-yellow-500',
  offline: 'bg-gray-500',
  error: 'bg-red-500',
  disabled: 'bg-gray-500',
  charging: 'bg-blue-500',
};

export default function TeamAgentsPage() {
  const { teamSlug } = useParams() as { teamSlug: string };
  const router = useRouter();
  const { t } = useTranslation();
  const { data: team } = trpc.teams.getBySlug.useQuery({ slug: teamSlug });
  const { data: agents, isLoading } = trpc.agents.list.useQuery(
    { teamId: team?.id ?? '' },
    { enabled: !!team },
  );
  const { data: workspaces } = trpc.workspaces.list.useQuery(
    team ? { teamId: team.id } : undefined,
    { enabled: !!team },
  );
  const utils = trpc.useUtils();

  const [spawnOpen, setSpawnOpen] = useState(false);
  const [deployAgentId, setDeployAgentId] = useState<string | null>(null);
  const [deployWorkspaceId, setDeployWorkspaceId] = useState('');

  const wakeAgent = trpc.agents.wake.useMutation({
    onSuccess: () => utils.agents.list.invalidate({ teamId: team?.id }),
  });
  const sleepAgent = trpc.agents.sleep.useMutation({
    onSuccess: () => utils.agents.list.invalidate({ teamId: team?.id }),
  });
  const deleteAgent = trpc.agents.delete.useMutation({
    onSuccess: () => utils.agents.list.invalidate({ teamId: team?.id }),
  });
  const deployAgent = trpc.agents.deploy.useMutation({
    onSuccess: () => {
      setDeployAgentId(null);
      setDeployWorkspaceId('');
    },
  });

  const statusLabel = (status: string) => t(`agents.status.${status}` as any) || status;
  const typeLabel = (agentType: string) => t(`agents.type.${agentType}` as any) || agentType;

  return (
    <div className="flex h-full overflow-auto">
      <div className="w-full max-w-4xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('agents.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('agents.agentsInTeam', { count: agents?.length ?? 0 })}
            </p>
          </div>
          <Button size="sm" onClick={() => setSpawnOpen(true)}>
            {t('agents.createAgent')}
          </Button>
        </div>

        <div className="space-y-2">
          {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          {agents?.map((agent) => (
            <div key={agent.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
              <div className={cn('h-3 w-3 rounded-full shrink-0', statusDot[agent.status] ?? 'bg-gray-500')} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/t/${teamSlug}/agents/${agent.id}`} className="text-sm font-medium truncate hover:underline">{agent.name}</Link>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {typeLabel(agent.agentType)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{agent.roleDescription || t('agents.noDescription')}</p>
              </div>
              <span className="text-xs text-muted-foreground">{statusLabel(agent.status)}</span>
              <div className="flex gap-1">
                {(agent.status === 'sleeping' || agent.status === 'offline') && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => wakeAgent.mutate({ id: agent.id })}>
                    {t('agents.wake')}
                  </Button>
                )}
                {agent.status === 'active' && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => sleepAgent.mutate({ id: agent.id })}>
                    {t('agents.sleep')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setDeployAgentId(deployAgentId === agent.id ? null : agent.id)}
                >
                  {t('agents.deploy')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-red-400"
                  onClick={() => {
                    if (confirm(t('agents.deleteConfirm', { name: agent.name }))) deleteAgent.mutate({ id: agent.id });
                  }}
                >
                  {t('common.delete')}
                </Button>
              </div>

              {/* Deploy inline form */}
              {deployAgentId === agent.id && workspaces && workspaces.length > 0 && (
                <div className="flex gap-2 items-center">
                  <select
                    value={deployWorkspaceId}
                    onChange={(e) => setDeployWorkspaceId(e.target.value)}
                    className="h-7 rounded border border-input bg-background px-2 text-xs"
                  >
                    <option value="">{t('agents.selectWorkspace')}</option>
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={!deployWorkspaceId || deployAgent.isPending}
                    onClick={() => deployAgent.mutate({ agentId: agent.id, workspaceId: deployWorkspaceId })}
                  >
                    {deployAgent.isPending ? '...' : t('agents.deploy')}
                  </Button>
                </div>
              )}
            </div>
          ))}
          {agents && agents.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">{t('agents.noAgents')}</p>
              <Button size="sm" onClick={() => setSpawnOpen(true)}>{t('agents.createFirst')}</Button>
            </div>
          )}
        </div>
      </div>

      {team && (
        <SpawnAgentDialog
          workspaceId=""
          teamId={team.id}
          open={spawnOpen}
          onOpenChange={setSpawnOpen}
        />
      )}
    </div>
  );
}
