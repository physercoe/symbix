'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AddMachineDialog } from './AddMachineDialog';
import { MachineDetail } from './MachineDetail';

interface Props {
  workspaceId: string;
}

export function MachineList({ workspaceId }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: machines, isLoading } = trpc.machines.list.useQuery({ workspaceId });
  const { data: agents } = trpc.agents.list.useQuery({ workspaceId });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Machines</h3>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          Add Machine
        </Button>
      </div>

      {machines && machines.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No machines registered. Add a machine to start spawning agents.
        </p>
      )}

      <div className="space-y-2">
        {machines?.map((machine) => {
          const machineAgents = agents?.filter((a) => a.machineId === machine.id) ?? [];
          const isSelected = selectedId === machine.id;
          return (
            <div key={machine.id}>
              <button
                onClick={() => setSelectedId(isSelected ? null : machine.id)}
                className={cn(
                  'w-full flex items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent/50',
                  isSelected && 'border-primary bg-accent/30',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-xs font-mono">
                    {machine.machineType === 'desktop' ? 'PC' :
                     machine.machineType === 'server' ? 'SV' :
                     machine.machineType === 'robot' ? 'RB' :
                     machine.machineType === 'cloud' ? 'CL' : 'BR'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{machine.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {machineAgents.length} agent{machineAgents.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Badge variant={machine.status === 'online' ? 'default' : 'secondary'}>
                  {machine.status}
                </Badge>
              </button>
              {isSelected && (
                <MachineDetail machine={machine} agents={machineAgents} />
              )}
            </div>
          );
        })}
      </div>

      <AddMachineDialog workspaceId={workspaceId} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
