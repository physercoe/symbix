'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TeamSettingsPage() {
  const { teamSlug } = useParams() as { teamSlug: string };
  const router = useRouter();
  const { data: team } = trpc.teams.getBySlug.useQuery({ slug: teamSlug });
  const utils = trpc.useUtils();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (team && !initialized) {
    setName(team.name);
    setDescription(team.description ?? '');
    setInitialized(true);
  }

  const updateTeam = trpc.teams.update.useMutation({
    onSuccess: () => {
      utils.teams.getBySlug.invalidate({ slug: teamSlug });
      utils.teams.list.invalidate();
    },
  });

  const deleteTeam = trpc.teams.delete.useMutation({
    onSuccess: () => {
      utils.teams.list.invalidate();
      router.push('/');
    },
  });

  return (
    <div className="flex h-full overflow-auto">
      <div className="w-full max-w-2xl mx-auto p-8 space-y-8">
        <h1 className="text-2xl font-bold">Team Settings</h1>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (team) {
              updateTeam.mutate({ id: team.id, name: name.trim() || undefined, description: description.trim() || undefined });
            }
          }}
        >
          <div>
            <label className="text-sm font-medium">Team Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div>
            <label className="text-sm font-medium">Slug</label>
            <Input value={team?.slug ?? ''} disabled className="opacity-50" />
            <p className="text-xs text-muted-foreground mt-1">URL slug cannot be changed</p>
          </div>
          <Button type="submit" disabled={updateTeam.isPending}>
            {updateTeam.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>

        <div className="rounded-lg border border-red-500/20 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
          <p className="text-xs text-muted-foreground">
            Deleting this team will permanently remove all workspaces, agents, and machines.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (team && confirm(`Delete team "${team.name}"? This cannot be undone.`)) {
                deleteTeam.mutate({ id: team.id });
              }
            }}
          >
            Delete Team
          </Button>
        </div>
      </div>
    </div>
  );
}
