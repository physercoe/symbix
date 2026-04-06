'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ToolkitLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const teamSlug = localStorage.getItem('symbix:lastTeamSlug');
    if (teamSlug) {
      router.replace(`/t/${teamSlug}/toolkit`);
    }
  }, [router]);

  // Show children briefly while redirecting (or if no team slug stored)
  return <>{children}</>;
}
