'use client';

import { useParams } from 'next/navigation';

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.channelId as string;

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <p>Channel {channelId} — Chat UI coming in Phase 8</p>
    </div>
  );
}
