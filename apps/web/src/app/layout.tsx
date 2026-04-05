import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { TRPCProvider } from '@/lib/trpc';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Symbix',
  description: 'Where humans, AI, and machines work as one.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="font-sans antialiased">
        <ClerkProvider appearance={{ baseTheme: dark }}>
          <TRPCProvider>
            {children}
          </TRPCProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
