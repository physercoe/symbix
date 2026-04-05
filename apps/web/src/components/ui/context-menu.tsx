'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ContextMenuProps {
  children: React.ReactNode;
  menu: React.ReactNode;
}

interface Position {
  x: number;
  y: number;
}

function ContextMenu({ children, menu }: ContextMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState<Position>({ x: 0, y: 0 });
  const menuRef = React.useRef<HTMLDivElement>(null);

  const handleContextMenu = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Position menu, clamping to viewport
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    setPosition({ x, y });
    setOpen(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    function handleClose(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener('mousedown', handleClose);
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  return (
    <>
      <div onContextMenu={handleContextMenu}>{children}</div>
      {open && (
        <div
          ref={menuRef}
          className="fixed z-[100] min-w-[10rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
          style={{ left: position.x, top: position.y }}
          onClick={() => setOpen(false)}
        >
          {menu}
        </div>
      )}
    </>
  );
}

function ContextMenuItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
        className,
      )}
      {...props}
    />
  );
}

function ContextMenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}

export { ContextMenu, ContextMenuItem, ContextMenuSeparator };
