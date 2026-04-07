import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { TRPCProvider } from '@/lib/trpc';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Symbix', template: '%s — Symbix' },
  description: 'Agent-native collaboration platform — humans, AI agents, and machines in shared channels.',
  metadataBase: new URL('https://symbix.dev'),
  openGraph: {
    title: 'Symbix',
    description: 'Where humans, AI, and machines work as one.',
    siteName: 'Symbix',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Symbix',
    description: 'Where humans, AI, and machines work as one.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f1117',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          integrity="sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans antialiased">
        <ClerkProvider
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: '#3b82f6',
              borderRadius: '0.5rem',
            },
          }}
        >
          <TRPCProvider>
            {children}
          </TRPCProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
