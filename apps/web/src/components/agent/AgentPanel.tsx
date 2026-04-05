'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface AgentData {
  id: string;
  workspaceId: string;
  name: string;
  agentType: string;
  status: string;
  roleDescription: string;
  systemPrompt: string;
  llmProvider: string;
  llmModel: string;
  llmBaseUrl: string | null;
  llmApiKey: string | null;
  machineId: string | null;
  config: Record<string, unknown>;
  capabilities: string[];
  createdAt: string;
}

interface Props {
  agent: AgentData;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  sleeping: 'bg-yellow-500/20 text-yellow-400',
  offline: 'bg-gray-500/20 text-gray-400',
  error: 'bg-red-500/20 text-red-400',
  disabled: 'bg-gray-500/20 text-gray-400',
};

export function AgentPanel({ agent, onClose }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(agent.name);
  const [roleDescription, setRoleDescription] = useState(agent.roleDescription);
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt);
  const [llmProvider, setLlmProvider] = useState(agent.llmProvider);
  const [llmModel, setLlmModel] = useState(agent.llmModel);
  const [llmBaseUrl, setLlmBaseUrl] = useState(agent.llmBaseUrl ?? '');
  const [llmApiKey, setLlmApiKey] = useState(agent.llmApiKey ?? '');
  const [autoRespond, setAutoRespond] = useState(
    (agent.config as Record<string, unknown>)?.autoRespond === true,
  );
  const utils = trpc.useUtils();

  const updateAgent = trpc.agents.update.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate({ workspaceId: agent.workspaceId });
      setEditing(false);
    },
  });
  const wake = trpc.agents.wake.useMutation({
    onSuccess: () => utils.agents.list.invalidate({ workspaceId: agent.workspaceId }),
  });
  const sleep = trpc.agents.sleep.useMutation({
    onSuccess: () => utils.agents.list.invalidate({ workspaceId: agent.workspaceId }),
  });
  const deleteAgent = trpc.agents.delete.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate({ workspaceId: agent.workspaceId });
      onClose();
    },
  });

  const handleSave = () => {
    updateAgent.mutate({
      id: agent.id,
      name: name.trim(),
      roleDescription: roleDescription.trim(),
      systemPrompt: systemPrompt.trim(),
      llmProvider,
      llmModel,
      llmBaseUrl: llmBaseUrl.trim() || undefined,
      llmApiKey: llmApiKey.trim() || undefined,
      config: { ...agent.config, autoRespond },
    });
  };

  if (editing) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">Edit Agent</h4>
          <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground text-sm">
            Cancel
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Role description</label>
            <Input value={roleDescription} onChange={(e) => setRoleDescription(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">System prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {agent.agentType === 'hosted_bot' && (
            <>
              <Separator />
              <p className="text-xs font-medium">LLM Configuration</p>
              <div>
                <label className="text-xs text-muted-foreground">Provider</label>
                <select
                  value={llmProvider}
                  onChange={(e) => {
                    setLlmProvider(e.target.value);
                    if (e.target.value === 'anthropic' && llmModel.startsWith('gpt')) {
                      setLlmModel('claude-sonnet-4-20250514');
                    } else if (e.target.value === 'openai' && llmModel.startsWith('claude')) {
                      setLlmModel('gpt-4o');
                    }
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI / Compatible</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Model</label>
                <Input value={llmModel} onChange={(e) => setLlmModel(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Base URL (optional)</label>
                <Input
                  value={llmBaseUrl}
                  onChange={(e) => setLlmBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">API Key (optional, falls back to server default)</label>
                <Input
                  type="password"
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>
            </>
          )}
          <Separator />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-respond"
              checked={autoRespond}
              onChange={(e) => setAutoRespond(e.target.checked)}
              className="rounded border-input"
            />
            <label htmlFor="auto-respond" className="text-xs">
              Auto-respond to all messages (no @mention needed)
            </label>
          </div>
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={handleSave}
          disabled={!name.trim() || updateAgent.isPending}
        >
          {updateAgent.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{agent.name}</h4>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">
          Close
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn('text-xs', statusColors[agent.status])}>
          {agent.status}
        </Badge>
        <Badge variant="secondary" className="text-xs">{agent.agentType}</Badge>
        {(agent.config as Record<string, unknown>)?.autoRespond === true && (
          <Badge variant="secondary" className="text-xs">auto-respond</Badge>
        )}
      </div>

      {agent.roleDescription && (
        <div>
          <p className="text-xs text-muted-foreground">Role</p>
          <p className="text-sm">{agent.roleDescription}</p>
        </div>
      )}

      {agent.agentType === 'hosted_bot' && (
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Provider</span>
            <span>{agent.llmProvider === 'anthropic' ? 'Anthropic' : 'OpenAI / Compatible'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Model</span>
            <span className="truncate ml-2">{agent.llmModel}</span>
          </div>
          {agent.llmBaseUrl && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base URL</span>
              <span className="truncate ml-2">{agent.llmBaseUrl}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">API Key</span>
            <span>{agent.llmApiKey ? '******** (custom)' : 'Server default'}</span>
          </div>
        </div>
      )}

      <Separator />

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          Edit
        </Button>
        {agent.status === 'sleeping' || agent.status === 'offline' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => wake.mutate({ id: agent.id })}
            disabled={wake.isPending}
          >
            {wake.isPending ? 'Waking...' : 'Wake'}
          </Button>
        ) : agent.status === 'active' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => sleep.mutate({ id: agent.id })}
            disabled={sleep.isPending}
          >
            {sleep.isPending ? 'Sleeping...' : 'Sleep'}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            if (confirm(`Delete agent "${agent.name}"?`)) {
              deleteAgent.mutate({ id: agent.id });
            }
          }}
          disabled={deleteAgent.isPending}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
