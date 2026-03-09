'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { KBar } from '@/components/KBar';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import api from '@/lib/api';
import { Bell, Zap, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPage = pathname === '/login' || pathname === '/signup';

  // Auth guard
  const [authChecked, setAuthChecked] = useState(false);
  const [pulse, setPulse] = useState<any>(null);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token && !isPublicPage) {
      router.replace('/login');
    } else if (token && isPublicPage) {
      router.replace('/');
    } else {
      setAuthChecked(true);
    }
  }, [isPublicPage, router]);

  // System Pulse Heartbeat — Global "NOW" event toasts
  useEffect(() => {
    if (!authChecked || isPublicPage) return;

    const checkPulse = async () => {
      try {
        const { data } = await api.get('/audit', { params: { limit: 5 } });
        const items = data?.data || data || [];
        // Only interested in NOW events that we haven't shown a toast for yet
        const newNow = items.find((a: any) => 
          a.decision === 'NOW' && 
          !seenIds.current.has(a.id) &&
          (new Date().getTime() - new Date(a.processed_at).getTime() < 60000) // Within last min
        );

        if (newNow) {
          seenIds.current.add(newNow.id);
          setPulse(newNow);
          setTimeout(() => setPulse(null), 8000);
        }
        
        // Populate seenIds initially to avoid storm of toasts on first load
        if (seenIds.current.size === 0) {
          items.forEach((i: any) => seenIds.current.add(i.id));
        }
      } catch (err) {
        // Silent
      }
    };

    const interval = setInterval(checkPulse, 7000);
    checkPulse();
    return () => clearInterval(interval);
  }, [authChecked, isPublicPage]);

  // While checking auth
  if (!authChecked) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-zinc-950">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-transparent" style={{ borderTopColor: '#a855f7', borderRightColor: '#a855f7', animation: 'spin 1.4s cubic-bezier(0.65,0,0.35,1) infinite' }} />
          <div className="absolute rounded-full border-2 border-transparent" style={{ inset: '7px', borderBottomColor: '#10b981', borderLeftColor: '#10b981', animation: 'spin 1.0s cubic-bezier(0.65,0,0.35,1) infinite reverse' }} />
          <div className="absolute rounded-full border-2 border-transparent" style={{ inset: '14px', borderTopColor: 'rgba(168,85,247,0.5)', borderRightColor: 'rgba(16,185,129,0.5)', animation: 'spin 0.7s linear infinite' }} />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-600">Verifying access…</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <KBar />
      {!isPublicPage && <Sidebar />}
      <main className={cn('flex-1 px-4 pt-6 pb-28 md:h-screen md:overflow-y-auto md:px-10 md:py-16 md:pb-16', isPublicPage && 'flex items-center justify-center p-0 pb-0')}>
        <div className={cn('mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-5 duration-700', isPublicPage && 'w-full max-w-none')}>
          {children}
        </div>
      </main>

      {/* Global Task/Pulse Toast Overlay */}
      <AnimatePresence>
        {pulse && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50, x: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } }}
            className="fixed bottom-20 right-3 md:bottom-10 md:right-10 z-[500] w-[calc(100vw-1.5rem)] max-w-[320px] overflow-hidden rounded-2xl border border-emerald-500/20 bg-zinc-900/95 p-4 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-1 flex items-center gap-2">
                  <Zap className="h-3 w-3 fill-emerald-500" />
                  Critical Alert (NOW)
                </h4>
                <p className="text-sm font-bold text-white truncate">{pulse.notification_events?.title || 'System Alert'}</p>
                <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">{pulse.reason}</p>
                <button 
                  onClick={() => { router.push('/audit'); setPulse(null); }}
                  className="mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-white transition-colors"
                >
                  Investigate <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <button 
                onClick={() => setPulse(null)}
                className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/5 text-zinc-600 hover:text-white transition-all shadow-inner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Progress/Timer Bar */}
            <motion.div 
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 8, ease: 'linear' }}
              className="absolute bottom-0 left-0 h-1 w-full bg-emerald-500 transform-origin-left"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
