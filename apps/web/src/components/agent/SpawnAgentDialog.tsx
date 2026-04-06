'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  PERMISSION_PRESETS,
  PERMISSION_PRESET_NAMES,
  TOOL_GROUPS,
  TOOL_GROUP_LABELS,
  TOOL_GROUP_DESCRIPTIONS,
  ACCESS_LEVELS,
  detectPreset,
} from '@symbix/shared';
import type { AgentPermissions, PermissionPreset, AccessLevel, ToolGroup } from '@symbix/shared';

interface Props {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Mode = 'hosted_bot' | 'machine_agent';

const PRESET_LABELS: Record<PermissionPreset, string> = {
  minimal: 'Minimal — chat only',
  observer: 'Observer — read everything',
  standard: 'Standard — channel read/write, workspace read',
  full: 'Full — read/write everywhere',
};

const ACCESS_LABEL: Record<AccessLevel, string> = {
  none: 'None',
  read: 'Read',
  read_write: 'Read & Write',
};

function PermissionsEditor({
  permissions,
  onChange,
}: {
  permissions: AgentPermissions;
  onChange: (p: AgentPermissions) => void;
}) {
  const currentPreset = detectPreset(permissions);
  const [showDetails, setShowDetails] = useState(false);

  const handlePreset = (name: PermissionPreset) => {
    onChange({ ...PERMISSION_PRESETS[name] });
  };

  const handleGroupChange = (group: ToolGroup, level: AccessLevel) => {
    onChange({ ...permissions, [group]: level });
  };

  return (
    <div className="border-t pt-3">
      <p className="text-sm font-medium mb-2">Permissions</p>

      {/* Preset selector */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {PERMISSION_PRESET_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => handlePreset(name)}
            className={cn(
              'rounded-md border px-2 py-1.5 text-xs text-left transition-colors',
              currentPreset === name
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-input text-muted-foreground hover:bg-accent',
            )}
          >
            <span className="font-medium capitalize">{name}</span>
            <br />
            <span className="text-[10px] opacity-70">
              {name === 'minimal' && 'Chat only'}
              {name === 'observer' && 'Read everything'}
              {name === 'standard' && 'Channel rw + ws read'}
              {name === 'full' && 'Full access'}
            </span>
          </button>
        ))}
      </div>

      {/* Toggle for per-group details */}
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        {showDetails ? '▼ Hide details' : '▶ Customize per resource'}
        {currentPreset === 'custom' && (
          <span className="ml-1 text-amber-400">(custom)</span>
        )}
      </button>

