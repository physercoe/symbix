import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    // Redirect to /workspaces which will show the old homepage
    // Users with teams will see the team nav; /workspaces still works as fallback
    redirect('/workspaces');
  } else {
    redirect('/sign-in');
  }
}
