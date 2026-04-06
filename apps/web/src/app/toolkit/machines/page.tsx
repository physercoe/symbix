'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const statusDot: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
};

export default function MachinesPage() {
  const router = useRouter();
  // List machines across all workspaces the user has access to
  const { data: workspaces } = trpc.workspaces.list.useQuery();

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Machines</h1>
        <p className="text-sm text-muted-foreground">Your registered hardware across all workspaces</p>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-2xl space-y-6">
          {workspaces?.map((ws) => (
            <MachinesForWorkspace key={ws.id} workspaceId={ws.id} workspaceName={ws.name} />
          ))}
          {(!workspaces || workspaces.length === 0) && (
            <p className="text-sm text-muted-foreground">No workspaces. Machines are registered per workspace.</p>
          )}
          <div className="border rounded-md p-4 bg-accent/10">
            <p className="text-xs text-muted-foreground">
              Machines are currently workspace-scoped. A future update will make them account-level so one machine can serve multiple workspaces.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function MachinesForWorkspace({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const { data: machines } = trpc.machines.list.useQuery({ workspaceId });

  if (!machines || machines.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{workspaceName}</p>
      <div className="space-y-1">
        {machines.map((machine) => (
          <div key={machine.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
            <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', statusDot[machine.status] ?? 'bg-gray-500')} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{machine.name}</p>
              <p className="text-xs text-muted-foreground">{machine.machineType} · {machine.status}</p>
            </div>
            {machine.lastSeenAt && (
              <span className="text-[10px] text-muted-foreground">
                Last seen {new Date(machine.lastSeenAt).toLocaleDateString()}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
