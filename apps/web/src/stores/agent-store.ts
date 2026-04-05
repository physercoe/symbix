'use client';

import { create } from 'zustand';

interface AgentTyping {
  agentId: string;
  channelId: string;
  chunk: string;
}

interface AgentState {
  statuses: Map<string, string>; // agentId -> status
  typing: Map<string, AgentTyping>; // agentId -> latest typing data
  setStatus: (agentId: string, status: string) => void;
  setTyping: (agentId: string, data: AgentTyping | null) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  statuses: new Map(),
  typing: new Map(),
  setStatus: (agentId, status) =>
    set((state) => {
      const next = new Map(state.statuses);
      next.set(agentId, status);
      return { statuses: next };
    }),
  setTyping: (agentId, data) =>
    set((state) => {
      const next = new Map(state.typing);
      if (data) {
        next.set(agentId, data);
      } else {
        next.delete(agentId);
      }
      return { typing: next };
    }),
}));
