'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/lib/i18n';
import { AgentPanel } from '@/components/agent/AgentPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusDot: Record<string, string> = {
  active: 'bg-green-500',
  sleeping: 'bg-yellow-500',
  offline: 'bg-gray-500',
  error: 'bg-red-500',
};

export default function AgentDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.teamSlug as string;
  const agentId = params.agentId as string;

  const { data: agent, isLoading } = trpc.agents.getById.useQuery({ id: agentId });
  const { data: overview } = trpc.metrics.agentOverview.useQuery(
    { agentId },
    { enabled: !!agentId },
  );
  const { data: toolUsage } = trpc.metrics.agentToolUsage.useQuery(
    { agentId },
    { enabled: !!agentId },
  );

  if (isLoading) {
    return (
      <div className="h-full overflow-auto p-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        {t('agents.notFound' as any)}
      </div>
    );
  }

  const maxToolCount = toolUsage && toolUsage.length > 0
    ? Math.max(...toolUsage.map((t) => t.count))
    : 1;

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-4xl space-y-8">
        {/* Agent panel (info + edit) */}
        <div className="max-w-lg">
          <AgentPanel
            agent={agent as Parameters<typeof AgentPanel>[0]['agent']}
            onClose={() => router.push(`/t/${teamSlug}/agents`)}
          />
        </div>

        {/* Metrics section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">{t('agents.metrics30d' as any)}</h2>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <MetricCard label={t('agents.messages' as any)} value={overview?.messages30d ?? 0} />
            <MetricCard label={t('agents.responses' as any)} value={overview?.responses30d ?? 0} />
            <MetricCard label={t('agents.toolCalls' as any)} value={overview?.toolCalls30d ?? 0} />
            <MetricCard
              label={t('agents.avgLatency' as any)}
              value={overview?.avgLatencyMs != null ? `${(overview.avgLatencyMs / 1000).toFixed(1)}s` : '—'}
            />
          </div>

          {/* Tool usage breakdown */}
          {toolUsage && toolUsage.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t('agents.toolUsage' as any)}
              </h3>
              <div className="space-y-2">
                {toolUsage.map((tool) => {
                  const widthPct = Math.max((tool.count / maxToolCount) * 100, 3);
                  return (
                    <div key={tool.toolName} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-40 truncate shrink-0">
                        {tool.toolName ?? t('common.unknown' as any)}
                      </span>
                      <div className="flex-1 h-6 bg-accent/30 rounded overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded transition-all"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{tool.count}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Empty state */}
          {overview && overview.messages30d === 0 && overview.toolCalls30d === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">{t('dashboard.noActivity30d' as any)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );
}
