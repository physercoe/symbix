'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface SidebarContextValue {
  sidebar: ReactNode | null;
  setSidebar: (node: ReactNode | null) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  sidebar: null,
  setSidebar: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [sidebar, setSidebar] = useState<ReactNode | null>(null);
  return (
    <SidebarContext.Provider value={{ sidebar, setSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

/**
 * Renders children and overrides the sidebar in the nearest SidebarProvider.
 * Used by nested layouts (e.g. workspace layout) to swap the sidebar
 * without creating a second shell.
 */
export function SidebarOverride({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const { setSidebar } = useSidebar();

  useEffect(() => {
    setSidebar(sidebar);
    return () => setSidebar(null);
  }, [sidebar, setSidebar]);

  return <>{children}</>;
}
