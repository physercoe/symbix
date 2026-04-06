'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { CreateWorkspaceDialog } from '@/components/workspace/CreateWorkspaceDialog';

export default function HomePage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: workspaces, isLoading } = trpc.workspaces.list.useQuery();
  const { data: specs } = trpc.specs.list.useQuery({});
  const { data: items } = trpc.userItems.list.useQuery({});

  const agentSpecs = specs?.filter((s) => s.specType === 'agent') ?? [];
  const workspaceSpecs = specs?.filter((s) => s.specType === 'workspace') ?? [];
  const recentItems = items?.slice(0, 5) ?? [];

  return (
    <div className="flex h-full overflow-auto">
      <div className="w-full max-w-3xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Home</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your workspaces and toolkit at a glance.
          </p>
        </div>

        {/* Workspaces */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Workspaces</h2>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setCreateOpen(true)}>
              + New Workspace
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
                <p className="text-sm text-muted-foreground mb-3">No workspaces yet</p>
                <Button size="sm" onClick={() => setCreateOpen(true)}>Create your first workspace</Button>
              </div>
            )}
          </div>
        </section>

        <Separator />

        {/* Toolkit quick access */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Toolkit</h2>
            <Link href="/toolkit/specs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {/* Specs card */}
            <Link href="/toolkit/specs" className="rounded-lg border p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="text-sm font-medium">Specs</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {agentSpecs.length} agent, {workspaceSpecs.length} workspace
              </p>
            </Link>

            {/* Patterns card */}
            <Link href="/toolkit/patterns" className="rounded-lg border p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                </svg>
                <span className="text-sm font-medium">Patterns</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {items?.filter((i) => i.type === 'pattern').length ?? 0} reusable
              </p>
            </Link>

            {/* References card */}
            <Link href="/toolkit/references" className="rounded-lg border p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-sm font-medium">References</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {items?.filter((i) => i.type === 'reference').length ?? 0} saved
              </p>
            </Link>
          </div>
        </section>

        {/* Recent toolkit items */}
        {recentItems.length > 0 && (
          <>
            <Separator />
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent Activity</h2>
              <div className="space-y-1">
                {recentItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/toolkit/${item.type === 'insight' ? 'insights' : item.type === 'reference' ? 'references' : item.type === 'pattern' ? 'patterns' : 'assets'}`}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
                  >
                    <Badge variant="outline" className={cn('text-[10px] px-1 py-0',
                      item.type === 'insight' ? 'text-yellow-400 border-yellow-400/30' :
                      item.type === 'reference' ? 'text-amber-400 border-amber-400/30' :
                      item.type === 'pattern' ? 'text-cyan-400 border-cyan-400/30' :
                      'text-emerald-400 border-emerald-400/30'
                    )}>
                      {item.type}
                    </Badge>
                    <span className="truncate flex-1">{item.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}

        <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </div>
  );
}
