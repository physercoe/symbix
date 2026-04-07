'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { CreateWorkspaceDialog } from '@/components/workspace/CreateWorkspaceDialog';

export default function HomePage() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: workspaces, isLoading } = trpc.workspaces.list.useQuery();
  const { data: teams } = trpc.teams.list.useQuery();
  const { t } = useTranslation();

  // Auto-redirect to team dashboard if user has teams
  useEffect(() => {
    if (teams && teams.length > 0) {
      router.replace(`/t/${teams[0].slug}`);
    }
  }, [teams, router]);

  return (
    <div className="flex h-full overflow-auto">
      <div className="w-full max-w-3xl mx-auto p-8 space-y-8">
        {/* Team banner */}
        {teams && teams.length > 0 && (
          <Link
            href={`/t/${teams[0].slug}`}
            className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition-colors"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
              {teams[0].name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{t('home.goToTeam', { name: teams[0].name })}</p>
              <p className="text-xs text-muted-foreground">{t('home.teamDashboardDesc')}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{t('home.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('home.subtitle')}
          </p>
        </div>

        {/* Workspaces */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('nav.workspaces')}</h2>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setCreateOpen(true)}>
              + {t('nav.newWorkspace')}
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {isLoading && (
              <>
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </>
            )}
            {workspaces?.map((ws) => (
              <Link
                key={ws.id}
                href={`/workspaces/${ws.id}`}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{ws.name}</p>
                  <p className="text-xs text-muted-foreground">Created {new Date(ws.createdAt).toLocaleDateString()}</p>
                </div>
              </Link>
            ))}
            {workspaces && workspaces.length === 0 && (
              <div className="col-span-2 rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">{t('home.noWorkspaces')}</p>
                <Button size="sm" onClick={() => setCreateOpen(true)}>{t('home.createFirst')}</Button>
              </div>
            )}
          </div>
        </section>

        <Separator />

        {/* Toolkit quick access */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('nav.toolkit')}</h2>
            <Link href="/toolkit/specs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {t('common.viewAll')} →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {/* Specs card */}
            <Link href="/toolkit/specs" className="rounded-lg border p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="text-sm font-medium">{t('nav.specs')}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('home.agentAndWorkspaceSpecs')}</p>
            </Link>

            {/* Patterns card */}
            <Link href="/toolkit/patterns" className="rounded-lg border p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                </svg>
                <span className="text-sm font-medium">{t('nav.patterns')}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('home.reusableCodeAndPrompts')}</p>
            </Link>

            {/* References card */}
            <Link href="/toolkit/references" className="rounded-lg border p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-sm font-medium">{t('nav.references')}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('home.savedMessagesAndLinks')}</p>
            </Link>
          </div>
        </section>

        <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </div>
  );
}
