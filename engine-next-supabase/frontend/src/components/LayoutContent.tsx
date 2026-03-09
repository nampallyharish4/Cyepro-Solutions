'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPage = pathname === '/login' || pathname === '/signup';

  // Auth guard — redirect to /login if no token found, redirect home if already logged in on public pages
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token && !isPublicPage) {
      // Not authenticated → go to login
      router.replace('/login');
    } else if (token && isPublicPage) {
      // Already authenticated → go to dashboard
      router.replace('/');
    } else {
      setAuthChecked(true);
    }
  }, [isPublicPage, router]);

  // While we're checking auth, show a minimal loading state to avoid flash of protected content
  if (!authChecked) {
    return (
      <div
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-zinc-950"
      >
        {/* Triple-ring spinner */}
        <div className="relative h-16 w-16">
          {/* Outer ring — purple */}
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: '#a855f7',
              borderRightColor: '#a855f7',
              animation: 'spin 1.4s cubic-bezier(0.65,0,0.35,1) infinite',
            }}
          />
          {/* Middle ring — emerald, reversed */}
          <div
            className="absolute rounded-full border-2 border-transparent"
            style={{
              inset: '7px',
              borderBottomColor: '#10b981',
              borderLeftColor: '#10b981',
              animation: 'spin 1.0s cubic-bezier(0.65,0,0.35,1) infinite reverse',
            }}
          />
          {/* Inner ring — blend */}
          <div
            className="absolute rounded-full border-2 border-transparent"
            style={{
              inset: '14px',
              borderTopColor: 'rgba(168,85,247,0.5)',
              borderRightColor: 'rgba(16,185,129,0.5)',
              animation: 'spin 0.7s linear infinite',
            }}
          />
        </div>

        {/* Label */}
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-600">
          Verifying access…
        </span>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {!isPublicPage && <Sidebar />}
      <main
        className={cn(
          'flex-1 px-4 pt-8 pb-24 md:h-screen md:overflow-y-auto md:px-10 md:py-16',
          isPublicPage && 'flex items-center justify-center p-0 pb-0',
        )}
      >
        <div
          className={cn(
            'mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-5 duration-700',
            isPublicPage && 'w-full max-w-none',
          )}
        >
          {children}
        </div>
      </main>
    </>
  );
}
