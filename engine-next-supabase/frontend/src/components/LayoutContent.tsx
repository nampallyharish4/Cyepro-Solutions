'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <>
      {!isLoginPage && <Sidebar />}
      <main className={cn("flex-1 px-4 pt-8 pb-24 md:px-10 md:py-16", isLoginPage && "flex items-center justify-center p-0 pb-0")}>
        <div className={cn("mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-5 duration-700", isLoginPage && "w-full max-w-none")}>
          {children}
        </div>
      </main>
    </>
  );
}
