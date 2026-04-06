'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface Props {
  machine: {
    id: string;
    workspaceId: string;
    name: string;
    machineType: string;
    apiKey: string;
    status: string;
    lastSeenAt: string | null;
    createdAt: string;
  };
  agents: Array<{
    id: string;
    name: string;
    status: string;
    agentType: string;
  }>;
}

export function MachineDetail({ machine, agents }: Props) {
  const [showKey, setShowKey] = useState(false);
  const utils = trpc.useUtils();

  const deregister = trpc.machines.deregister.useMutation({
    onSuccess: () => {
      utils.machines.list.invalidate({ teamId: machine.teamId });
    },
  });

  const maskedKey = machine.apiKey.slice(0, 8) + '...' + machine.apiKey.slice(-4);

  return (
    <div className="mt-1 rounded-lg border bg-card p-3 space-y-3">
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Type</span>
          <span className="capitalize">{machine.machineType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">API Key</span>
          <button
            onClick={() => setShowKey(!showKey)}
            className="font-mono text-xs hover:text-foreground"
          >
            {showKey ? machine.apiKey : maskedKey}
          </button>
        </div>
        {machine.lastSeenAt && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last seen</span>
            <span>{new Date(machine.lastSeenAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {agents.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Agents</p>
            <div className="space-y-1">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between text-xs">
                  <span>{agent.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{agent.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />
      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => {
          if (confirm(`Remove machine "${machine.name}"? This will also remove its agents.`)) {
            deregister.mutate({ id: machine.id });
          }
        }}
        disabled={deregister.isPending}
      >
        {deregister.isPending ? 'Removing...' : 'Remove Machine'}
      </Button>
    </div>
  );
}
