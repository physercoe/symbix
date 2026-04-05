'use client';

import { create } from 'zustand';

interface StreamingMessage {
  agentId: string;
  channelId: string;
  content: string; // accumulated text
}

interface AgentState {
  statuses: Map<string, string>; // agentId -> status
  streaming: Map<string, StreamingMessage>; // agentId -> accumulated streaming response
  appendChunk: (agentId: string, channelId: string, chunk: string) => void;
  clearStreaming: (agentId: string) => void;
  setStatus: (agentId: string, status: string) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  statuses: new Map(),
  streaming: new Map(),
  appendChunk: (agentId, channelId, chunk) =>
    set((state) => {
      const next = new Map(state.streaming);
      const existing = next.get(agentId);
      if (existing && existing.channelId === channelId) {
        next.set(agentId, { ...existing, content: existing.content + chunk });
      } else {
        next.set(agentId, { agentId, channelId, content: chunk });
      }
      return { streaming: next };
    }),
  clearStreaming: (agentId) =>
    set((state) => {
      if (!state.streaming.has(agentId)) return state;
      const next = new Map(state.streaming);
      next.delete(agentId);
      return { streaming: next };
    }),
  setStatus: (agentId, status) =>
    set((state) => {
      const next = new Map(state.statuses);
      next.set(agentId, status);
      return { statuses: next };
    }),
}));
