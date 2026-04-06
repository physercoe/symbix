'use client';

import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';

export default function WorkspacesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell defaultSidebar={<Sidebar />}>
      {children}
    </AppShell>
  );
}
