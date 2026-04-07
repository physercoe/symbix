'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const teamSlug = params.teamSlug as string;

  const { t } = useTranslation();
  const { data: workspace } = trpc.workspaces.getById.useQuery({ id: workspaceId });
  const utils = trpc.useUtils();

  const [name, setName] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (workspace && !initialized) {
    setName(workspace.name);
    setInitialized(true);
  }

  const updateWorkspace = trpc.workspaces.update.useMutation({
    onSuccess: () => utils.workspaces.getById.invalidate({ id: workspaceId }),
  });

  const deleteWorkspace = trpc.workspaces.delete.useMutation({
    onSuccess: () => {
      utils.workspaces.list.invalidate();
      router.push(`/t/${teamSlug}/workspaces`);
    },
  });

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-2xl space-y-8">
        <h1 className="text-2xl font-bold">{t('workspace.settings')}</h1>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              updateWorkspace.mutate({ id: workspaceId, name: name.trim() });
            }
          }}
        >
          <div>
            <label className="text-sm font-medium">{t('workspace.workspaceName')}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button type="submit" disabled={updateWorkspace.isPending}>
            {updateWorkspace.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </form>

        <div className="rounded-lg border border-red-500/20 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-red-400">{t('settings.dangerZone')}</h2>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (workspace && confirm(t('workspace.deleteConfirm', { name: workspace.name }))) {
                deleteWorkspace.mutate({ id: workspaceId });
              }
            }}
          >
            {t('workspace.deleteWorkspace')}
          </Button>
        </div>
      </div>
    </div>
  );
}
