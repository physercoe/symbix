'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MACHINE_TYPES = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'server', label: 'Server' },
  { value: 'cloud', label: 'Cloud VM' },
  { value: 'robot', label: 'Robot' },
  { value: 'browser', label: 'Browser' },
] as const;

export function AddMachineDialog({ workspaceId, open, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [machineType, setMachineType] = useState<string>('desktop');
  const [result, setResult] = useState<{ apiKey: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const utils = trpc.useUtils();

  const register = trpc.machines.register.useMutation({
    onSuccess: (machine) => {
      utils.machines.list.invalidate({ workspaceId });
      setResult({ apiKey: machine.apiKey, name: machine.name });
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setName('');
      setMachineType('desktop');
      setResult(null);
      setCopied(false);
    }, 200);
  };

  const connectCommand = result ? `npx @symbix/agent-bridge connect ${result.apiKey}` : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(connectCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Machine Registered</DialogTitle>
            <DialogDescription>
              Run this command on &quot;{result.name}&quot; to connect it to Symbix:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-secondary p-3">
              <code className="text-sm break-all">{connectCommand}</code>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy} className="w-full">
              {copied ? 'Copied!' : 'Copy command'}
            </Button>
            <p className="text-xs text-muted-foreground">
              This API key will only be shown once. Store it safely if needed.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Machine</DialogTitle>
          <DialogDescription>
            Register a machine to run agents on it.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              register.mutate({
                workspaceId,
                name: name.trim(),
                machineType: machineType as 'desktop' | 'server' | 'robot' | 'browser' | 'cloud',
              });
            }
          }}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="m-name" className="text-sm font-medium">Machine name</label>
              <Input
                id="m-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="laptop-01"
                autoFocus
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Type</p>
              <div className="flex flex-wrap gap-2">
                {MACHINE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setMachineType(t.value)}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-sm transition-colors',
                      machineType === t.value
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-input text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || register.isPending}>
              {register.isPending ? 'Registering...' : 'Register'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
