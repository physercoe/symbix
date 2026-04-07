'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/lib/i18n';

interface Props {
  channelId: string;
}

export function ChannelLinksView({ channelId }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const { data: links } = trpc.channelItems.list.useQuery({ channelId, type: 'link' });
  const utils = trpc.useUtils();

  const create = trpc.channelItems.create.useMutation({
    onSuccess: () => { utils.channelItems.list.invalidate({ channelId, type: 'link' }); setTitle(''); setUrl(''); },
  });
  const remove = trpc.channelItems.delete.useMutation({
    onSuccess: () => utils.channelItems.list.invalidate({ channelId, type: 'link' }),
  });

  return (
    <ScrollArea className="flex-1 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('links.title' as any)}</h2>
          <span className="text-xs text-muted-foreground">{links?.length ?? 0} {t('links.saved' as any)}</span>
        </div>

        {/* Quick add */}
        <form onSubmit={(e) => { e.preventDefault(); if (title.trim() && url.trim()) create.mutate({ channelId, type: 'link', title: title.trim(), url: url.trim() }); }}
          className="mb-6 flex gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('common.title' as any)}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('links.urlPlaceholder' as any)}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <Button type="submit" size="sm" disabled={!title.trim() || !url.trim() || create.isPending}>{t('common.add' as any)}</Button>
        </form>

        {!links?.length && <p className="text-sm text-muted-foreground text-center py-8">{t('links.noLinks' as any)}</p>}

        <div className="space-y-2">
          {links?.map((link) => (
            <div key={link.id} className="flex items-center gap-3 rounded-lg border p-3 group hover:bg-accent/20 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-accent shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <a href={link.url ?? '#'} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline truncate block">
                  {link.title}
                </a>
                <p className="text-xs text-muted-foreground truncate">{link.url}</p>
              </div>
              <button type="button" onClick={() => { if (confirm(t('links.removeConfirm' as any))) remove.mutate({ id: link.id }); }}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
