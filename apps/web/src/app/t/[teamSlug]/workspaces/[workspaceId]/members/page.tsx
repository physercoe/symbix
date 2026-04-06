'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function WorkspaceMembersPage() {
  const { workspaceId } = useParams() as { workspaceId: string };
  const { data: members, isLoading } = trpc.workspaces.listMembers.useQuery({ workspaceId });

  const userMembers = members?.filter((m) => m.memberType === 'user') ?? [];
  const agentMembers = members?.filter((m) => m.memberType === 'agent') ?? [];

  return (
    <div className="flex h-full overflow-auto">
      <div className="w-full max-w-3xl mx-auto p-8 space-y-6">
        <h1 className="text-2xl font-bold">Workspace Members</h1>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            People ({userMembers.length})
          </h2>
          <div className="space-y-2">
            {isLoading && Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            {userMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border px-4 py-2">
                <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold">
                  {(m.userName ?? 'U').charAt(0).toUpperCase()}
                </div>
                <span className="text-sm flex-1">{m.userName ?? 'Unknown'}</span>
                <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
              </div>
            ))}
          </div>
        </section>

        {agentMembers.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Deployed Agents ({agentMembers.length})
            </h2>
            <div className="space-y-2">
              {agentMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border px-4 py-2">
                  <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold">
                    A
                  </div>
                  <span className="text-sm flex-1">{m.agentId}</span>
                  <Badge variant="outline" className="text-[10px]">agent</Badge>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
