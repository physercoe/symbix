'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SpecEditor } from '@/components/toolkit/SpecEditor';
import { ToolkitItemList } from '@/components/toolkit/ToolkitItemList';

const tabs = [
  { key: 'specs', label: 'Specs' },
  { key: 'patterns', label: 'Patterns' },
  { key: 'references', label: 'References' },
  { key: 'insights', label: 'Insights' },
  { key: 'assets', label: 'Assets' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const validTabs = new Set<string>(tabs.map((t) => t.key));

export default function ToolkitPage() {
  const searchParams = useSearchParams();
  const paramTab = searchParams.get('tab');
  const initialTab = paramTab && validTabs.has(paramTab) ? (paramTab as TabKey) : 'specs';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Sync with URL when search params change (sidebar navigation)
  useEffect(() => {
    if (paramTab && validTabs.has(paramTab)) {
      setActiveTab(paramTab as TabKey);
    }
  }, [paramTab]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header + tabs */}
      <div className="shrink-0 border-b px-8 pt-6 pb-0">
        <h1 className="text-2xl font-bold mb-4">Toolkit</h1>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors -mb-px border-b-2',
                activeTab === tab.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'specs' && <SpecEditor />}
        {activeTab === 'patterns' && <ToolkitItemList type="pattern" />}
        {activeTab === 'references' && <ToolkitItemList type="reference" />}
        {activeTab === 'insights' && <ToolkitItemList type="insight" />}
        {activeTab === 'assets' && <ToolkitItemList type="asset" />}
      </div>
    </div>
  );
}
