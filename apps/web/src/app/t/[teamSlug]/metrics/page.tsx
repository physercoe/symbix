'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeamMetricsPage() {
  const { teamSlug } = useParams() as { teamSlug: string };
  const { data: team } = trpc.teams.getBySlug.useQuery({ slug: teamSlug });
  const { data: overview, isLoading } = trpc.metrics.teamOverview.useQuery(
    { teamId: team?.id ?? '' },
    { enabled: !!team },
  );
  const { data: activity } = trpc.metrics.teamActivity.useQuery(
    { teamId: team?.id ?? '', days: 30 },
    { enabled: !!team },
  );

  // Group activity by date for a simple bar chart
  const dailyTotals: Record<string, number> = {};
  activity?.forEach((e) => {
    dailyTotals[e.date] = (dailyTotals[e.date] ?? 0) + e.count;
  });
  const sortedDates = Object.keys(dailyTotals).sort();
  const maxCount = Math.max(...Object.values(dailyTotals), 1);

  return (
    <div className="flex h-full overflow-auto">
      <div className="w-full max-w-4xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Metrics</h1>
          <p className="text-sm text-muted-foreground mt-1">Team activity overview</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
          ) : (
            <>
              <MetricCard label="Messages (7d)" value={overview?.messages7d ?? 0} />
              <MetricCard label="Members" value={overview?.members ?? 0} />
              <MetricCard label="Workspaces" value={overview?.workspaces ?? 0} />
              <MetricCard label="Active Agents" value={overview?.agents.active ?? 0} />
              <MetricCard label="Online Machines" value={overview?.machines.online ?? 0} />
            </>
          )}
        </div>

        {/* Activity timeline bar chart */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Activity (30 days)
          </h2>
          {sortedDates.length > 0 ? (
            <div className="flex items-end gap-px h-32 rounded-lg border p-4">
              {sortedDates.map((date) => {
                const count = dailyTotals[date];
                const heightPct = Math.max((count / maxCount) * 100, 2);
                return (
                  <div key={date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <div
                      className="w-full bg-primary/70 rounded-t-sm transition-all hover:bg-primary"
                      style={{ height: `${heightPct}%` }}
                    />
                    <div className="absolute -top-6 hidden group-hover:block text-[10px] text-muted-foreground bg-popover border rounded px-1 py-0.5 whitespace-nowrap">
                      {date}: {count}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">No activity data yet</p>
            </div>
          )}
        </section>

        {/* Event type breakdown */}
        {activity && activity.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Event Breakdown
            </h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.entries(
                activity.reduce<Record<string, number>>((acc, e) => {
                  acc[e.eventType] = (acc[e.eventType] ?? 0) + e.count;
                  return acc;
                }, {}),
              )
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="rounded-lg border px-4 py-3">
                    <p className="text-xs text-muted-foreground">{type.replace(/_/g, ' ')}</p>
                    <p className="text-lg font-bold">{count}</p>
                  </div>
                ))}
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
