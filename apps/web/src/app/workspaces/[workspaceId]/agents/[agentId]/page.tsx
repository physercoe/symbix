'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { AgentPanel } from '@/components/agent/AgentPanel';
import { Skeleton } from '@/components/ui/skeleton';

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const agentId = params.agentId as string;

  const { data: agent, isLoading } = trpc.agents.getById.useQuery({ id: agentId });

  if (isLoading) {
    return (
      <div className="h-full overflow-auto p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full max-w-lg" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Agent not found.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-lg">
        <AgentPanel
          agent={agent as Parameters<typeof AgentPanel>[0]['agent']}
          onClose={() => router.push(`/workspaces/${workspaceId}`)}
        />
      </div>
    </div>
  );
}
