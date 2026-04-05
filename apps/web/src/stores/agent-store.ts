'use client';

import { create } from 'zustand';

interface StreamingMessage {
  agentId: string;
  channelId: string;
  content: string;
}

interface AgentState {
  statuses: Record<string, string>; // agentId -> status
  streaming: Record<string, StreamingMessage>; // agentId -> accumulated streaming
  appendChunk: (agentId: string, channelId: string, chunk: string) => void;
  clearStreaming: (agentId: string) => void;
  setStatus: (agentId: string, status: string) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  statuses: {},
  streaming: {},
  appendChunk: (agentId, channelId, chunk) =>
    set((state) => {
      const existing = state.streaming[agentId];
      const content =
        existing && existing.channelId === channelId
          ? existing.content + chunk
          : chunk;
      return {
        streaming: {
          ...state.streaming,
          [agentId]: { agentId, channelId, content },
        },
      };
    }),
  clearStreaming: (agentId) =>
    set((state) => {
      if (!state.streaming[agentId]) return state;
      const { [agentId]: _, ...rest } = state.streaming;
      return { streaming: rest };
    }),
  setStatus: (agentId, status) =>
    set((state) => ({
      statuses: { ...state.statuses, [agentId]: status },
    })),
}));
