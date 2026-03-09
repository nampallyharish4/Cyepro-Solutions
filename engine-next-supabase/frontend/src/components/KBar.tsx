'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  LayoutDashboard, 
  Activity, 
  Zap, 
  Clock, 
  Settings, 
  Terminal, 
  Command,
  ArrowRight,
  UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Go to Dashboard', path: '/', icon: LayoutDashboard, category: 'Navigation' },
  { id: 'simulator', label: 'Open System Simulator', path: '/simulator', icon: Zap, category: 'Navigation' },
  { id: 'audit', label: 'View Audit Log', path: '/audit', icon: Activity, category: 'Analytics' },
  { id: 'queue', label: 'Manage Deferred Queue', path: '/later', icon: Clock, category: 'Operations' },
  { id: 'rules', label: 'Edit Rules Protocol', path: '/rules', icon: Terminal, category: 'Configuration' },
  { id: 'settings', label: 'Global Settings', path: '/settings', icon: Settings, category: 'Configuration' },
];

export function KBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const filtered = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex].path);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div 
          className="fixed inset-0 z-[1000] flex items-start justify-center pt-[15vh] px-4 pointer-events-none"
        >
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md pointer-events-auto"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-[0_0_80px_rgba(0,0,0,0.8),0_0_20px_rgba(168,85,247,0.15)] pointer-events-auto"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 border-b border-white/5 px-4 py-4">
              <Search className="h-5 w-5 text-zinc-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="What do you want to find?"
                className="flex-1 bg-transparent text-lg text-white placeholder:text-zinc-600 focus:outline-none"
              />
              <div className="flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 border border-white/5">
                <span className="text-[12px]">ESC</span>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-zinc-500 font-medium">No results found for &quot;{query}&quot;</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Categorized grouping */}
                  {Array.from(new Set(filtered.map(f => f.category))).map(cat => (
                    <div key={cat} className="space-y-1">
                      <h3 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2">{cat}</h3>
                      {filtered.filter(f => f.category === cat).map((item, idx) => {
                        const globalIdx = filtered.findIndex(f => f.id === item.id);
                        const isSelected = globalIdx === selectedIndex;
                        const Icon = item.icon;
                        
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelect(item.path)}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-all ${
                              isSelected ? 'bg-purple-600/10 text-white' : 'text-zinc-400 hover:bg-white/5'
                            }`}
                          >
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                              isSelected ? 'border-purple-500/30 bg-purple-500/20 text-purple-400' : 'border-white/5 bg-zinc-800 text-zinc-500'
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="flex-1 text-left text-sm font-semibold">{item.label}</span>
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-zinc-600 uppercase italic">Enter to jump</span>
                                <ArrowRight className="h-4 w-4 text-purple-500" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/5 bg-zinc-950/50 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><ArrowRight className="h-3 w-3 rotate-90" /> Navigate</span>
                <span className="flex items-center gap-1.5"><ArrowRight className="h-3 w-3 rotate-0 translate-y-[-1px]" /> Select</span>
              </div>
              <div className="flex items-center gap-2 text-purple-500/50">
                <Command className="h-3.5 w-3.5" />
                <span>Cyepro Command Shell v2.1</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
