'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/lib/i18n';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId?: string;
}

export function CreateWorkspaceDialog({ open, onOpenChange, teamId }: Props) {
  const [name, setName] = useState('');
  const router = useRouter();
  const utils = trpc.useUtils();
  const { t } = useTranslation();

  const createWorkspace = trpc.workspaces.create.useMutation({
    onSuccess: (workspace) => {
      utils.workspaces.list.invalidate();
      onOpenChange(false);
      setName('');
      router.push(`/workspaces/${workspace.id}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{t('workspace.create')}</DialogTitle>
        <DialogDescription>
          {t('workspace.createDesc')}
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            createWorkspace.mutate({ name: name.trim(), ...(teamId ? { teamId } : {}) });
          }
        }}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="ws-name" className="text-sm font-medium">
              {t('workspace.name')}
            </label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('workspace.namePlaceholder')}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!name.trim() || createWorkspace.isPending}>
            {createWorkspace.isPending ? t('common.creating') : t('common.create')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
