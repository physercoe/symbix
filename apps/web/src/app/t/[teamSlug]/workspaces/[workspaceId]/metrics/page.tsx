'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';

export default function WorkspaceMetricsPage() {
  const { workspaceId } = useParams() as { workspaceId: string };
  const { t } = useTranslation();

  const { data: workspace } = trpc.workspaces.getById.useQuery({ id: workspaceId });
  const { data: overview, isLoading } = trpc.metrics.workspaceOverview.useQuery(
    { workspaceId },
    { enabled: !!workspaceId },
  );

  const { data: channels } = trpc.channels.list.useQuery({ workspaceId });

  return (
    <div className="flex h-full overflow-auto">
      <div className="w-full max-w-4xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">{t('workspace.metrics')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('workspace.metricsDesc', { name: workspace?.name ?? t('workspace.workspace') })}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
          ) : (
            <>
              <MetricCard label={t('nav.channels')} value={overview?.channels ?? 0} />
              <MetricCard label={t('nav.members')} value={overview?.members ?? 0} />
              <MetricCard label={t('agents.deployedAgents')} value={overview?.deployedAgents ?? 0} />
              <MetricCard label={t('dashboard.messages7d')} value={overview?.messages7d ?? 0} />
            </>
          )}
        </div>

        {channels && channels.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              {t('nav.channels')}
            </h2>
            <div className="space-y-2">
              {channels.map((ch) => (
                <div key={ch.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                  <span className="text-muted-foreground text-sm">
                    {ch.type === 'dm' ? '@' : '#'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ch.name}</p>
                    {ch.description && (
                      <p className="text-xs text-muted-foreground truncate">{ch.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">{ch.type}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {overview && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              {t('dashboard.summary')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">{t('dashboard.avgMsgPerDay')}</p>
                <p className="text-2xl font-bold mt-1">
                  {overview.messages7d > 0 ? Math.round(overview.messages7d / 7) : 0}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">{t('dashboard.agentMemberRatio')}</p>
                <p className="text-2xl font-bold mt-1">
                  {overview.members > 0
                    ? `${overview.deployedAgents}:${overview.members - overview.deployedAgents}`
                    : '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('dashboard.agentsAndHumans', { agents: overview.deployedAgents, humans: Math.max(overview.members - overview.deployedAgents, 0) })}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
    </div>
  );
}
