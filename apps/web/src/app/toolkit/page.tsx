'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ToolkitIndex() {
  const router = useRouter();
  useEffect(() => { router.replace('/toolkit/specs'); }, [router]);
  return null;
}
