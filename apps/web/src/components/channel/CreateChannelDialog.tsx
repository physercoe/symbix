'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
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
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>Add a new channel to your workspace.</DialogDescription>
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
                Channel name
              </label>
              <Input
                id="ch-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="general"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="ch-desc" className="text-sm font-medium">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="ch-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this channel about?"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Type</p>
              <div className="flex gap-2">
                {(['public', 'private'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      'flex-1 rounded-md border px-3 py-2 text-sm capitalize transition-colors',
                      type === t
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-input text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {t === 'public' ? '# Public' : '# Private'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createChannel.isPending}>
              {createChannel.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
