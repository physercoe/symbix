'use client';

import { AppShell } from '@/components/layout/AppShell';
import { ToolkitSidebar } from '@/components/layout/ToolkitSidebar';

export default function ToolkitLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell defaultSidebar={<ToolkitSidebar />}>
      {children}
    </AppShell>
  );
}
