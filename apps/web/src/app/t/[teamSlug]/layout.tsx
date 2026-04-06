import { TeamShell } from '@/components/layout/TeamShell';

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <TeamShell>{children}</TeamShell>;
}
