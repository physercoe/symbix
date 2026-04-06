import { AppShell } from '@/components/layout/AppShell';

export default function ToolkitLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
