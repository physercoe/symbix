'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: 'left' | 'right';
}

function Sheet({ open, onOpenChange, children, side = 'left' }: SheetProps) {
  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div
        className={cn(
          'fixed inset-y-0 z-50 w-72 bg-card border-r shadow-lg transition-transform',
          side === 'left' ? 'left-0' : 'right-0 border-l border-r-0',
        )}
      >
        {children}
      </div>
    </div>
  );
}

export { Sheet };
