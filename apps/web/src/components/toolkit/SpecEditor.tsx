'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SpecType, SpecVisibility } from '@symbix/shared';

const AGENT_SPEC_TEMPLATE = {
  identity: {
    role: '',
    personality: [],
  },
  capabilities: {
    tools: [],
    domains: [],
    languages: [],
  },
  behavior: {
    always: [],
    never: [],
    triggers: {
      on_mention: 'respond',
      in_dm: 'always_respond',
    },
  },
  communication: {
    tone: 'professional_friendly',
    verbosity: 'concise',
    format: [],
  },
  llm: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
  },
};

const WORKSPACE_SPEC_TEMPLATE = {
  objectives: [],
  rules: [],
  roles: [
    { name: 'lead', permissions: ['admin', 'deploy_agents', 'configure'] },
    { name: 'contributor', permissions: ['write', 'use_agents'] },
    { name: 'observer', permissions: ['read'] },
  ],
  channels: [
    { name: 'general', type: 'public', purpose: '' },
  ],
  agents: [],
  knowledge_seed: [],
};

interface Props {
  specType?: SpecType;
}

export function SpecEditor({ specType: initialType }: Props) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [activeType, setActiveType] = useState<SpecType | 'all'>(initialType ?? 'all');

  // Create form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<SpecType>('agent');
  const [formDescription, setFormDescription] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formVisibility, setFormVisibility] = useState<SpecVisibility>('private');
  const [formCategory, setFormCategory] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Edit state
  const [editContent, setEditContent] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const utils = trpc.useUtils();

  const { data: specs, isLoading } = trpc.specs.list.useQuery({
    specType: activeType === 'all' ? undefined : activeType,
  });

  const createSpec = trpc.specs.create.useMutation({
    onSuccess: () => {
      utils.specs.list.invalidate();
      setCreating(false);
      resetForm();
    },
  });

  const updateSpec = trpc.specs.update.useMutation({
    onSuccess: () => {
      utils.specs.list.invalidate();
      setEditing(false);
    },
  });

  const deleteSpec = trpc.specs.delete.useMutation({
    onSuccess: () => {
      utils.specs.list.invalidate();
      setSelectedId(null);
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormContent('');
    setFormVisibility('private');
    setFormCategory('');
    setJsonError(null);
  };

  const startCreate = (type: SpecType) => {
    setFormType(type);
    const template = type === 'agent' ? AGENT_SPEC_TEMPLATE : WORKSPACE_SPEC_TEMPLATE;
    setFormContent(JSON.stringify(template, null, 2));
    setCreating(true);
    resetForm();
    setFormContent(JSON.stringify(template, null, 2));
  };

  const handleCreate = () => {
    try {
      const parsed = JSON.parse(formContent);
      setJsonError(null);
      createSpec.mutate({
        specType: formType,
        name: formName.trim(),
        description: formDescription || undefined,
        content: parsed,
        visibility: formVisibility,
        category: formCategory || undefined,
      });
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  const startEdit = (content: Record<string, unknown>) => {
    setEditContent(JSON.stringify(content, null, 2));
    setEditError(null);
    setEditing(true);
  };

  const handleSaveEdit = (id: string) => {
    try {
      const parsed = JSON.parse(editContent);
      setEditError(null);
      updateSpec.mutate({ id, content: parsed });
    } catch {
      setEditError('Invalid JSON');
    }
  };

  const selectedSpec = specs?.find((s) => s.id === selectedId);

  const visibilityBadge = (v: string) => {
    switch (v) {
      case 'public': return 'text-green-400 border-green-400/30';
      case 'workspace': return 'text-blue-400 border-blue-400/30';
      default: return 'text-gray-400 border-gray-400/30';
    }
  };

  // Render structured spec preview
  const renderSpecPreview = (content: Record<string, unknown>, type: string) => {
    if (type === 'agent') {
      const c = content as Record<string, unknown>;
      const identity = c.identity as Record<string, unknown> | undefined;
      const capabilities = c.capabilities as Record<string, unknown> | undefined;
      const behavior = c.behavior as Record<string, unknown> | undefined;
      const communication = c.communication as Record<string, unknown> | undefined;
      const llm = c.llm as Record<string, unknown> | undefined;

      return (
        <div className="space-y-4">
          {identity && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Identity</h4>
              {identity.role && <p className="text-sm">{identity.role as string}</p>}
              {Array.isArray(identity.personality) && identity.personality.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {(identity.personality as string[]).map((p, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{p}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
          {capabilities && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Capabilities</h4>
              <div className="space-y-1">
                {Array.isArray(capabilities.tools) && capabilities.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] text-muted-foreground w-14 shrink-0">Tools:</span>
                    {(capabilities.tools as string[]).map((t, i) => <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>)}
                  </div>
                )}
                {Array.isArray(capabilities.domains) && capabilities.domains.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] text-muted-foreground w-14 shrink-0">Domains:</span>
                    {(capabilities.domains as string[]).map((d, i) => <Badge key={i} variant="secondary" className="text-[10px]">{d}</Badge>)}
                  </div>
                )}
                {Array.isArray(capabilities.languages) && capabilities.languages.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] text-muted-foreground w-14 shrink-0">Langs:</span>
                    {(capabilities.languages as string[]).map((l, i) => <Badge key={i} variant="secondary" className="text-[10px]">{l}</Badge>)}
                  </div>
                )}
              </div>
            </div>
          )}
          {behavior && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Behavior</h4>
              {Array.isArray(behavior.always) && behavior.always.length > 0 && (
                <div className="mb-1">
                  <span className="text-[10px] text-green-400">ALWAYS:</span>
                  <ul className="text-xs text-muted-foreground ml-3 list-disc">
                    {(behavior.always as string[]).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {Array.isArray(behavior.never) && behavior.never.length > 0 && (
                <div>
                  <span className="text-[10px] text-red-400">NEVER:</span>
                  <ul className="text-xs text-muted-foreground ml-3 list-disc">
                    {(behavior.never as string[]).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
          {communication && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Communication</h4>
              <p className="text-xs text-muted-foreground">
                Tone: {communication.tone as string} · Verbosity: {communication.verbosity as string}
              </p>
            </div>
          )}
          {llm && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">LLM</h4>
              <p className="text-xs text-muted-foreground">{llm.provider as string} / {llm.model as string}</p>
            </div>
          )}
        </div>
      );
    }

    // Workspace spec preview
    const c = content as Record<string, unknown>;
    return (
      <div className="space-y-4">
        {Array.isArray(c.objectives) && c.objectives.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Objectives</h4>
            <ul className="text-xs text-muted-foreground ml-3 list-disc">
              {(c.objectives as string[]).map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        )}
        {Array.isArray(c.rules) && c.rules.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Rules</h4>
            <ul className="text-xs text-muted-foreground ml-3 list-disc">
              {(c.rules as string[]).map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
        {Array.isArray(c.roles) && c.roles.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Roles</h4>
            {(c.roles as Array<{ name: string; permissions: string[] }>).map((role, i) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px]">{role.name}</Badge>
                <span className="text-[10px] text-muted-foreground">{role.permissions?.join(', ')}</span>
              </div>
            ))}
          </div>
        )}
        {Array.isArray(c.channels) && c.channels.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Channels</h4>
            {(c.channels as Array<{ name: string; type: string; purpose: string }>).map((ch, i) => (
              <p key={i} className="text-xs text-muted-foreground">#{ch.name} ({ch.type}) — {ch.purpose || 'no description'}</p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{t('toolkit.specs')}</h1>
            <p className="text-sm text-muted-foreground">{t('toolkit.specsDesc')}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => startCreate('agent')}>
              {t('toolkit.agentSpec')}
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => startCreate('workspace')}>
              {t('toolkit.workspaceSpec')}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-0.5 mt-3">
          {(['all', 'agent', 'workspace'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setActiveType(tab); setSelectedId(null); }}
              className={cn(
                'px-3 py-1 text-xs rounded-md transition-colors',
                activeType === tab ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
            >
              {tab === 'all' ? t('toolkit.all') : tab === 'agent' ? t('toolkit.agentSpecs') : t('toolkit.workspaceSpecs')}
            </button>
          ))}
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div className="shrink-0 border-b px-6 py-4 bg-accent/20">
          <p className="text-sm font-medium mb-3">{t('toolkit.newSpec', { type: formType })}</p>
          <div className="space-y-2 max-w-2xl">
            <div className="flex gap-2">
              <input autoFocus value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t('toolkit.specName')}
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <select value={formVisibility} onChange={(e) => setFormVisibility(e.target.value as SpecVisibility)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
                <option value="private">{t('toolkit.visibility.private')}</option>
                <option value="workspace">{t('toolkit.visibility.workspace')}</option>
                <option value="public">{t('toolkit.visibility.public')}</option>
              </select>
            </div>
            <input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder={t('toolkit.descOptional')}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <input value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder={t('toolkit.categoryOptional')}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <textarea
              value={formContent}
              onChange={(e) => { setFormContent(e.target.value); setJsonError(null); }}
              rows={12}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            />
            {jsonError && <p className="text-xs text-red-400">{jsonError}</p>}
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="h-8 text-xs" disabled={!formName.trim()} onClick={handleCreate}>{t('common.create')}</Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setCreating(false)}>{t('common.cancel')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 min-h-0 flex">
        {/* Spec list */}
        <ScrollArea className="w-72 border-r">
          <div className="p-2 space-y-0.5">
            {isLoading && <p className="px-3 py-2 text-xs text-muted-foreground">{t('common.loading')}</p>}
            {specs && specs.length === 0 && (
              <p className="px-3 py-6 text-xs text-muted-foreground text-center">
                {t('toolkit.noSpecs')}
              </p>
            )}
            {specs?.map((spec) => (
              <button
                key={spec.id}
                type="button"
                onClick={() => { setSelectedId(spec.id); setEditing(false); }}
                className={cn(
                  'w-full text-left rounded-md px-3 py-2 transition-colors',
                  selectedId === spec.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm truncate flex-1">{spec.name}</span>
                  <span className="text-[10px] opacity-50">v{spec.version}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className={cn('text-[10px] px-1 py-0',
                    spec.specType === 'agent' ? 'text-violet-400 border-violet-400/30' : 'text-blue-400 border-blue-400/30')}>
                    {spec.specType}
                  </Badge>
                  <Badge variant="outline" className={cn('text-[10px] px-1 py-0', visibilityBadge(spec.visibility ?? 'private'))}>
                    {spec.visibility}
                  </Badge>
                  {spec.usageCount > 0 && (
                    <span className="text-[10px] opacity-50">{spec.usageCount} uses</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Detail / Editor panel */}
        <ScrollArea className="flex-1">
          {selectedSpec ? (
            <div className="p-6 max-w-3xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{selectedSpec.name}</h2>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Badge variant="outline" className={cn('text-[10px] px-1 py-0',
                      selectedSpec.specType === 'agent' ? 'text-violet-400 border-violet-400/30' : 'text-blue-400 border-blue-400/30')}>
                      {selectedSpec.specType}
                    </Badge>
                    <Badge variant="outline" className={cn('text-[10px] px-1 py-0', visibilityBadge(selectedSpec.visibility ?? 'private'))}>
                      {selectedSpec.visibility}
                    </Badge>
                    <span>v{selectedSpec.version}</span>
                    {selectedSpec.category && <span>{selectedSpec.category}</span>}
                    <span>Updated {new Date(selectedSpec.updatedAt).toLocaleString()}</span>
                  </div>
                  {selectedSpec.description && <p className="text-sm text-muted-foreground mt-2">{selectedSpec.description}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="text-xs h-7"
                    onClick={() => editing ? setEditing(false) : startEdit(selectedSpec.content as Record<string, unknown>)}>
                    {editing ? t('common.preview') : t('toolkit.editJson')}
                  </Button>
                  <Button variant="outline" size="sm"
                    className="text-red-400 border-red-400/30 hover:bg-red-400/10 text-xs h-7"
                    onClick={() => { if (confirm(t('toolkit.deleteConfirm'))) deleteSpec.mutate({ id: selectedSpec.id }); }}>
                    {t('common.delete')}
                  </Button>
                </div>
              </div>

              {editing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => { setEditContent(e.target.value); setEditError(null); }}
                    rows={20}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                  />
                  {editError && <p className="text-xs text-red-400">{editError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 text-xs" onClick={() => handleSaveEdit(selectedSpec.id)}>{t('common.save')}</Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-md p-4">
                  {renderSpecPreview(selectedSpec.content as Record<string, unknown>, selectedSpec.specType)}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p className="text-sm">{t('toolkit.selectSpec')}</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
