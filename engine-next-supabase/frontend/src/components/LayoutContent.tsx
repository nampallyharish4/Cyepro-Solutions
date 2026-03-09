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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-600">
            Verifying access...
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isPublicPage && <Sidebar />}
      <main
        className={cn(
          'flex-1 px-4 pt-8 pb-24 md:px-10 md:py-16',
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
