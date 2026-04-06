'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import type { WorkspaceItemType } from '@symbix/shared';

const LIBRARY_TABS: { id: WorkspaceItemType | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '' },
  { id: 'doc', label: 'Docs', icon: '' },
  { id: 'file', label: 'Files', icon: '' },
  { id: 'link', label: 'Links', icon: '' },
  { id: 'template', label: 'Templates', icon: '' },
];

interface Props {
  workspaceId: string;
}

export function WorkspaceLibrary({ workspaceId }: Props) {
  const [activeType, setActiveType] = useState<WorkspaceItemType | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState<WorkspaceItemType | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState('');

  const utils = trpc.useUtils();

  const { data: items, isLoading } = trpc.workspaceItems.list.useQuery({
    workspaceId,
    type: activeType === 'all' ? undefined : activeType,
  });

  const createItem = trpc.workspaceItems.create.useMutation({
    onSuccess: () => {
      utils.workspaceItems.list.invalidate({ workspaceId });
      setCreating(null);
      resetForm();
    },
  });

  const deleteItem = trpc.workspaceItems.delete.useMutation({
    onSuccess: () => {
      utils.workspaceItems.list.invalidate({ workspaceId });
      setSelectedId(null);
    },
  });

  const resetForm = () => { setFormTitle(''); setFormContent(''); setFormUrl(''); setFormCategory(''); };

  const selectedItem = items?.find((i) => i.id === selectedId);

  const typeIcon = (type: string) => {
    switch (type) {
      case 'doc': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
        </svg>
      );
      case 'file': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
        </svg>
      );
      case 'link': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
      case 'template': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      );
      default: return null;
    }
  };

  const typeBadgeColor = (type: string) => {
    switch (type) {
      case 'doc': return 'text-blue-400 border-blue-400/30';
      case 'file': return 'text-emerald-400 border-emerald-400/30';
      case 'link': return 'text-purple-400 border-purple-400/30';
      case 'template': return 'text-orange-400 border-orange-400/30';
      default: return '';
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Library</h1>
            <p className="text-sm text-muted-foreground">Shared docs, files, links, and templates</p>
          </div>
          <div className="flex gap-1">
            {(['doc', 'file', 'link', 'template'] as const).map((type) => (
              <Button key={type} variant="outline" size="sm" className="text-xs h-8"
                onClick={() => { setCreating(type); resetForm(); }}>
                + {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Type tabs */}
        <div className="flex items-center gap-0.5 mt-3">
          {LIBRARY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveType(tab.id); setSelectedId(null); }}
              className={cn(
                'px-3 py-1 text-xs rounded-md transition-colors whitespace-nowrap',
                activeType === tab.id
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
            >
              {tab.label}
              {items && tab.id === 'all' && <span className="ml-1 opacity-60">{items.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div className="shrink-0 border-b px-6 py-4 bg-accent/20">
          <p className="text-sm font-medium mb-3">New {creating}</p>
          <div className="space-y-2 max-w-lg">
            <input
              autoFocus
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {(creating === 'link' || creating === 'file') && (
              <input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder={creating === 'link' ? 'URL (https://...)' : 'File path or URL'}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            )}
            {(creating === 'doc' || creating === 'template') && (
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder={creating === 'doc' ? 'Write in Markdown...' : 'Template content (Markdown)...'}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
            )}
            <input
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              placeholder="Category (optional, e.g. onboarding, api-refs)"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="h-8 text-xs"
                disabled={!formTitle.trim()}
                onClick={() => createItem.mutate({
                  workspaceId,
                  type: creating,
                  title: formTitle.trim(),
                  content: formContent || undefined,
                  url: formUrl || undefined,
                  category: formCategory || undefined,
                })}>
                Create
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setCreating(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 min-h-0 flex">
        {/* Item list */}
        <ScrollArea className="w-80 border-r">
          <div className="p-2 space-y-0.5">
            {isLoading && <p className="px-3 py-2 text-xs text-muted-foreground">Loading...</p>}
            {items && items.length === 0 && (
              <p className="px-3 py-6 text-xs text-muted-foreground text-center">
                No items yet. Create one to get started.
              </p>
            )}
            {items?.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  'w-full text-left rounded-md px-3 py-2 transition-colors',
                  selectedId === item.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground',
                )}
              >
                <div className="flex items-center gap-2">
                  {typeIcon(item.type)}
                  <span className="text-sm truncate flex-1">{item.title}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={cn('text-[10px] px-1 py-0', typeBadgeColor(item.type))}>
                    {item.type}
                  </Badge>
                  {item.category && (
                    <span className="text-[10px] text-muted-foreground truncate">{item.category}</span>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Detail panel */}
        <ScrollArea className="flex-1">
          {selectedItem ? (
            <div className="p-6 max-w-2xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {typeIcon(selectedItem.type)}
                    <h2 className="text-lg font-semibold">{selectedItem.title}</h2>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className={cn('text-[10px] px-1 py-0', typeBadgeColor(selectedItem.type))}>
                      {selectedItem.type}
                    </Badge>
                    {selectedItem.category && <span>{selectedItem.category}</span>}
                    <span>Updated {new Date(selectedItem.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
                <Button
                  variant="outline" size="sm"
                  className="text-red-400 border-red-400/30 hover:bg-red-400/10 text-xs h-7"
                  onClick={() => { if (confirm('Delete this item?')) deleteItem.mutate({ id: selectedItem.id }); }}
                >
                  Delete
                </Button>
              </div>

              {selectedItem.url && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-1">URL</p>
                  <a href={selectedItem.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:underline break-all">
                    {selectedItem.url}
                  </a>
                </div>
              )}

              {selectedItem.content && (
                <div className="prose prose-sm prose-invert max-w-none">
                  <Markdown content={selectedItem.content} className="text-sm" />
                </div>
              )}

              {!selectedItem.content && !selectedItem.url && (
                <p className="text-sm text-muted-foreground">No content.</p>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p className="text-sm">Select an item to view details</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
