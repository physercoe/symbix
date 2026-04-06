'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
import { trpc } from '@/lib/trpc';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

function ChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  pathname: string;
  exact?: boolean;
}

function NavLink({ href, label, icon, pathname, exact }: NavLinkProps) {
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
        isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

// ── SVG Icons ─────────────────────────────────────────────────────

function HomeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function UsersIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function BotIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" /></svg>;
}
function MonitorIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
}
function ChartIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
}
function FolderIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
}
function WrenchIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>;
}
function SettingsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}

// ── Main Component ────────────────────────────────────────────────

export function TeamSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const teamSlug = params.teamSlug as string;

  const { data: teams } = trpc.teams.list.useQuery();
  const { data: team } = trpc.teams.getBySlug.useQuery({ slug: teamSlug }, { enabled: !!teamSlug });
  const { data: workspaces } = trpc.workspaces.list.useQuery(
    team ? { teamId: team.id } : undefined,
    { enabled: !!team },
  );

  const base = `/t/${teamSlug}`;

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r">
      {/* Team Selector */}
      <div className="flex h-12 items-center border-b px-3">
        <DropdownMenu
          trigger={
            <div className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/50 transition-colors min-w-0 flex-1">
              {team ? (
                <>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-semibold">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold truncate">{team.name}</span>
                  <ChevronDown />
                </>
              ) : (
                <span className="text-sm font-semibold">Symbix</span>
              )}
            </div>
          }
        >
          {teams && teams.length > 0 && (
            <>
              <p className="px-2 py-1 text-xs text-muted-foreground">Switch team</p>
              {teams.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() => router.push(`/t/${t.slug}`)}
                  className={cn(t.slug === teamSlug && 'bg-accent')}
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-[10px] font-semibold mr-2">
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{t.name}</span>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-2">
        <div className="space-y-0.5">
          <NavLink href={base} label="Home" icon={<HomeIcon />} pathname={pathname} exact />
          <NavLink href={`${base}/members`} label="Members" icon={<UsersIcon />} pathname={pathname} />
          <NavLink href={`${base}/agents`} label="Agents" icon={<BotIcon />} pathname={pathname} />
          <NavLink href={`${base}/machines`} label="Machines" icon={<MonitorIcon />} pathname={pathname} />
          <NavLink href={`${base}/metrics`} label="Metrics" icon={<ChartIcon />} pathname={pathname} />
          <NavLink href={`${base}/workspaces`} label="Workspaces" icon={<FolderIcon />} pathname={pathname} />
        </div>

        <Separator className="my-3" />

        <div className="space-y-0.5">
          <NavLink href="/toolkit/specs" label="Toolkit" icon={<WrenchIcon />} pathname={pathname} />
          <NavLink href={`${base}/settings`} label="Settings" icon={<SettingsIcon />} pathname={pathname} />
        </div>

        {/* Recent Workspaces */}
        {workspaces && workspaces.length > 0 && (
          <>
            <Separator className="my-3" />
            <p className="px-2.5 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recent Workspaces
            </p>
            <div className="space-y-0.5 mt-1">
              {workspaces.slice(0, 5).map((ws) => {
                const wsHref = `${base}/workspaces/${ws.id}`;
                const isActive = pathname.startsWith(wsHref);
                return (
                  <Link
                    key={ws.id}
                    href={wsHref}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                      isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    )}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent text-[10px] font-semibold">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{ws.name}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </ScrollArea>

      <Separator />

      {/* User section */}
      <div className="flex items-center gap-2 p-3">
        <UserButton afterSignOutUrl="/sign-in" />
        <span className="truncate text-sm">{user?.firstName ?? user?.username ?? 'User'}</span>
      </div>
    </div>
  );
}
