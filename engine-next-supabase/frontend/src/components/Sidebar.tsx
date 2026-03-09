'use client';

import { useState, useEffect } from 'react';
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
  LogOut,
  X,
  ShieldOff,
  Brain,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import api from '@/lib/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { label: 'Overview',      icon: LayoutDashboard, href: '/' },
  { label: 'Simulator',     icon: Rocket,           href: '/simulator' },
  { label: 'Audit Log',     icon: FileText,         href: '/audit' },
  { label: 'Rules Protocol',icon: Settings,         href: '/rules' },
  { label: 'LATER Queue',   icon: Zap,              href: '/later' },
  { label: 'Intelligence',  icon: Brain,            href: '/settings' },
];

/* ─── Logout Confirmation Modal ─── */
function LogoutModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border p-8 space-y-6 shadow-2xl"
        style={{
          backgroundColor: '#0f0f12',
          borderColor: 'rgba(239,68,68,0.25)',
          boxShadow: '0 0 60px rgba(239,68,68,0.10), 0 25px 50px rgba(0,0,0,0.6)',
          animation: 'logout-modal-in 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 p-1.5 rounded-xl text-zinc-600 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex justify-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(185,28,28,0.08))',
              border: '1px solid rgba(239,68,68,0.25)',
            }}
          >
            <ShieldOff className="h-10 w-10 text-red-400" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-xl font-black tracking-tight text-red-400">Sign Out?</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            You will be logged out of the Notification Engine. Your session token will be cleared.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-zinc-400 hover:text-white border border-white/10 hover:bg-white/5 transition-all"
          >
            Stay Logged In
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all"
            style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>

      <style>{`
        @keyframes logout-modal-in {
          0%   { opacity: 0; transform: scale(0.85) translateY(16px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ─── Sidebar ─── */
export function Sidebar() {
  const pathname = usePathname();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [model, setModel] = useState('DeepSeek-V3');

  useEffect(() => {
    const fetchSettings = async () => {
       try {
          const { data } = await api.get('/settings');
          if (Array.isArray(data)) {
            const aiModel = data.find((s: any) => s.key === 'AI_MODEL');
            if (aiModel) setModel(aiModel.value);
          }
       } catch (e) {
          // Silent catch to prevent dev-mode error overlays during transient network drops
       }
    };
    fetchSettings();
    const interval = setInterval(fetchSettings, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <>
      {showLogoutModal && (
        <LogoutModal
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-white/5 bg-zinc-950/80 backdrop-blur-2xl md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-r md:border-t-0 md:overflow-y-auto">
        {/* Logo */}
        <div className="hidden items-center gap-2 px-6 py-10 md:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/20">
            <Send className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white uppercase italic">Cyepro AI</span>
        </div>

        <nav className="flex flex-1 items-center justify-start gap-2 overflow-x-auto overflow-y-hidden px-4 md:block md:space-y-1 md:overflow-visible md:px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-300 md:flex-row md:gap-3 md:px-4',
                  isActive
                    ? 'text-purple-400 md:bg-white/5 md:text-white'
                    : 'text-zinc-500 hover:text-zinc-300 md:hover:bg-white/5',
                )}
              >
                <Icon className={cn('h-6 w-6 md:h-5 md:w-5', isActive && 'md:text-purple-400')} />
                <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap md:text-[11px]">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <div className="my-4 hidden border-t border-white/5 md:block" />

          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-zinc-500 transition-all duration-300 hover:text-red-400 md:w-full md:flex-row md:gap-3 md:px-4 md:hover:bg-red-500/5"
          >
            <Lock className="h-6 w-6 md:h-5 md:w-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap md:text-[11px]">Logout</span>
          </button>
        </nav>

        {/* System Pulse Heartbeat */}
        <div className="hidden mt-auto p-4 md:block">
           <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <div className="relative">
                       <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                       <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">System Pulse</span>
                 </div>
                 <Activity className="h-3 w-3 text-zinc-700" />
              </div>
              
              <div className="space-y-1">
                 <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block">Active Architect</span>
                 <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-purple-400 italic uppercase">{model}</span>
                    <Link href="/settings">
                       <ChevronRight className="h-3 w-3 text-zinc-700 hover:text-white transition-colors cursor-pointer" />
                    </Link>
                 </div>
              </div>

              <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                 <div className="h-full bg-purple-600/50 animate-[pulse_2s_infinite]" style={{ width: '40%' }} />
              </div>
           </div>
        </div>
      </div>
    </>
  );
}
