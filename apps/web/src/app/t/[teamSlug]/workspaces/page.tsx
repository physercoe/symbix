'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateWorkspaceDialog } from '@/components/workspace/CreateWorkspaceDialog';

export default function TeamWorkspacesPage() {
  const { teamSlug } = useParams() as { teamSlug: string };
  const { data: team } = trpc.teams.getBySlug.useQuery({ slug: teamSlug });
  const { data: workspaces, isLoading } = trpc.workspaces.list.useQuery(
    team ? { teamId: team.id } : undefined,
    { enabled: !!team },
  );

  const [createOpen, setCreateOpen] = useState(false);
  const base = `/t/${teamSlug}`;

  return (
    <div className="flex h-full overflow-auto">
      <div className="w-full max-w-3xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Workspaces</h1>
            <p className="text-sm text-muted-foreground mt-1">{workspaces?.length ?? 0} workspaces</p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            + New Workspace
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          {workspaces?.map((ws) => (
            <Link
              key={ws.id}
              href={`${base}/workspaces/${ws.id}`}
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
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
            <div className="col-span-2 rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">No workspaces yet</p>
              <Button size="sm" onClick={() => setCreateOpen(true)}>Create your first workspace</Button>
            </div>
          )}
        </div>
      </div>

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} teamId={team?.id} />
    </div>
  );
}
