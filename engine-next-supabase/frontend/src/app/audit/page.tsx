'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Zap,
  CheckCircle2,
  Clock,
  Ban,
  ChevronDown,
  ChevronUp,
  Send,
  Skull,
  Shield,
  Brain,
  Terminal,
  Database,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Radio,
  Tag,
  Activity,
  ArrowRight
} from 'lucide-react';
import api from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import { PageLoader } from '@/components/PageLoader';
import { motion, AnimatePresence } from 'framer-motion';

const FILTERS = ['ALL', 'NOW', 'LATER', 'NEVER'] as const;
const PAGE_SIZE = 4;

export default function AuditArchive() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [explainingLog, setExplainingLog] = useState<any | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const { data } = await api.get('/audit', {
        params: { page, limit: PAGE_SIZE },
      });
      setLogs(data.data || data);
      setTotal(data.total ?? logs.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, logs.length]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log: any) => {
    const matchesFilter = filter === 'ALL' || log.decision === filter;
    const s = search.toLowerCase();
    const ev = log.notification_events || {};
    const matchesSearch = !search || 
      log.reason.toLowerCase().includes(s) ||
      (ev.title || '').toLowerCase().includes(s) ||
      (ev.source || '').toLowerCase().includes(s);
    
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-8">
      {/* Intelligence Explain Modal */}
      <AnimatePresence>
        {explainingLog && (
          <ExplainModal 
            log={explainingLog} 
            onClose={() => setExplainingLog(null)} 
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight uppercase underline decoration-purple-600/30 underline-offset-8">
            Audit Archive
          </h1>
        </div>
        <p className="text-zinc-500 font-medium ml-1">Analysis of every engine decision.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600 group-focus-within:text-purple-400 transition-colors" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search decisions, titles, or sources..."
            className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl pl-11 pr-4 py-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 glass-card p-1.5 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-zinc-600 hover:text-white hover:bg-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Log List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center"><PageLoader /></div>
        ) : filteredLogs.length === 0 ? (
          <div className="glass-card p-24 text-center">
            <div className="opacity-20 flex justify-center mb-6">
              <Database className="h-20 w-20 text-zinc-500" />
            </div>
            <p className="text-zinc-600 font-black uppercase tracking-widest">Archive empty for this query</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div 
              key={log.id}
              className={`glass-card overflow-hidden transition-all duration-500 ${
                expandedId === log.id ? 'ring-2 ring-purple-500/20' : ''
              }`}
            >
              {/* Summary Row */}
              <div 
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="flex cursor-pointer items-center gap-4 p-5 sm:p-7 select-none group"
              >
                <div className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border transition-all duration-500 ${getDecisionStyles(log.decision)}`}>
                  {getDecisionIcon(log.decision)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${getPriorityStyles(log.decision)}`}>
                      {log.decision}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                      {log.processed_at && formatDistanceToNow(new Date(log.processed_at), { addSuffix: true })}
                    </span>
                  </div>
                  <h3 className="truncate text-base font-black text-white uppercase">{log.notification_events?.title || 'System Packet'}</h3>
                  <p className="truncate text-xs text-zinc-500 mt-1">{log.reason}</p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {log.ai_used && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20">
                      <Brain className="h-3 w-3" /> AI
                    </div>
                  )}
                  {expandedId === log.id ? <ChevronUp className="h-5 w-5 text-zinc-600" /> : <ChevronDown className="h-5 w-5 text-zinc-600" />}
                </div>
              </div>

              {/* Expanded Data */}
              <AnimatePresence>
                {expandedId === log.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5 bg-zinc-950/20"
                  >
                    <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <DataSection label="Event Detail">
                          <p className="text-sm text-zinc-300 leading-relaxed font-medium mb-4">{log.notification_events?.message || 'Empty event body.'}</p>
                          <div className="flex flex-wrap gap-2">
                             <DataTag icon={User} label="User" value={log.notification_events?.user_id} />
                             <DataTag icon={Database} label="Source" value={log.notification_events?.source} />
                             <DataTag icon={Radio} label="Type" value={log.notification_events?.event_type} />
                          </div>
                        </DataSection>

                        <DataSection label="Engine Explainability">
                          <div className="rounded-2xl bg-zinc-900/50 p-5 border border-white/5 mb-4">
                             <p className="text-xs text-zinc-500 font-bold leading-relaxed">&quot;{log.reason}&quot;</p>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setExplainingLog(log); }}
                            className="flex w-full items-center justify-center gap-3 py-3.5 bg-purple-600/10 border border-purple-500/30 text-purple-400 font-black uppercase text-[11px] tracking-widest rounded-xl hover:bg-purple-600 transition-all hover:text-white"
                          >
                             <Brain className="h-4 w-4" /> Trace Logic Flow
                          </button>
                        </DataSection>
                      </div>

                      <div className="space-y-6">
                         <DataSection label="Decision Metadata">
                            <div className="grid grid-cols-2 gap-3">
                               <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                                  <span className="block text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Method</span>
                                  <span className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-tighter font-mono">
                                    {log.rule_id ? <Shield className="h-3 w-3 text-cyan-500" /> : <Brain className="h-3 w-3 text-purple-500" />}
                                    {log.rule_id ? 'Rules-Logic' : 'Intelligence'}
                                  </span>
                               </div>
                               <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                                  <span className="block text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Confidence</span>
                                  <span className="text-xs font-black text-emerald-400 uppercase tracking-tighter">{log.ai_confidence ? `${Math.round(log.ai_confidence * 100)}%` : '100% (Rule)'}</span>
                               </div>
                            </div>
                         </DataSection>
                         <DataSection label="Raw Metadata">
                            <pre className="text-[10px] font-mono text-zinc-600 bg-black/40 p-5 rounded-2xl overflow-x-auto border border-white/5 max-h-[200px] scrollbar-hide">
                               {JSON.stringify(log.notification_events?.metadata || {}, null, 2)}
                            </pre>
                         </DataSection>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-8">
           <button 
             onClick={() => setPage(p => Math.max(1, p-1))}
             disabled={page === 1}
             className="h-12 w-12 flex items-center justify-center bg-white/5 rounded-2xl text-zinc-600 hover:text-white disabled:opacity-30 transition-all"
           >
             <ChevronLeft className="h-6 w-6" />
           </button>
           <div className="flex items-center gap-3">
             <span className="text-xs font-black text-zinc-600 uppercase tracking-widest">Page</span>
             <span className="text-lg font-black text-white">{page}</span>
             <span className="text-xs font-black text-zinc-600 uppercase tracking-widest">Of</span>
             <span className="text-lg font-black text-zinc-600">{totalPages}</span>
           </div>
           <button 
             onClick={() => setPage(p => Math.min(totalPages, p+1))}
             disabled={page === totalPages}
             className="h-12 w-12 flex items-center justify-center bg-white/5 rounded-2xl text-zinc-600 hover:text-white disabled:opacity-30 transition-all"
           >
             <ChevronRight className="h-6 w-6" />
           </button>
        </div>
      )}
    </div>
  );
}

