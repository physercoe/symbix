'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Markdown } from '@/components/ui/markdown';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface Props {
  channelId: string;
}

export function ChannelDocsView({ channelId }: Props) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const { data: docs } = trpc.channelItems.list.useQuery({ channelId, type: 'doc' });
  const utils = trpc.useUtils();

  const create = trpc.channelItems.create.useMutation({
    onSuccess: (doc) => {
      utils.channelItems.list.invalidate({ channelId, type: 'doc' });
      setCreating(false);
      setNewTitle('');
      setNewContent('');
      setSelectedId(doc.id);
    },
  });
  const update = trpc.channelItems.update.useMutation({
    onSuccess: () => { utils.channelItems.list.invalidate({ channelId, type: 'doc' }); setEditing(false); },
  });
  const remove = trpc.channelItems.delete.useMutation({
    onSuccess: () => { utils.channelItems.list.invalidate({ channelId, type: 'doc' }); setSelectedId(null); },
  });

  const selected = docs?.find((d) => d.id === selectedId);

  const startEdit = () => {
    if (!selected) return;
    setEditTitle(selected.title);
    setEditContent(selected.content ?? '');
    setEditing(true);
  };

  return (
    <div className="flex flex-1 min-h-0">
      {/* ── Left: doc list / TOC ── */}
      <div className="w-56 shrink-0 border-r flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('docs.title' as any)}</span>
          <button type="button" onClick={() => { setCreating(true); setSelectedId(null); }}
            className="text-muted-foreground hover:text-foreground transition-colors" title={t('docs.newDoc' as any)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {docs?.map((doc) => (
              <button key={doc.id} type="button" onClick={() => { setSelectedId(doc.id); setCreating(false); setEditing(false); }}
                className={cn(
                  'w-full text-left rounded-md px-2.5 py-2 text-sm transition-colors',
                  selectedId === doc.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}>
                <p className="truncate">{doc.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(doc.createdAt).toLocaleDateString()}</p>
              </button>
            ))}
            {!docs?.length && !creating && (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">{t('docs.noDocs' as any)}</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Right: doc content (artifact-style) ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {creating ? (
          /* ── Create new doc ── */
          <div className="flex-1 flex flex-col p-6">
            <h2 className="text-lg font-semibold mb-4">{t('docs.newDocument' as any)}</h2>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t('docs.docTitle' as any)}
              className="mb-3 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)}
              placeholder={t('docs.contentPlaceholder' as any)}
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <div className="flex gap-2 mt-3">
              <Button onClick={() => { if (newTitle.trim()) create.mutate({ channelId, type: 'doc', title: newTitle.trim(), content: newContent }); }}
                disabled={!newTitle.trim() || create.isPending} size="sm">
                {t('common.create' as any)}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>{t('common.cancel' as any)}</Button>
            </div>
          </div>
        ) : selected ? (
          editing ? (
            /* ── Edit doc ── */
            <div className="flex-1 flex flex-col p-6">
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                className="mb-3 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <div className="flex gap-2 mt-3">
                <Button onClick={() => update.mutate({ id: selected.id, title: editTitle.trim(), content: editContent })}
                  disabled={update.isPending} size="sm">
                  {t('common.save' as any)}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>{t('common.cancel' as any)}</Button>
              </div>
            </div>
          ) : (
            /* ── View doc (rendered) ── */
            <ScrollArea className="flex-1">
              <div className="p-6 max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-xl font-bold">{selected.title}</h1>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={startEdit}>{t('common.edit' as any)}</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400 hover:text-red-300"
                      onClick={() => { if (confirm(t('docs.deleteConfirm' as any))) remove.mutate({ id: selected.id }); }}>
                      {t('common.delete' as any)}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Created {new Date(selected.createdAt).toLocaleString()}
                </p>
                {selected.content ? (
                  <div className="prose-container">
                    <Markdown content={selected.content} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">{t('docs.emptyDoc' as any)}</p>
                )}
                {selected.url && (
                  <div className="mt-4 pt-4 border-t">
                    <a href={selected.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">
                      {t('docs.externalLink' as any)} &rarr;
                    </a>
                  </div>
                )}
              </div>
            </ScrollArea>
          )
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-30">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <p className="text-sm">{t('docs.selectOrCreate' as any)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
