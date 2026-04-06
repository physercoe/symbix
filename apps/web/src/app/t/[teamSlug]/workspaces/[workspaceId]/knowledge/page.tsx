'use client';

import { useParams } from 'next/navigation';
import { WorkspaceLibrary } from '@/components/library/WorkspaceLibrary';

export default function KnowledgePage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  return <WorkspaceLibrary workspaceId={workspaceId} />;
}
