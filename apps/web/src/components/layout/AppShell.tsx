'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import { SidebarProvider, useSidebar } from './sidebar-context';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { wsManager } from '@/lib/ws';
import { useMessageStore } from '@/stores/message-store';
import { useAgentStore } from '@/stores/agent-store';
import { usePresenceStore } from '@/stores/presence-store';

class SidebarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-[260px] flex-col items-center justify-center bg-sidebar text-sidebar-foreground border-r p-4">
          <p className="text-xs text-red-400 text-center">Sidebar error: {this.state.error}</p>
          <button
            className="mt-2 text-xs text-blue-400 hover:underline"
            onClick={() => this.setState({ hasError: false, error: '' })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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

function ShellInner({ defaultSidebar, children }: { defaultSidebar: ReactNode; children: ReactNode }) {
  const { getToken } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { sidebar: overrideSidebar } = useSidebar();

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

  const activeSidebar = overrideSidebar ?? defaultSidebar;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <SidebarErrorBoundary>
          {activeSidebar}
        </SidebarErrorBoundary>
      </div>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen} side="left">
        <SidebarErrorBoundary>
          {activeSidebar}
        </SidebarErrorBoundary>
      </Sheet>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-12 items-center border-b px-3 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <HamburgerIcon />
          </Button>
          <div className="ml-2 flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-400">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight">Symbix</span>
          </div>
        </div>

        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ defaultSidebar, children }: { defaultSidebar: ReactNode; children: ReactNode }) {
  return (
    <SidebarProvider>
      <ShellInner defaultSidebar={defaultSidebar}>{children}</ShellInner>
    </SidebarProvider>
  );
}
