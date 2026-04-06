'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';

export default function ResolveTeamPage() {
  const router = useRouter();
  const { data: teams, isLoading } = trpc.teams.list.useQuery();

  useEffect(() => {
    if (isLoading) return;

    if (teams && teams.length > 0) {
      // Check localStorage for last used team
      const lastSlug = localStorage.getItem('symbix:lastTeamSlug');
      const match = lastSlug && teams.find((t) => t.slug === lastSlug);
      const target = match ?? teams[0];
      router.replace(`/t/${target.slug}`);
    } else {
      // No teams yet — fall back to old workspaces page
      router.replace('/workspaces');
    }
  }, [teams, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}
