'use client';

import { create } from 'zustand';
import type { Message } from '@symbix/shared';

interface MessageState {
  messages: Map<string, Message[]>; // channelId -> messages
  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (channelId: string, message: Message) => void;
  prependMessages: (channelId: string, messages: Message[]) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: new Map(),
  setMessages: (channelId, messages) =>
    set((state) => {
      const next = new Map(state.messages);
      next.set(channelId, messages);
      return { messages: next };
    }),
  addMessage: (channelId, message) =>
    set((state) => {
      const next = new Map(state.messages);
      const existing = next.get(channelId) ?? [];
      // Deduplicate by id
      if (existing.some((m) => m.id === message.id)) return state;
      next.set(channelId, [...existing, message]);
      return { messages: next };
    }),
  prependMessages: (channelId, messages) =>
    set((state) => {
      const next = new Map(state.messages);
      const existing = next.get(channelId) ?? [];
      const existingIds = new Set(existing.map((m) => m.id));
      const newMsgs = messages.filter((m) => !existingIds.has(m.id));
      next.set(channelId, [...newMsgs, ...existing]);
      return { messages: next };
    }),
}));
