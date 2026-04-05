'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Sidebar } from './Sidebar';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { wsManager } from '@/lib/ws';
import { useMessageStore } from '@/stores/message-store';
import { useAgentStore } from '@/stores/agent-store';
import { usePresenceStore } from '@/stores/presence-store';

function HamburgerIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const addMessage = useMessageStore((s) => s.addMessage);
  const setAgentStatus = useAgentStore((s) => s.setStatus);
  const appendChunk = useAgentStore((s) => s.appendChunk);
  const clearStreaming = useAgentStore((s) => s.clearStreaming);
  const setOnline = usePresenceStore((s) => s.setOnline);

  useEffect(() => {
    let mounted = true;

    async function connect() {
      const token = await getToken();
      if (token && mounted) {
        wsManager.connect(token);
      }
    }

    connect();

    const onNewMessage = (data: unknown) => {
      const d = data as {
        message: {
          id: string;
          channelId: string;
          senderType: string;
          senderId: string;
          content: string | null;
          contentType: string;
          mediaUrl: string | null;
          metadata: Record<string, unknown> | null;
          parentId: string | null;
          createdAt: string;
        };
      };
      if (d.message) {
        // Clear streaming state when agent's final message arrives
        if (d.message.senderType === 'agent') {
          clearStreaming(d.message.senderId);
        }
        addMessage(d.message.channelId, d.message);
      }
    };

    const onAgentTyping = (data: unknown) => {
      const d = data as { agentId: string; channelId: string; chunk: string };
      appendChunk(d.agentId, d.channelId, d.chunk);
    };

    const onAgentStatus = (data: unknown) => {
      const d = data as { agentId: string; status: string };
      setAgentStatus(d.agentId, d.status);
    };

    const onPresence = (data: unknown) => {
      const d = data as { userId: string; online: boolean };
      setOnline(d.userId, d.online);
    };

    wsManager.on('new_message', onNewMessage);
    wsManager.on('agent_typing', onAgentTyping);
    wsManager.on('agent_status', onAgentStatus);
    wsManager.on('presence', onPresence);

    return () => {
      mounted = false;
      wsManager.off('new_message', onNewMessage);
      wsManager.off('agent_typing', onAgentTyping);
      wsManager.off('agent_status', onAgentStatus);
      wsManager.off('presence', onPresence);
      wsManager.disconnect();
    };
  }, [getToken, addMessage, setAgentStatus, appendChunk, clearStreaming, setOnline]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar — always visible at md+ */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar — rendered inside a Sheet drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen} side="left">
        <Sidebar />
      </Sheet>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex h-14 items-center border-b px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <HamburgerIcon />
          </Button>
          <span className="ml-2 font-semibold">Symbix</span>
        </div>

        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
