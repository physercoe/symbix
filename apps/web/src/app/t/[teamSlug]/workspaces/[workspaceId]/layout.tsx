'use client';

import { SidebarOverride } from '@/components/layout/sidebar-context';
import { WorkspaceSidebar } from '@/components/layout/WorkspaceSidebar';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarOverride sidebar={<WorkspaceSidebar />}>
      {children}
    </SidebarOverride>
  );
}
