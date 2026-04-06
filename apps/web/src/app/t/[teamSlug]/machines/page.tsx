'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const statusDot: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
};

export default function TeamMachinesPage() {
  const { teamSlug } = useParams() as { teamSlug: string };
  const { data: team } = trpc.teams.getBySlug.useQuery({ slug: teamSlug });
  const { data: machines, isLoading } = trpc.machines.list.useQuery(
    { teamId: team?.id ?? '' },
    { enabled: !!team },
  );
  const utils = trpc.useUtils();

  const [showRegister, setShowRegister] = useState(false);
  const [name, setName] = useState('');
  const [machineType, setMachineType] = useState('desktop');

  const registerMachine = trpc.machines.register.useMutation({
    onSuccess: () => {
      utils.machines.list.invalidate({ teamId: team?.id ?? '' });
      setName('');
      setShowRegister(false);
    },
  });

  const deregister = trpc.machines.deregister.useMutation({
    onSuccess: () => utils.machines.list.invalidate({ teamId: team?.id ?? '' }),
  });

  return (
    <div className="flex h-full overflow-auto">
      <div className="w-full max-w-3xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Machines</h1>
            <p className="text-sm text-muted-foreground mt-1">{machines?.length ?? 0} registered machines</p>
          </div>
          <Button size="sm" onClick={() => setShowRegister(!showRegister)}>
            + Register Machine
          </Button>
        </div>

        {showRegister && (
          <form
            className="flex gap-2 items-end rounded-lg border p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim() && team) {
                registerMachine.mutate({ teamId: team.id, name: name.trim(), machineType: machineType as 'desktop' | 'server' | 'robot' | 'browser' | 'cloud' });
              }
            }}
          >
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Machine"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <select
                value={machineType}
                onChange={(e) => setMachineType(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="desktop">Desktop</option>
                <option value="server">Server</option>
                <option value="robot">Robot</option>
                <option value="browser">Browser</option>
                <option value="cloud">Cloud</option>
              </select>
            </div>
            <Button type="submit" disabled={registerMachine.isPending}>
              {registerMachine.isPending ? 'Registering...' : 'Register'}
            </Button>
          </form>
        )}

        <div className="space-y-2">
          {isLoading && Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          {machines?.map((machine) => (
            <div key={machine.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
              <div className={cn('h-3 w-3 rounded-full shrink-0', statusDot[machine.status] ?? 'bg-gray-500')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{machine.name}</p>
                <p className="text-xs text-muted-foreground">
                  {machine.machineType} &middot; {machine.status}
                  {machine.lastSeenAt && ` &middot; Last seen ${new Date(machine.lastSeenAt).toLocaleString()}`}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">{machine.machineType}</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-400"
                onClick={() => {
                  if (confirm(`Remove machine "${machine.name}"?`)) deregister.mutate({ id: machine.id });
                }}
              >
                Remove
              </Button>
            </div>
          ))}
          {machines && machines.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">No machines registered</p>
              <Button size="sm" onClick={() => setShowRegister(true)}>Register a machine</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
