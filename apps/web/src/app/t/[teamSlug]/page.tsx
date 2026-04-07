'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const statusDot: Record<string, string> = {
  active: 'bg-green-500',
  sleeping: 'bg-yellow-500',
  offline: 'bg-gray-500',
  error: 'bg-red-500',
  online: 'bg-green-500',
};

export default function TeamDashboard() {
  const { teamSlug } = useParams() as { teamSlug: string };
  const { t } = useTranslation();
  const { data: team } = trpc.teams.getBySlug.useQuery({ slug: teamSlug });
  const { data: overview, isLoading } = trpc.metrics.teamOverview.useQuery(
    { teamId: team?.id ?? '' },
    { enabled: !!team },
  );
  const { data: workspaces } = trpc.workspaces.list.useQuery(
    team ? { teamId: team.id } : undefined,
    { enabled: !!team },
  );
  const { data: recentActivity } = trpc.metrics.recentActivity.useQuery(
    { teamId: team?.id ?? '', limit: 10 },
    { enabled: !!team },
  );

  const base = `/t/${teamSlug}`;

  return (
    <div className="flex h-full overflow-auto">
      <div className="w-full max-w-4xl mx-auto px-6 py-8 sm:px-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{team?.name ?? t('nav.team')}</h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            {team?.description ?? t('dashboard.teamDashboard')}
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
          ) : (
            <>
              <StatCard label={t('nav.members')} value={overview?.members ?? 0} href={`${base}/members`} />
              <StatCard label={t('nav.workspaces')} value={overview?.workspaces ?? 0} href={`${base}/workspaces`} />
              <StatCard label={t('nav.agents')} value={overview?.agents.total ?? 0} sub={`${overview?.agents.active ?? 0} ${t('dashboard.active')}`} href={`${base}/agents`} />
              <StatCard label={t('nav.machines')} value={overview?.machines.total ?? 0} sub={`${overview?.machines.online ?? 0} ${t('dashboard.online')}`} href={`${base}/machines`} />
            </>
          )}
        </div>

        {/* Messages (7d) */}
        {overview && (
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{t('dashboard.messages7d')}</p>
            <p className="text-3xl font-bold mt-1">{overview.messages7d.toLocaleString()}</p>
          </div>
        )}

        {/* Recent Workspaces */}
        {workspaces && workspaces.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('nav.workspaces')}</h2>
              <Link href={`${base}/workspaces`} className="text-xs text-muted-foreground hover:text-foreground">
                {t('common.viewAll')}
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {workspaces.slice(0, 4).map((ws) => (
                <Link
                  key={ws.id}
                  href={`${base}/workspaces/${ws.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/30 hover:border-accent-foreground/10 transition-all duration-150"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{ws.name}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.created')} {new Date(ws.createdAt).toLocaleDateString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent Activity */}
        {recentActivity && recentActivity.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('dashboard.recentActivity')}</h2>
            <div className="space-y-2">
              {recentActivity.map((event) => (
                <div key={event.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${statusDot[event.eventType] ?? 'bg-blue-500'}`} />
                  <span className="text-muted-foreground">{formatEventType(event.eventType)}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, href }: { label: string; value: number; sub?: string; href: string }) {
  return (
    <Link href={href} className="group rounded-lg border p-4 hover:bg-accent/30 hover:border-accent-foreground/10 transition-all duration-150">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1.5 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </Link>
  );
}

function formatEventType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
