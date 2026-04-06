'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import type { UserItemType } from '@symbix/shared';

const PERSONAL_TABS: { id: UserItemType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'note', label: 'Notes' },
  { id: 'saved', label: 'Saved' },
  { id: 'snippet', label: 'Snippets' },
];

const SNIPPET_LANGUAGES = [
  'typescript', 'javascript', 'python', 'go', 'rust', 'bash', 'sql', 'yaml', 'json', 'markdown', 'other',
];

export function PersonalItems() {
  const [activeType, setActiveType] = useState<UserItemType | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState<UserItemType | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formLanguage, setFormLanguage] = useState('typescript');
  const [formCategory, setFormCategory] = useState('');

  const utils = trpc.useUtils();

  const { data: items, isLoading } = trpc.userItems.list.useQuery({
    type: activeType === 'all' ? undefined : activeType,
  });

  const createItem = trpc.userItems.create.useMutation({
    onSuccess: () => {
      utils.userItems.list.invalidate();
      setCreating(null);
      resetForm();
    },
  });

  const deleteItem = trpc.userItems.delete.useMutation({
    onSuccess: () => {
      utils.userItems.list.invalidate();
      setSelectedId(null);
    },
  });

  const resetForm = () => { setFormTitle(''); setFormContent(''); setFormCategory(''); setFormLanguage('typescript'); };

  const selectedItem = items?.find((i) => i.id === selectedId);

  const typeIcon = (type: string) => {
    switch (type) {
      case 'note': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
      case 'saved': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
      case 'snippet': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
      );
      default: return null;
    }
  };

  const typeBadgeColor = (type: string) => {
    switch (type) {
      case 'note': return 'text-yellow-400 border-yellow-400/30';
      case 'saved': return 'text-amber-400 border-amber-400/30';
      case 'snippet': return 'text-cyan-400 border-cyan-400/30';
      default: return '';
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Personal</h1>
            <p className="text-sm text-muted-foreground">Notes, saved messages, and code snippets</p>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="text-xs h-8"
              onClick={() => { setCreating('note'); resetForm(); }}>+ Note</Button>
            <Button variant="outline" size="sm" className="text-xs h-8"
              onClick={() => { setCreating('snippet'); resetForm(); }}>+ Snippet</Button>
          </div>
        </div>

        <div className="flex items-center gap-0.5 mt-3">
          {PERSONAL_TABS.map((tab) => (
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
            {creating === 'snippet' && (
              <select
                value={formLanguage}
                onChange={(e) => setFormLanguage(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {SNIPPET_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            )}
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder={creating === 'snippet' ? 'Paste code here...' : 'Write your note...'}
              rows={creating === 'snippet' ? 6 : 4}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y font-mono"
            />
            <input
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              placeholder="Category (optional)"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="h-8 text-xs"
                disabled={!formTitle.trim()}
                onClick={() => createItem.mutate({
                  type: creating,
                  title: formTitle.trim(),
                  content: formContent || undefined,
                  language: creating === 'snippet' ? formLanguage : undefined,
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
                {activeType === 'saved'
                  ? 'No saved messages yet. Right-click a message to save it.'
                  : 'Nothing here yet. Create a note or snippet to get started.'}
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
                  {item.language && (
                    <span className="text-[10px] text-muted-foreground">{item.language}</span>
                  )}
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
                    {selectedItem.language && <span>{selectedItem.language}</span>}
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

              {selectedItem.type === 'saved' && selectedItem.metadata && (
                <div className="mb-3 text-xs text-muted-foreground">
                  From: {(selectedItem.metadata as Record<string, unknown>).senderName as string || 'Unknown'}
                </div>
              )}

              {selectedItem.content && (
                selectedItem.type === 'snippet' ? (
                  <pre className="rounded-md bg-accent/30 p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                    <code>{selectedItem.content}</code>
                  </pre>
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <Markdown content={selectedItem.content} className="text-sm" />
                  </div>
                )
              )}

              {!selectedItem.content && (
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
