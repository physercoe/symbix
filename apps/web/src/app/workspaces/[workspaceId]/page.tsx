'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;

  const { data: channels, isLoading, isError, error, refetch } = trpc.channels.list.useQuery(
    { workspaceId },
    { retry: 2 },
  );

  useEffect(() => {
    if (channels && channels.length > 0) {
      router.replace(`/workspaces/${workspaceId}/channels/${channels[0].id}`);
    }
  }, [channels, workspaceId, router]);

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <p>Failed to load channels{error?.message ? `: ${error.message}` : ''}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      {!isLoading && channels?.length === 0 ? (
        <p>No channels yet. Create one to get started.</p>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
