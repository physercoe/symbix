'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;

  const { data: channels } = trpc.channels.list.useQuery({ workspaceId });

  useEffect(() => {
    if (channels && channels.length > 0) {
      router.replace(`/workspaces/${workspaceId}/channels/${channels[0].id}`);
    }
  }, [channels, workspaceId, router]);

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      {channels?.length === 0 ? (
        <p>No channels yet. Create one to get started.</p>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
