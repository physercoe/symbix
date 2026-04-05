'use client';

import { create } from 'zustand';

interface PresenceState {
  online: Set<string>; // userIds that are online
  setOnline: (userId: string, isOnline: boolean) => void;
  isOnline: (userId: string) => boolean;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  online: new Set(),
  setOnline: (userId, isOnline) =>
    set((state) => {
      const next = new Set(state.online);
      if (isOnline) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return { online: next };
    }),
  isOnline: (userId) => get().online.has(userId),
}));
