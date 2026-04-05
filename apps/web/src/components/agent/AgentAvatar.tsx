import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Props {
  name: string;
  avatarUrl?: string | null;
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusDotColors: Record<string, string> = {
  active: 'bg-green-500',
  sleeping: 'bg-yellow-500',
  offline: 'bg-gray-500',
  error: 'bg-red-500',
  disabled: 'bg-gray-500',
  charging: 'bg-blue-500',
};

export function AgentAvatar({ name, avatarUrl, status, size = 'md' }: Props) {
  const dotSize = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';

  return (
    <div className="relative inline-block">
      <Avatar src={avatarUrl} fallback={name.charAt(0).toUpperCase()} size={size} />
      <span
        className={cn(
          'absolute bottom-0 right-0 rounded-full border-2 border-card',
          dotSize,
          statusDotColors[status] ?? 'bg-gray-500',
        )}
      />
    </div>
  );
}
