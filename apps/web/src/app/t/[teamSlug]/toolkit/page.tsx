'use client';

import { useSearchParams } from 'next/navigation';
import { SpecEditor } from '@/components/toolkit/SpecEditor';
import { ToolkitItemList } from '@/components/toolkit/ToolkitItemList';

const validTabs = new Set(['specs', 'patterns', 'references', 'insights', 'assets']);

export default function ToolkitPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const activeTab = tab && validTabs.has(tab) ? tab : 'specs';

  if (activeTab === 'specs') return <SpecEditor />;
  if (activeTab === 'patterns') return <ToolkitItemList type="pattern" />;
  if (activeTab === 'references') return <ToolkitItemList type="reference" />;
  if (activeTab === 'insights') return <ToolkitItemList type="insight" />;
  if (activeTab === 'assets') return <ToolkitItemList type="asset" />;

  return <SpecEditor />;
}