function ExplainModal({ log, onClose }: { log: any; onClose: () => void }) {
  const steps = log.trace || [];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose}
        className="fixed inset-0 bg-zinc-950/90 backdrop-blur-xl" 
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[28px] sm:rounded-[40px] border border-white/10 bg-[#0c0c0e] shadow-[0_0_100px_rgba(168,85,247,0.15)] flex flex-col"
      >
        <button onClick={onClose} className="absolute right-8 top-8 z-10 p-2 text-zinc-600 hover:text-white transition-all"><X className="h-6 w-6" /></button>
          <div className="p-6 sm:p-10 md:p-14 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col items-center text-center gap-4 sm:gap-6 mb-8 sm:mb-12">
             <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-[20px] sm:rounded-[30px] bg-purple-600 flex items-center justify-center shadow-2xl shadow-purple-600/30">
                <Brain className="h-7 w-7 sm:h-10 sm:w-10 text-white" />
             </div>
             <div className="space-y-1">
                <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight uppercase underline decoration-purple-600/40">Trace Logic Flow</h2>
                <p className="text-zinc-600 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">Cognitive Debugging for Event #{log.id.slice(0,8)}</p>
             </div>
          </div>

          <div className="relative space-y-0">
             <div className="absolute left-[27px] top-0 bottom-0 w-1 bg-white/[0.03] rounded-full" />
             {steps.length === 0 ? (
               <p className="text-center py-10 text-zinc-700">No historical trace steps available for this entry.</p>
             ) : (
               steps.map((step: any, idx: number) => (
                 <motion.div 
                   key={idx} 
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: idx * 0.1 }}
                   className="relative pl-20 pb-12 last:pb-4 group"
                 >
                    <div className={`absolute left-[18px] top-0.5 h-[20px] w-[20px] rounded-full border-4 border-[#0c0c0e] z-10 ${
                      step.status === 'MATCHED' || step.status === 'TRIPPED' ? 'bg-emerald-500' : 
                      step.status === 'PASSED' ? 'bg-zinc-800' : 'bg-purple-600'
                    }`} />
                    <div className="space-y-2">
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{step.stage.replace(/_/g, ' ')}</span>
                          <span className="text-[10px] font-bold text-zinc-800 font-mono">{format(new Date(step.timestamp), 'HH:mm:ss.SS')}</span>
                       </div>
                       <div className="glass-card p-5 group-hover:border-purple-500/40 transition-all">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase mb-2 ${
                            step.status === 'PASSED' ? 'bg-zinc-800 text-zinc-500' : 
                            step.status === 'MATCHED' || step.status === 'TRIPPED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-purple-500/20 text-purple-400'
                          }`}>{step.status}</span>
                          <p className="text-sm text-white font-medium">&quot;{step.details}&quot;</p>
                       </div>
                    </div>
                 </motion.div>
               ))
             )}

             <div className="relative pl-20 mt-4">
               <div className="absolute left-[18px] top-1.5 h-[20px] w-[20px] rounded bg-purple-500 flex items-center justify-center text-white border-4 border-[#0c0c0e] z-10 font-black text-[10px]">!</div>
               <div className="space-y-1">
                 <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Execution Result</span>
                 <h4 className="text-2xl font-black text-white underline decoration-purple-500/40">{log.decision} PRIORITY</h4>
                 <p className="text-xs text-zinc-600 mt-2 font-medium">&ldquo;{log.reason}&rdquo;</p>
               </div>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DataSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h5 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">{label}</h5>
      {children}
    </div>
  );
}

function DataTag({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5">
      <Icon className="h-3 w-3 text-zinc-600 shrink-0" />
      <span className="text-[10px] font-bold text-zinc-600 uppercase">{label}:</span>
      <span className="text-[10px] font-black text-zinc-300 uppercase tracking-tighter">{value || '—'}</span>
    </div>
  );
}

function getDecisionStyles(d: string) {
  switch (d) {
    case 'NOW': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    case 'LATER': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    case 'NEVER': return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
    default: return 'bg-zinc-800 border-white/10 text-zinc-400';
  }
}

function getPriorityStyles(d: string) {
  switch (d) {
    case 'NOW': return 'border-emerald-500/20 text-emerald-400';
    case 'LATER': return 'border-amber-500/20 text-amber-400';
    case 'NEVER': return 'border-rose-500/20 text-rose-400';
    default: return 'border-zinc-500/20 text-zinc-500';
  }
}

function getDecisionIcon(d: string) {
  switch (d) {
    case 'NOW': return <Zap className="h-7 w-7" />;
    case 'LATER': return <Clock className="h-7 w-7" />;
    case 'NEVER': return <Ban className="h-7 w-7" />;
    default: return <Activity className="h-7 w-7" />;
  }
}
