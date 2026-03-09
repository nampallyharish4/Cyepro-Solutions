'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error('Next.js Global UI Error:', error);
  }, [error]);

  return (
    <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card flex max-w-md flex-col items-center gap-6 p-8 border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.15)]"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-inner">
          <AlertTriangle className="h-8 w-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">System Fault</h2>
          <p className="text-sm font-medium text-zinc-400 leading-relaxed">
            The Interface Engine encountered an unexpected segmentation fault while attempting to render this node.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 pt-4 border-t border-white/5">
          <button
            onClick={() => reset()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600/20 px-4 py-3 text-sm font-bold text-purple-400 hover:bg-purple-600/30 transition-all active:scale-95"
          >
            <RefreshCcw className="h-4 w-4" />
            Restart Render Process
          </button>
          
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-bold text-zinc-400 hover:bg-white/10 hover:text-white transition-all active:scale-95"
          >
            <Home className="h-4 w-4" />
            Return to Command Center
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
