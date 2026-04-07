'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.teamSlug as string;
  const workspaceId = params.workspaceId as string;

  const { t } = useTranslation();
  const { data: channels, isLoading, isError, error, refetch } = trpc.channels.list.useQuery(
    { workspaceId },
    { retry: 2 },
  );

  useEffect(() => {
    if (channels && channels.length > 0) {
      router.replace(`/t/${teamSlug}/workspaces/${workspaceId}/channels/${channels[0].id}`);
    }
  }, [channels, workspaceId, teamSlug, router]);

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <p>{t('workspace.loadFailed')}{error?.message ? `: ${error.message}` : ''}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>{t('common.retry')}</Button>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      {!isLoading && channels?.length === 0 ? (
        <p>{t('workspace.noChannels')}</p>
      ) : (
        <p>{t('common.loading')}</p>
      )}
    </div>
  );
}
