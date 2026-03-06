'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Zap,
  FileText,
  Settings,
  Rocket,
  Send,
  Lock,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/' },
  { label: 'Simulator', icon: Rocket, href: '/simulator' },
  { label: 'Audit Log', icon: FileText, href: '/audit' },
  { label: 'Rules Manager', icon: Settings, href: '/rules' },
  { label: 'LATER Queue', icon: Zap, href: '/later' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-white/5 bg-zinc-950/80 backdrop-blur-2xl md:static md:flex md:h-screen md:w-64 md:flex-col md:border-r md:border-t-0">
      <div className="hidden items-center gap-2 px-6 py-10 md:flex">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/20">
          <Send className="h-6 w-6 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">
          Cyepro AI
        </span>
      </div>

      <nav className="flex flex-1 items-center justify-around px-2 md:block md:space-y-1 md:justify-start">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all duration-300 md:flex-row md:gap-3',
                isActive
                  ? 'text-purple-400 md:bg-white/5 md:text-white'
                  : 'text-zinc-500 hover:text-zinc-300 md:hover:bg-white/5',
              )}
            >
              <Icon
                className={cn(
                  'h-6 w-6 md:h-5 md:w-5',
                  isActive && 'md:text-purple-400',
                )}
              />
              <span className="text-[10px] font-medium md:text-sm">
                {item.label}
              </span>
            </Link>
          );
        })}

        <div className="my-4 hidden border-t border-white/5 md:block" />

        <button
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="flex w-full flex-col items-center gap-1 rounded-xl px-4 py-2 text-zinc-500 transition-all duration-300 hover:text-red-400 md:flex-row md:gap-3 md:hover:bg-red-500/5"
        >
          <Lock className="h-6 w-6 md:h-5 md:w-5" />
          <span className="text-[10px] font-medium md:text-sm">
            Logout
          </span>
        </button>
      </nav>
    </div>
  );
}
