'use client';

import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function WorkspacesPage() {
  const { data: workspaces, isLoading } = trpc.workspaces.list.useQuery();

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Workspaces</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Select a workspace or create a new one.
          </p>
        </div>

        <div className="space-y-2">
          {isLoading && (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          )}
          {workspaces?.map((ws) => (
            <Link
              key={ws.id}
              href={`/workspaces/${ws.id}`}
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
                {ws.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{ws.name}</p>
              </div>
            </Link>
          ))}
          {workspaces?.length === 0 && (
            <p className="text-sm text-muted-foreground">No workspaces yet.</p>
          )}
        </div>

        <Button className="w-full">Create Workspace</Button>
      </div>
    </div>
  );
}
