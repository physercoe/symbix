'use client';

import { AppShell } from '@/components/layout/AppShell';
import { TeamSidebar } from '@/components/layout/TeamSidebar';

export default function ToolkitLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell defaultSidebar={<TeamSidebar />}>
      {children}
    </AppShell>
  );
}
