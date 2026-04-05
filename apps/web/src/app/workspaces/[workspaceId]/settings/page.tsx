'use client';

import { useParams } from 'next/navigation';
import { MachineList } from '@/components/machine/MachineList';
import { AgentList } from '@/components/agent/AgentList';

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="text-xl font-bold mb-6">Workspace Settings</h1>
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        <MachineList workspaceId={workspaceId} />
        <AgentList workspaceId={workspaceId} />
      </div>
    </div>
  );
}
