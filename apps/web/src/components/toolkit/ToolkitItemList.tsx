'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import type { UserItemType } from '@symbix/shared';

const TYPE_CONFIG: Record<UserItemType, { label: string; plural: string; description: string; badgeColor: string; hasLanguage: boolean; hasUrl: boolean; createLabel: string }> = {
  insight: { label: 'Insight', plural: 'Insights', description: 'Learnings and notes from projects', badgeColor: 'text-yellow-400 border-yellow-400/30', hasLanguage: false, hasUrl: false, createLabel: '+ Insight' },
  reference: { label: 'Reference', plural: 'References', description: 'Saved messages and bookmarks', badgeColor: 'text-amber-400 border-amber-400/30', hasLanguage: false, hasUrl: false, createLabel: '+ Reference' },
  pattern: { label: 'Pattern', plural: 'Patterns', description: 'Reusable code, prompts, and workflows', badgeColor: 'text-cyan-400 border-cyan-400/30', hasLanguage: true, hasUrl: false, createLabel: '+ Pattern' },
  asset: { label: 'Asset', plural: 'Assets', description: 'Files, images, and data you carry across projects', badgeColor: 'text-emerald-400 border-emerald-400/30', hasLanguage: false, hasUrl: true, createLabel: '+ Asset' },
};

const LANGUAGES = ['typescript', 'javascript', 'python', 'go', 'rust', 'bash', 'sql', 'yaml', 'json', 'markdown', 'prompt', 'other'];

interface Props {
  type: UserItemType;
}

export function ToolkitItemList({ type }: Props) {
  const config = TYPE_CONFIG[type];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formLanguage, setFormLanguage] = useState('typescript');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState('');

  const utils = trpc.useUtils();

  const { data: items, isLoading } = trpc.userItems.list.useQuery({ type });

  const createItem = trpc.userItems.create.useMutation({
    onSuccess: () => { utils.userItems.list.invalidate(); setCreating(false); resetForm(); },
  });
  const deleteItem = trpc.userItems.delete.useMutation({
    onSuccess: () => { utils.userItems.list.invalidate(); setSelectedId(null); },
  });

  const resetForm = () => { setFormTitle(''); setFormContent(''); setFormUrl(''); setFormCategory(''); setFormLanguage('typescript'); };
  const selectedItem = items?.find((i) => i.id === selectedId);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{config.plural}</h1>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => { setCreating(true); resetForm(); }}>
            {config.createLabel}
          </Button>
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div className="shrink-0 border-b px-6 py-4 bg-accent/20">
          <p className="text-sm font-medium mb-3">New {config.label.toLowerCase()}</p>
          <div className="space-y-2 max-w-lg">
            <input autoFocus value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Title"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            {config.hasLanguage && (
              <select value={formLanguage} onChange={(e) => setFormLanguage(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            )}
            {config.hasUrl && (
              <input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="URL or file path"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            )}
            <textarea value={formContent} onChange={(e) => setFormContent(e.target.value)}
              placeholder={type === 'pattern' ? 'Paste code or prompt...' : 'Content...'}
              rows={type === 'pattern' ? 8 : 4}
              className={cn('w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y', type === 'pattern' && 'font-mono')} />
            <input value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="Category (optional)"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="h-8 text-xs" disabled={!formTitle.trim()}
                onClick={() => createItem.mutate({
                  type, title: formTitle.trim(), content: formContent || undefined,
                  language: config.hasLanguage ? formLanguage : undefined,
                  url: formUrl || undefined, category: formCategory || undefined,
                })}>Create</Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 flex">
        <ScrollArea className="w-80 border-r">
          <div className="p-2 space-y-0.5">
            {isLoading && <p className="px-3 py-2 text-xs text-muted-foreground">Loading...</p>}
            {items && items.length === 0 && (
              <p className="px-3 py-6 text-xs text-muted-foreground text-center">
                {type === 'reference' ? 'No saved references yet. Right-click a message to save it.' : `No ${config.plural.toLowerCase()} yet.`}
              </p>
            )}
            {items?.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelectedId(item.id)}
                className={cn('w-full text-left rounded-md px-3 py-2 transition-colors',
                  selectedId === item.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground')}>
                <span className="text-sm truncate block">{item.title}</span>
                <div className="flex items-center gap-2 mt-1">
                  {item.language && <span className="text-[10px] text-muted-foreground">{item.language}</span>}
                  {item.category && <span className="text-[10px] text-muted-foreground">{item.category}</span>}
                  <span className="ml-auto text-[10px] text-muted-foreground">{new Date(item.updatedAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        <ScrollArea className="flex-1">
          {selectedItem ? (
            <div className="p-6 max-w-2xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{selectedItem.title}</h2>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Badge variant="outline" className={cn('text-[10px] px-1 py-0', config.badgeColor)}>{config.label}</Badge>
                    {selectedItem.language && <span>{selectedItem.language}</span>}
                    {selectedItem.category && <span>{selectedItem.category}</span>}
                    <span>Updated {new Date(selectedItem.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-red-400 border-red-400/30 hover:bg-red-400/10 text-xs h-7"
                  onClick={() => { if (confirm('Delete?')) deleteItem.mutate({ id: selectedItem.id }); }}>Delete</Button>
              </div>

              {type === 'reference' && selectedItem.metadata && (
                <p className="text-xs text-muted-foreground mb-3">From: {(selectedItem.metadata as Record<string, unknown>).senderName as string || 'Unknown'}</p>
              )}

              {selectedItem.url && (
                <div className="mb-3">
                  <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline break-all">{selectedItem.url}</a>
                </div>
              )}

              {selectedItem.content && (
                type === 'pattern' ? (
                  <pre className="rounded-md bg-accent/30 p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap"><code>{selectedItem.content}</code></pre>
                ) : (
                  <Markdown content={selectedItem.content} className="text-sm" />
                )
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p className="text-sm">Select an item to view</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
