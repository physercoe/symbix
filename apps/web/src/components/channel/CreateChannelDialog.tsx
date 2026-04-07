'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateChannelDialog({ workspaceId, open, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const router = useRouter();
  const utils = trpc.useUtils();
  const { t } = useTranslation();

  const createChannel = trpc.channels.create.useMutation({
    onSuccess: (channel) => {
      utils.channels.list.invalidate({ workspaceId });
      onOpenChange(false);
      setName('');
      setDescription('');
      setType('public');
      router.push(`/workspaces/${workspaceId}/channels/${channel.id}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('channel.create')}</DialogTitle>
          <DialogDescription>{t('channel.createDesc')}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              createChannel.mutate({
                workspaceId,
                name: name.trim(),
                description: description.trim() || undefined,
                type,
              });
            }
          }}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="ch-name" className="text-sm font-medium">
                {t('channel.name')}
              </label>
              <Input
                id="ch-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('channel.namePlaceholder')}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="ch-desc" className="text-sm font-medium">
                {t('channel.description')} <span className="text-muted-foreground">({t('common.optional')})</span>
              </label>
              <Input
                id="ch-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('channel.descPlaceholder')}
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">{t('channel.type')}</p>
              <div className="flex gap-2">
                {(['public', 'private'] as const).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setType(tp)}
                    className={cn(
                      'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                      type === tp
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-input text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {tp === 'public' ? t('channel.public') : t('channel.private')}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim() || createChannel.isPending}>
              {createChannel.isPending ? t('common.creating') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
