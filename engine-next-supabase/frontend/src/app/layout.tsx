import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { LayoutContent } from '@/components/LayoutContent';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cyepro AI | Notification Prioritization Engine',
  description:
    'Intelligent Notification Management System with Fail-Safe Architecture',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col overflow-x-hidden md:flex-row md:overflow-hidden antialiased" suppressHydrationWarning>
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  );
}
