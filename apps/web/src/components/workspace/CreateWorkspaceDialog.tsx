'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
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
        <DialogTitle>Create Workspace</DialogTitle>
        <DialogDescription>
          Create a new workspace for your team and agents.
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
              Workspace name
            </label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Workspace"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || createWorkspace.isPending}>
            {createWorkspace.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
