'use client';

import { Ban, Home, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function GlobalNotFound() {
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card flex max-w-md flex-col items-center gap-6 p-8 border-white/5 shadow-[0_0_50px_rgba(255,255,255,0.05)]"
      >
        <div className="flex relative items-center justify-center h-20 w-20">
            <Ban className="h-16 w-16 text-zinc-800" />
            <Search className="h-8 w-8 text-zinc-500 absolute" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-4xl font-black italic tracking-tighter text-white">404</h2>
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            VECTOR ENDPOINT NOT FOUND
          </p>
          <p className="text-sm font-medium text-zinc-400 leading-relaxed mt-4">
            The telemetry namespace you requested does not exist within the current routing table. It may have been pruned or moved.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 pt-4 border-t border-white/5">
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold text-white hover:bg-purple-500 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] active:scale-95"
          >
            <Home className="h-4 w-4" />
            Return to Core Protocol
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
