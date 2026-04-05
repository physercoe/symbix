'use client';

import { useParams } from 'next/navigation';
import { ChatView } from '@/components/chat/ChatView';

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.channelId as string;

  return <ChatView channelId={channelId} />;
}