      {/* Per-group dropdowns */}
      {showDetails && (
        <div className="space-y-2">
          {TOOL_GROUPS.map((group) => (
            <div key={group} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{TOOL_GROUP_LABELS[group]}</p>
                <p className="text-[10px] text-muted-foreground truncate">{TOOL_GROUP_DESCRIPTIONS[group]}</p>
              </div>
              <select
                value={permissions[group]}
                onChange={(e) => handleGroupChange(group, e.target.value as AccessLevel)}
                className="rounded border border-input bg-background px-2 py-1 text-xs shrink-0 w-28"
              >
                {ACCESS_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {ACCESS_LABEL[level]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SpawnAgentDialog({ workspaceId, open, onOpenChange }: Props) {
  const [mode, setMode] = useState<Mode>('hosted_bot');
  const [name, setName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [llmProvider, setLlmProvider] = useState('anthropic');
  const [llmModel, setLlmModel] = useState('claude-sonnet-4-20250514');
  const [llmBaseUrl, setLlmBaseUrl] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [machineId, setMachineId] = useState('');
  const [adapter, setAdapter] = useState('claude-code');
  const [permissions, setPermissions] = useState<AgentPermissions>({
    ...PERMISSION_PRESETS.standard,
  });
  const utils = trpc.useUtils();

  const { data: machines } = trpc.machines.list.useQuery({ workspaceId });
  const onlineMachines = machines?.filter((m) => m.status === 'online') ?? [];

  const createBot = trpc.agents.create.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate({ workspaceId });
      handleClose();
    },
  });

  const spawnAgent = trpc.agents.spawn.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate({ workspaceId });
      handleClose();
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setName('');
      setRoleDescription('');
      setSystemPrompt('');
      setLlmProvider('anthropic');
      setLlmModel('claude-sonnet-4-20250514');
      setLlmBaseUrl('');
      setLlmApiKey('');
      setMachineId('');
      setMode('hosted_bot');
      setPermissions({ ...PERMISSION_PRESETS.standard });
    }, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (mode === 'hosted_bot') {
      createBot.mutate({
        workspaceId,
        name: name.trim(),
        roleDescription: roleDescription.trim(),
        systemPrompt: systemPrompt.trim(),
        llmProvider,
        llmModel,
        llmBaseUrl: llmBaseUrl.trim() || undefined,
        llmApiKey: llmApiKey.trim() || undefined,
        agentType: 'hosted_bot',
        config: { permissions },
      });
    } else {
      if (!machineId) return;
      spawnAgent.mutate({
        workspaceId,
        machineId,
        name: name.trim(),
        agentType: 'cli_agent',
        adapter,
        config: { permissions },
      });
    }
  };

  const isPending = createBot.isPending || spawnAgent.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogHeader>
        <DialogTitle>Add Agent</DialogTitle>
        <DialogDescription>
          Create a hosted bot or spawn an agent on a connected machine.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Mode selector */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('hosted_bot')}
              className={cn(
                'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                mode === 'hosted_bot'
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-input text-muted-foreground hover:bg-accent',
              )}
            >
              Hosted Bot
            </button>
            <button
              type="button"
              onClick={() => setMode('machine_agent')}
              className={cn(
                'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                mode === 'machine_agent'
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-input text-muted-foreground hover:bg-accent',
              )}
            >
              Machine Agent
            </button>
          </div>

          <div>
            <label htmlFor="agent-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === 'hosted_bot' ? 'Support Bot' : 'Claude Code'}
              autoFocus
            />
          </div>

          {mode === 'hosted_bot' && (
            <>
              <div>
                <label htmlFor="agent-role" className="text-sm font-medium">
                  Role description
                </label>
                <Input
                  id="agent-role"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="A helpful assistant for the team"
                />
              </div>
              <div>
                <label htmlFor="agent-prompt" className="text-sm font-medium">
                  System prompt
                </label>
                <textarea
                  id="agent-prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful assistant..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">LLM Configuration</p>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="agent-provider" className="text-xs text-muted-foreground">
                      Provider
                    </label>
                    <select
                      id="agent-provider"
                      value={llmProvider}
                      onChange={(e) => {
                        setLlmProvider(e.target.value);
                        setLlmModel(
                          e.target.value === 'anthropic'
                            ? 'claude-sonnet-4-20250514'
                            : 'gpt-4o',
                        );
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="openai">OpenAI / Compatible</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="agent-model" className="text-xs text-muted-foreground">
                      Model
                    </label>
                    <Input
                      id="agent-model"
                      value={llmModel}
                      onChange={(e) => setLlmModel(e.target.value)}
                      placeholder={llmProvider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o'}
                    />
                  </div>
                  <div>
                    <label htmlFor="agent-baseurl" className="text-xs text-muted-foreground">
                      Base URL <span className="text-muted-foreground">(optional, for custom endpoints)</span>
                    </label>
                    <Input
                      id="agent-baseurl"
                      value={llmBaseUrl}
                      onChange={(e) => setLlmBaseUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                  <div>
                    <label htmlFor="agent-apikey" className="text-xs text-muted-foreground">
                      API Key <span className="text-muted-foreground">(optional, falls back to server default)</span>
                    </label>
                    <Input
                      id="agent-apikey"
                      type="password"
                      value={llmApiKey}
                      onChange={(e) => setLlmApiKey(e.target.value)}
                      placeholder="sk-..."
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {mode === 'machine_agent' && (
            <>
              <div>
                <label htmlFor="agent-machine" className="text-sm font-medium">
                  Machine
                </label>
                {onlineMachines.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    No online machines. Register and connect a machine first.
                  </p>
                ) : (
                  <select
                    id="agent-machine"
                    value={machineId}
                    onChange={(e) => setMachineId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select a machine...</option>
                    {onlineMachines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.machineType})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label htmlFor="agent-adapter" className="text-sm font-medium">
                  Adapter
                </label>
                <select
                  id="agent-adapter"
                  value={adapter}
                  onChange={(e) => setAdapter(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="claude-code">Claude Code</option>
                  <option value="codex">Codex</option>
                  <option value="subprocess">Custom subprocess</option>
                </select>
              </div>
            </>
          )}

          {/* Permissions — shown for both modes */}
          <PermissionsEditor permissions={permissions} onChange={setPermissions} />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || isPending || (mode === 'machine_agent' && !machineId)}
          >
            {isPending ? 'Creating...' : mode === 'hosted_bot' ? 'Create Bot' : 'Spawn Agent'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
