'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Zap,
  CheckCircle2,
  Clock,
  Ban,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/audit`);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter((log: any) => {
    const matchesFilter = filter === 'ALL' || log.decision === filter;
    const matchesSearch =
      log.notification_events?.title
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      log.reason?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          Audit Archive
        </h1>
        <p className="text-lg text-zinc-400">
          Complete immutable record of engine decisions and logic triggers.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search events, reasons, or IDs..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 glass-card p-1">
          {['ALL', 'NOW', 'LATER', 'NEVER'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${filter === f ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-zinc-500 hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-4">
        {!mounted || loading ? (
          <div className="py-20 text-center text-zinc-600 font-medium">
            {loading ? 'Decrypting logs...' : 'Initializing Archive...'}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-zinc-600 font-medium">
            No audit entries match your current filters.
          </div>
        ) : (
          filteredLogs.map((log: any) => (
            <div
              key={log.id}
              className="glass-card group hover:bg-white/5 cursor-pointer transition-all duration-300"
            >
              <div className="p-6 flex flex-col gap-6 md:flex-row md:items-center">
                {/* Decision Icon */}
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center text-white shrink-0 ${getDecisionColor(log.decision)}`}
                >
                  {getDecisionIcon(log.decision)}
                </div>

                {/* Event Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {log.notification_events?.source || 'SENDER'}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-zinc-700" />
                    <span className="text-[10px] font-medium text-zinc-600">
                      {formatDistanceToNow(new Date(log.processed_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white truncate">
                    {log.notification_events?.title}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1 line-clamp-1 italic">
                    {log.reason}
                  </p>
                </div>

                {/* Status & Metadata */}
                <div className="flex items-center gap-6 px-4 shrink-0 border-t border-white/5 pt-4 md:border-0 md:pt-0">
                  {log.ai_used && (
                    <div className="flex items-center gap-2 glass-card bg-purple-500/10 border-purple-500/20 px-3 py-1.5 rounded-lg">
                      <Zap className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">
                        AI v2.1
                      </span>
                    </div>
                  )}

                  <div className="hidden lg:flex flex-col items-end">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      ID:{' '}
                      <span className="text-zinc-400">
                        {log.id.slice(0, 8)}
                      </span>
                      <ExternalLink className="h-2.5 w-2.5 ml-1" />
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-zinc-700 group-hover:text-purple-400 transition-colors" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const getDecisionColor = (d: string) => {
  switch (d) {
    case 'NOW':
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20';
    case 'LATER':
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/20';
    case 'NEVER':
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/20';
    default:
      return 'bg-zinc-800 text-zinc-400';
  }
};

const getDecisionIcon = (d: string) => {
  switch (d) {
    case 'NOW':
      return <CheckCircle2 className="h-6 w-6" />;
    case 'LATER':
      return <Clock className="h-6 w-6" />;
    case 'NEVER':
      return <Ban className="h-6 w-6" />;
    default:
      return null;
  }
};
