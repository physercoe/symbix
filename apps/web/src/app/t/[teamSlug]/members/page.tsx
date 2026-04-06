'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const roleBadgeColor: Record<string, string> = {
  owner: 'bg-amber-500/20 text-amber-400',
  admin: 'bg-blue-500/20 text-blue-400',
  member: 'bg-zinc-500/20 text-zinc-400',
  viewer: 'bg-zinc-500/20 text-zinc-500',
};

export default function TeamMembersPage() {
  const { teamSlug } = useParams() as { teamSlug: string };
  const { data: team } = trpc.teams.getBySlug.useQuery({ slug: teamSlug });
  const { data: members, isLoading } = trpc.teams.listMembers.useQuery(
    { teamId: team?.id ?? '' },
    { enabled: !!team },
  );
  const utils = trpc.useUtils();

  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('member');

  const addMember = trpc.teams.addMember.useMutation({
    onSuccess: () => {
      utils.teams.listMembers.invalidate({ teamId: team?.id ?? '' });
      setEmail('');
      setShowInvite(false);
    },
  });

  const removeMember = trpc.teams.removeMember.useMutation({
    onSuccess: () => utils.teams.listMembers.invalidate({ teamId: team?.id ?? '' }),
  });

  const updateRole = trpc.teams.updateMemberRole.useMutation({
    onSuccess: () => utils.teams.listMembers.invalidate({ teamId: team?.id ?? '' }),
  });

  return (
    <div className="flex h-full overflow-auto">
      <div className="w-full max-w-3xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Members</h1>
            <p className="text-sm text-muted-foreground mt-1">{members?.length ?? 0} team members</p>
          </div>
          <Button size="sm" onClick={() => setShowInvite(!showInvite)}>
            + Invite Member
          </Button>
        </div>

        {showInvite && (
          <form
            className="flex gap-2 items-end rounded-lg border p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim() && team) {
                addMember.mutate({ teamId: team.id, email: email.trim(), role: role as 'member' | 'admin' | 'viewer' });
              }
            }}
          >
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <Button type="submit" disabled={addMember.isPending}>
              {addMember.isPending ? 'Adding...' : 'Add'}
            </Button>
          </form>
        )}

        {addMember.error && (
          <p className="text-sm text-red-400">{addMember.error.message}</p>
        )}

        <div className="space-y-2">
          {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          {members?.map((member) => (
            <div key={member.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold">
                {(member.userName ?? 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.userName ?? 'Unknown'}</p>
                <p className="text-xs text-muted-foreground truncate">{member.userEmail}</p>
              </div>
              <Badge className={roleBadgeColor[member.role] ?? ''}>
                {member.role}
              </Badge>
              {member.role !== 'owner' && team && (
                <div className="flex gap-1">
                  <select
                    value={member.role}
                    onChange={(e) => updateRole.mutate({ teamId: team.id, userId: member.userId, role: e.target.value as 'admin' | 'member' | 'viewer' })}
                    className="h-7 rounded border border-input bg-background px-2 text-xs"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 h-7 px-2 text-xs"
                    onClick={() => {
                      if (confirm(`Remove ${member.userName ?? 'this member'}?`)) {
                        removeMember.mutate({ teamId: team.id, userId: member.userId });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
