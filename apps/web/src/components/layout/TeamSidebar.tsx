'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
import { trpc } from '@/lib/trpc';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { CreateWorkspaceDialog } from '@/components/workspace/CreateWorkspaceDialog';
import { cn } from '@/lib/utils';

// ── Helpers ──────────────────────────────────────────────────────

function ChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
      {children}
    </p>
  );
}

interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  pathname: string;
  exact?: boolean;
  count?: number;
}

function NavLink({ href, label, icon, pathname, exact, count }: NavLinkProps) {
  const searchParams = useSearchParams();

  // For links with query params (e.g. /toolkit?tab=specs), compare full URL
  const hasQuery = href.includes('?');
  let isActive: boolean;
  if (hasQuery) {
    const [hrefPath, hrefQuery] = href.split('?');
    const hrefParams = new URLSearchParams(hrefQuery);
    isActive = pathname.startsWith(hrefPath) &&
      Array.from(hrefParams.entries()).every(([k, v]) => searchParams.get(k) === v);
  } else {
    isActive = exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
        isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
      )}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] tabular-nums opacity-50">{count}</span>
      )}
    </Link>
  );
}

function PlusButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex items-center gap-2.5 rounded-md px-2.5 py-1 text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/30 transition-colors w-full"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      <span>New workspace</span>
    </button>
  );
}

// ── SVG Icons (14px for nav items) ───────────────────────────────

function UsersIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function BotIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" /></svg>;
}
function MonitorIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
}
function ChartIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
}
function SettingsIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}
function SpecsIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
}
function PatternsIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>;
}
function BookmarkIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>;
}
function LightbulbIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><line x1="9" y1="18" x2="15" y2="18" /><line x1="10" y1="22" x2="14" y2="22" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" /></svg>;
}
function BoxIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>;
}

// ── Main Component ────────────────────────────────────────────────

export function TeamSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const teamSlug = params.teamSlug as string;

  const [createWsOpen, setCreateWsOpen] = useState(false);

  const { data: teams } = trpc.teams.list.useQuery();
  const { data: team } = trpc.teams.getBySlug.useQuery({ slug: teamSlug }, { enabled: !!teamSlug });
  const { data: workspaces } = trpc.workspaces.list.useQuery(
    team ? { teamId: team.id } : undefined,
    { enabled: !!team },
  );
  const { data: agents } = trpc.agents.list.useQuery(
    { teamId: team?.id ?? '' },
    { enabled: !!team },
  );

  useEffect(() => {
    if (teamSlug) localStorage.setItem('symbix:lastTeamSlug', teamSlug);
  }, [teamSlug]);

  const base = `/t/${teamSlug}`;

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r">
      {/* Team Selector — click name goes to dashboard */}
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
              <DropdownMenuItem onClick={() => router.push(base)}>
                Team dashboard
              </DropdownMenuItem>
              <div className="my-1 h-px bg-border" />
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

      <ScrollArea className="flex-1 px-2 py-1">
        {/* ── Workspaces ─────────────────────────────── */}
        <SectionLabel>Workspaces</SectionLabel>
        <div className="space-y-0.5">
          {workspaces?.map((ws) => {
            const wsHref = `${base}/workspaces/${ws.id}`;
            const isActive = pathname.startsWith(wsHref);
            return (
              <Link
                key={ws.id}
                href={wsHref}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/60 text-[10px] font-semibold">
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{ws.name}</span>
              </Link>
            );
          })}
          <PlusButton onClick={() => setCreateWsOpen(true)} title="Create workspace" />
        </div>

        {/* ── Team ───────────────────────────────────── */}
        <SectionLabel>Team</SectionLabel>
        <div className="space-y-0.5">
          <NavLink href={`${base}/members`} label="Members" icon={<UsersIcon />} pathname={pathname} />
          <NavLink href={`${base}/agents`} label="Agents" icon={<BotIcon />} pathname={pathname} count={agents?.length} />
          <NavLink href={`${base}/machines`} label="Machines" icon={<MonitorIcon />} pathname={pathname} />
        </div>

        {/* ── Toolkit ────────────────────────────────── */}
        <SectionLabel>Toolkit</SectionLabel>
        <div className="space-y-0.5">
          <NavLink href={`${base}/toolkit?tab=specs`} label="Specs" icon={<SpecsIcon />} pathname={pathname} exact />
          <NavLink href={`${base}/toolkit?tab=patterns`} label="Patterns" icon={<PatternsIcon />} pathname={pathname} exact />
          <NavLink href={`${base}/toolkit?tab=references`} label="References" icon={<BookmarkIcon />} pathname={pathname} exact />
          <NavLink href={`${base}/toolkit?tab=insights`} label="Insights" icon={<LightbulbIcon />} pathname={pathname} exact />
          <NavLink href={`${base}/toolkit?tab=assets`} label="Assets" icon={<BoxIcon />} pathname={pathname} exact />
        </div>

        {/* ── Admin ──────────────────────────────────── */}
        <Separator className="my-3" />
        <div className="space-y-0.5">
          <NavLink href={`${base}/metrics`} label="Metrics" icon={<ChartIcon />} pathname={pathname} />
          <NavLink href={`${base}/settings`} label="Settings" icon={<SettingsIcon />} pathname={pathname} />
        </div>
      </ScrollArea>

      <Separator />

      {/* User */}
      <div className="flex items-center gap-2 p-3">
        <UserButton afterSignOutUrl="/sign-in" />
        <span className="truncate text-sm">{user?.firstName ?? user?.username ?? 'User'}</span>
      </div>

      {/* Dialogs */}
      {team && (
        <CreateWorkspaceDialog
          open={createWsOpen}
          onOpenChange={setCreateWsOpen}
          teamId={team.id}
        />
      )}
    </div>
  );
}
