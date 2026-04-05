'use client';

import { trpc } from '@/lib/trpc';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Markdown } from '@/components/ui/markdown';

interface Props {
  channelId: string;
}

export function ChannelPinnedView({ channelId }: Props) {
  const { data: pins } = trpc.channelItems.listPins.useQuery({ channelId });
  const utils = trpc.useUtils();
  const unpin = trpc.channelItems.unpin.useMutation({
    onSuccess: () => utils.channelItems.listPins.invalidate({ channelId }),
  });

  return (
    <ScrollArea className="flex-1 p-6">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">Pinned Messages</h2>
        {!pins?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
              <line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
            </svg>
            <p className="text-sm">No pinned messages yet</p>
            <p className="text-xs mt-1">Hover over a message in Chat and click the pin icon</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pins.map((pin) => (
              <div key={pin.id} className="rounded-lg border p-4 group hover:bg-accent/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    {pin.senderType === 'agent' ? 'Agent' : 'User'} &middot; {new Date(pin.createdAt).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => unpin.mutate({ id: pin.id })}
                    className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-red-400 transition-all"
                  >
                    Unpin
                  </button>
                </div>
                {pin.content ? (
                  <Markdown content={pin.content} className="text-sm" />
                ) : (
                  <p className="text-sm text-muted-foreground italic">(media attachment)</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
