import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    // Redirect to team resolver which will find the user's default team
    redirect('/resolve-team');
  } else {
    redirect('/sign-in');
  }
}
