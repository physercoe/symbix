import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import type { Message } from '@symbix/shared';

interface Props {
  message: Message;
  showHeader: boolean;
  senderName?: string;
}

export function MessageBubble({ message, showHeader, senderName }: Props) {
  const isAgent = message.senderType === 'agent';
  const isSystem = message.senderType === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-xs text-muted-foreground italic">
          {message.content}
        </span>
      </div>
    );
  }

  const displayName = senderName || message.senderId.slice(0, 8);
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={cn(
        'group flex gap-3 px-1 py-0.5 hover:bg-accent/30 rounded',
        !showHeader && 'pl-12',
      )}
    >
      {showHeader && (
        <Avatar
          size="sm"
          fallback={isAgent ? displayName[0]?.toUpperCase() ?? 'A' : displayName[0]?.toUpperCase() ?? 'U'}
          className={cn(isAgent && 'bg-violet-500/20')}
        />
      )}
      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={cn(
                'text-sm font-semibold',
                isAgent && 'text-violet-400',
              )}
            >
              {displayName}
            </span>
            {isAgent && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                Agent
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
        )}
        {message.content && (
          <Markdown content={message.content} className="text-sm" />
        )}
      </div>
    </div>
  );
}
