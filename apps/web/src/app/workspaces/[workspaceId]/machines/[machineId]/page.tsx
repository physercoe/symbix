'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { MachineDetail } from '@/components/machine/MachineDetail';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function MachineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const machineId = params.machineId as string;

  const { data: machine, isLoading } = trpc.machines.getById.useQuery({ id: machineId });
  const { data: agents } = trpc.agents.list.useQuery({ workspaceId });

  const machineAgents = agents?.filter((a) => a.machineId === machineId) ?? [];

  if (isLoading) {
    return (
      <div className="h-full overflow-auto p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full max-w-lg" />
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Machine not found.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-lg">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/workspaces/${workspaceId}`)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </Button>
          <h1 className="text-lg font-bold">{machine.name}</h1>
        </div>
        <MachineDetail
          machine={machine as Parameters<typeof MachineDetail>[0]['machine']}
          agents={machineAgents as Parameters<typeof MachineDetail>[0]['agents']}
        />
      </div>
    </div>
  );
}
