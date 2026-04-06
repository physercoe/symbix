'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const pathToTab: Record<string, string> = {
  '/toolkit/specs': 'specs',
  '/toolkit/patterns': 'patterns',
  '/toolkit/references': 'references',
  '/toolkit/insights': 'insights',
  '/toolkit/assets': 'assets',
};

export default function ToolkitLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const teamSlug = localStorage.getItem('symbix:lastTeamSlug');
    if (teamSlug) {
      const tab = pathToTab[pathname] ?? 'specs';
      router.replace(`/t/${teamSlug}/toolkit?tab=${tab}`);
    }
  }, [router, pathname]);

  return <>{children}</>;
}
