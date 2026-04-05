'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Props {
  channelId: string;
}

const STATUS_ORDER = ['open', 'in_progress', 'done'] as const;
const STATUS_LABELS: Record<string, string> = { open: 'Open', in_progress: 'In Progress', done: 'Done' };
const STATUS_COLORS: Record<string, string> = { open: 'bg-blue-500', in_progress: 'bg-yellow-500', done: 'bg-green-500' };

export function ChannelTasksView({ channelId }: Props) {
  const [title, setTitle] = useState('');
  const { data: tasks } = trpc.channelItems.list.useQuery({ channelId, type: 'task' });
  const utils = trpc.useUtils();

  const create = trpc.channelItems.create.useMutation({
    onSuccess: () => { utils.channelItems.list.invalidate({ channelId, type: 'task' }); setTitle(''); },
  });
  const update = trpc.channelItems.update.useMutation({
    onSuccess: () => utils.channelItems.list.invalidate({ channelId, type: 'task' }),
  });
  const remove = trpc.channelItems.delete.useMutation({
    onSuccess: () => utils.channelItems.list.invalidate({ channelId, type: 'task' }),
  });

  const grouped = {
    open: tasks?.filter((t) => t.status === 'open' || !t.status) ?? [],
    in_progress: tasks?.filter((t) => t.status === 'in_progress') ?? [],
    done: tasks?.filter((t) => t.status === 'done') ?? [],
  };

  const cycleStatus = (current: string | null) => {
    if (current === 'open' || !current) return 'in_progress';
    if (current === 'in_progress') return 'done';
    return 'open';
  };

  return (
    <ScrollArea className="flex-1 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <span className="text-xs text-muted-foreground">{tasks?.length ?? 0} total</span>
        </div>

        {/* Quick add */}
        <form
          onSubmit={(e) => { e.preventDefault(); if (title.trim()) create.mutate({ channelId, type: 'task', title: title.trim(), status: 'open' }); }}
          className="mb-6 flex gap-2"
        >
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task..."
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <Button type="submit" size="sm" disabled={!title.trim() || create.isPending}>Add</Button>
        </form>

        {/* Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_ORDER.map((status) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <div className={cn('h-2.5 w-2.5 rounded-full', STATUS_COLORS[status])} />
                <h3 className="text-sm font-medium">{STATUS_LABELS[status]}</h3>
                <span className="text-xs text-muted-foreground ml-auto">{grouped[status].length}</span>
              </div>
              <div className="space-y-2">
                {grouped[status].length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">No tasks</p>
                )}
                {grouped[status].map((task) => (
                  <div key={task.id} className="rounded-lg border p-3 group hover:bg-accent/20 transition-colors">
                    <div className="flex items-start gap-2">
                      <button type="button" onClick={() => update.mutate({ id: task.id, status: cycleStatus(task.status) })}
                        className="mt-0.5 shrink-0" title={`Click to move to ${STATUS_LABELS[cycleStatus(task.status)]}`}>
                        <div className={cn('h-3.5 w-3.5 rounded-full border-2', STATUS_COLORS[task.status ?? 'open'] ?? 'bg-gray-500',
                          task.status === 'done' ? 'border-green-500' : 'border-current')} />
                      </button>
                      <p className={cn('text-sm flex-1', task.status === 'done' && 'line-through text-muted-foreground')}>
                        {task.title}
                      </p>
                      <button type="button" onClick={() => { if (confirm('Delete task?')) remove.mutate({ id: task.id }); }}
                        className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 pl-5">{new Date(task.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
