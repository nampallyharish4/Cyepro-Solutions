'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Send,
  Zap,
  Timer,
  RefreshCcw,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Skull,
  ChevronLeft,
} from 'lucide-react';
import api from '@/lib/api';
import {
  formatDistanceToNow,
  differenceInMinutes,
  differenceInSeconds,
  isPast,
  format,
} from 'date-fns';

type Status = 'ALL' | 'WAITING' | 'FAILED' | 'SENT' | 'PROCESSING' | 'DEAD_LETTER';
const STATUSES: { key: Status; label: string; color: string }[] = [
  { key: 'ALL', label: 'All', color: 'text-zinc-400 border-zinc-600' },
  { key: 'WAITING', label: 'Waiting', color: 'text-amber-400 border-amber-500/50' },
  { key: 'FAILED', label: 'Failed', color: 'text-rose-400 border-rose-500/50' },
  { key: 'SENT', label: 'Sent', color: 'text-emerald-400 border-emerald-500/50' },
  { key: 'PROCESSING', label: 'Processing', color: 'text-blue-400 border-blue-500/50' },
  { key: 'DEAD_LETTER', label: 'Dead Letter', color: 'text-red-400 border-red-500/50' },
];

const PER_PAGE = 20;

export default function LaterQueue() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Status>('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchItems = useCallback(async () => {
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PER_PAGE),
      };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/deferred-queue', { params });
      setItems(data.data || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 10000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  useEffect(() => { setPage(1); }, [statusFilter, search]);

  const handleForceSend = async (id: string) => {
    setSendingId(id);
    try {
      await api.post(`/deferred-queue/${id}/force-send`);
      showToast('Item force-sent successfully', 'ok');
      fetchItems();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Force send failed', 'err');
    } finally {
      setSendingId(null);
    }
  };

  const getRemainingTime = (processAfter: string) => {
    const target = new Date(processAfter);
    if (isPast(target)) return 'Ready to send';
    const mins = differenceInMinutes(target, new Date());
    const secs = differenceInSeconds(target, new Date()) % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'WAITING': return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      case 'FAILED': return <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />;
      case 'SENT': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case 'PROCESSING': return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
      case 'DEAD_LETTER': return <Skull className="h-3.5 w-3.5 text-red-500" />;
      default: return <Clock className="h-3.5 w-3.5 text-zinc-500" />;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'WAITING': return 'text-amber-400 border-amber-500/50';
      case 'FAILED': return 'text-rose-400 border-rose-500/50';
      case 'SENT': return 'text-emerald-400 border-emerald-500/50';
      case 'PROCESSING': return 'text-blue-400 border-blue-500/50';
      case 'DEAD_LETTER': return 'text-red-400 border-red-500/50';
      default: return 'text-zinc-400 border-zinc-600';
    }
  };

  const borderLeft = (s: string) => {
    switch (s) {
      case 'WAITING': return 'border-l-amber-500/60';
      case 'FAILED': return 'border-l-rose-500/60';
      case 'SENT': return 'border-l-emerald-500/60';
      case 'PROCESSING': return 'border-l-blue-500/60';
      case 'DEAD_LETTER': return 'border-l-red-500/60';
      default: return 'border-l-zinc-600';
    }
  };

  const canForceSend = (s: string) => s === 'WAITING' || s === 'FAILED';
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium border backdrop-blur-lg shadow-2xl transition-all ${toast.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Deferred Pipeline
        </h1>
        <p className="text-base text-zinc-400">
          Monitor deferred notifications — their scheduling, delivery, retries, and dead letters.
        </p>
      </div>

      {/* Search + Count */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, source, event type, or user..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <span className="text-xs text-zinc-600 font-medium shrink-0">
          Showing {items.length} of {total} items
        </span>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all ${statusFilter === s.key ? `${s.color} bg-white/10` : 'text-zinc-600 border-zinc-800 hover:border-zinc-700'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Queue Items */}
      <div className="space-y-3">
        {!mounted || loading ? (
          <div className="py-20 text-center text-zinc-600">Syncing pipeline...</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-zinc-600">No items match the current filters.</div>
        ) : (
          items.map((item: any) => {
            const ev = item.notification_events;
            const isExpanded = expandedId === item.id;

            return (
              <div key={item.id} className={`glass-card border-l-4 ${borderLeft(item.status)}`}>
                {/* Summary Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full p-4 sm:p-5 flex items-start sm:items-center gap-3 text-left"
                >
                  <div className="mt-0.5 sm:mt-0">
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 text-zinc-500" />
                      : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {statusIcon(item.status)}
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${statusColor(item.status).split(' ')[0]}`}>
                        {item.status === 'DEAD_LETTER' ? 'Dead Letter' : item.status}
                      </span>
                      {item.status === 'WAITING' && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                          {getRemainingTime(item.process_after)}
                        </span>
                      )}
                      {item.status === 'FAILED' && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-600">
                          retry {item.retry_count}/3
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-white text-base sm:text-lg truncate">
                      {ev?.title || 'Untitled Event'}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                        {ev?.event_type || '—'}
                      </span>
                      <span className="hidden sm:inline h-1 w-1 rounded-full bg-zinc-800" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                        {ev?.source || '—'}
                      </span>
                      <span className="hidden sm:inline h-1 w-1 rounded-full bg-zinc-800" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                        {ev?.user_id || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:block text-right shrink-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </button>

                {/* Force Send — always visible (mobile included) */}
                {canForceSend(item.status) && !isExpanded && (
                  <div className="px-4 sm:px-5 pb-3 flex justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleForceSend(item.id); }}
                      disabled={sendingId === item.id}
                      className="text-[10px] font-bold uppercase tracking-widest text-purple-400 hover:text-white transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {sendingId === item.id ? (
                        <><RefreshCcw className="h-2.5 w-2.5 animate-spin" /> Sending...</>
                      ) : (
                        <>Force Send <Send className="h-2.5 w-2.5" /></>
                      )}
                    </button>
                  </div>
                )}

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Scheduling Info */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Scheduling</h5>
                        <div className="text-sm text-zinc-300 space-y-1">
                          <p><span className="text-zinc-500">Process after:</span> {format(new Date(item.process_after), 'MMM d, yyyy HH:mm:ss')}</p>
                          <p><span className="text-zinc-500">Enqueued:</span> {format(new Date(item.created_at), 'MMM d, yyyy HH:mm:ss')}</p>
                          <p><span className="text-zinc-500">Status:</span>{' '}
                            <span className={statusColor(item.status).split(' ')[0]}>{item.status === 'DEAD_LETTER' ? 'Dead Letter' : item.status}</span>
                          </p>
                          <p><span className="text-zinc-500">Retries:</span> {item.retry_count ?? 0} / 3</p>
                        </div>
                      </div>

                      {/* Event Details */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Event Details</h5>
                        <div className="text-sm text-zinc-300 space-y-1">
                          <p><span className="text-zinc-500">Title:</span> {ev?.title || '—'}</p>
                          <p><span className="text-zinc-500">Type:</span> {ev?.event_type || '—'}</p>
                          <p><span className="text-zinc-500">Source:</span> {ev?.source || '—'}</p>
                          <p><span className="text-zinc-500">User:</span> {ev?.user_id || '—'}</p>
                          <p><span className="text-zinc-500">Channel:</span> {ev?.channel || '—'}</p>
                          <p><span className="text-zinc-500">Priority hint:</span> {ev?.priority_hint || '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    {ev?.message && (
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Message</h5>
                        <p className="text-sm text-zinc-400">{ev.message}</p>
                      </div>
                    )}

                    {/* Metadata */}
                    {ev?.metadata && Object.keys(ev.metadata).length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Metadata</h5>
                        <pre className="text-xs text-zinc-500 bg-black/30 rounded-lg p-3 overflow-x-auto">
                          {JSON.stringify(ev.metadata, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* IDs */}
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Identifiers</h5>
                      <div className="text-[11px] text-zinc-600 space-y-0.5 font-mono">
                        <p>Queue ID: {item.id}</p>
                        <p>Event ID: {item.event_id}</p>
                        {ev?.dedupe_key && <p>Dedupe key: {ev.dedupe_key}</p>}
                      </div>
                    </div>

                    {/* Action */}
                    {canForceSend(item.status) && (
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleForceSend(item.id)}
                          disabled={sendingId === item.id}
                          className="glass-button text-xs font-bold uppercase tracking-widest text-purple-400 hover:text-white flex items-center gap-2 disabled:opacity-50"
                        >
                          {sendingId === item.id ? (
                            <><RefreshCcw className="h-3 w-3 animate-spin" /> Sending...</>
                          ) : (
                            <><Send className="h-3 w-3" /> Force Send Now</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="glass-button p-2 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4 text-zinc-400" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | string)[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              typeof p === 'string' ? (
                <span key={`e${i}`} className="text-zinc-600 text-xs px-1">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`min-w-[32px] h-8 rounded-lg text-xs font-bold ${p === page ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-zinc-500 hover:text-white'}`}
                >
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="glass-button p-2 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          </button>
        </div>
      )}

      {/* Strategy Card */}
      <div className="glass-card p-6 neon-border-purple">
        <h4 className="font-bold text-white flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-purple-400" />
          Scheduling Strategy
        </h4>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Events classified as <strong className="text-white">LATER</strong> are held for 30 minutes to batch
          informational updates and reduce per-hour alert count. The background scheduler processes ready
          items every minute. Failed items are retried up to 3 times before being moved to{' '}
          <strong className="text-red-400">Dead Letter</strong> for manual review.
        </p>
      </div>
    </div>
  );
}
