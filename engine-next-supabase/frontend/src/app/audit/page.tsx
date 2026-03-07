'use client';

import { useState, useEffect, useCallback } from 'react';
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
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  User,
  Radio,
  Tag,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const FILTERS = ['ALL', 'NOW', 'LATER', 'NEVER', 'SENT', 'FAILED'] as const;
const PAGE_SIZE = 30;

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const { data } = await api.get('/audit', {
        params: { page, limit: PAGE_SIZE },
      });
      setLogs(data.data || data);
      setTotal(data.total ?? (data.data || data).length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    setMounted(true);
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log: any) => {
    const matchesFilter = filter === 'ALL' || log.decision === filter;
    if (!matchesSearch(log, search)) return false;
    return matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 sm:space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Audit Archive
        </h1>
        <p className="text-sm sm:text-lg text-zinc-400">
          Append-only, immutable record of every engine decision.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search title, reason, source, user..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 glass-card p-1 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                filter === f
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Count bar */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          Showing{' '}
          <span className="text-zinc-300 font-semibold">
            {filteredLogs.length}
          </span>{' '}
          of {total} entries
        </span>
        {totalPages > 1 && (
          <span>
            Page {page} / {totalPages}
          </span>
        )}
      </div>

      {/* Log Entries */}
      <div className="space-y-3">
        {!mounted || loading ? (
          <div className="py-20 text-center text-zinc-600 font-medium">
            Decrypting logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-zinc-600 font-medium">
            No audit entries match your filters.
          </div>
        ) : (
          filteredLogs.map((log: any) => {
            const isExpanded = expandedId === log.id;
            const evt = log.notification_events;
            const rule = log.rules;

            return (
              <div
                key={log.id}
                className="glass-card overflow-hidden transition-all duration-300"
              >
                {/* Summary Row */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : log.id)
                  }
                  className="w-full text-left p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:bg-white/5 transition-colors"
                >
                  {/* Decision badge */}
                  <div
                    className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 ${getDecisionColor(log.decision)}`}
                  >
                    {getDecisionIcon(log.decision)}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        {evt?.source || 'UNKNOWN'}
                      </span>
                      <span className="hidden sm:inline h-1 w-1 rounded-full bg-zinc-700" />
                      <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                        {evt?.event_type || '—'}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-zinc-700" />
                      <span className="text-[10px] text-zinc-600">
                        {formatDistanceToNow(new Date(log.processed_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white truncate">
                      {evt?.title || 'Untitled Event'}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 line-clamp-1 italic">
                      {log.reason}
                    </p>
                  </div>

                  {/* Right side badges */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {log.ai_used && (
                      <div
                        className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                          log.is_fallback
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                            : 'bg-purple-500/10 border border-purple-500/20 text-purple-300'
                        }`}
                      >
                        {log.is_fallback ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          <Zap className="h-3 w-3" />
                        )}
                        {log.is_fallback ? 'Fallback' : 'AI'}
                      </div>
                    )}

                    {rule && (
                      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                        <Shield className="h-3 w-3" />
                        Rule
                      </div>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-purple-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-600" />
                    )}
                  </div>
                </button>

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <div className="border-t border-white/5 bg-white/[0.02] px-4 sm:px-6 py-4 sm:py-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Decision + Reason */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <DetailItem
                        label="Decision"
                        value={log.decision}
                        badge
                        badgeClass={getDecisionColor(log.decision)}
                      />
                      <DetailItem label="Reason" value={log.reason} />
                    </div>

                    {/* Event Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <DetailItem
                        label="User"
                        value={evt?.user_id || '—'}
                        icon={<User className="h-3 w-3" />}
                      />
                      <DetailItem
                        label="Channel"
                        value={evt?.channel || '—'}
                        icon={<Radio className="h-3 w-3" />}
                      />
                      <DetailItem
                        label="Priority Hint"
                        value={evt?.priority_hint || '—'}
                        icon={<Tag className="h-3 w-3" />}
                      />
                      <DetailItem
                        label="Dedupe Key"
                        value={evt?.dedupe_key || 'none'}
                      />
                    </div>

                    {/* Rule Info */}
                    {rule && (
                      <div className="glass-card bg-cyan-500/5 border-cyan-500/10 p-3 rounded-xl">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-2 flex items-center gap-1.5">
                          <Shield className="h-3 w-3" /> Matched Rule
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <DetailItem label="Name" value={rule.name} />
                          <DetailItem label="Type" value={rule.condition_type} />
                          <DetailItem
                            label="Value"
                            value={rule.condition_value}
                          />
                          <DetailItem
                            label="Target"
                            value={rule.target_priority}
                          />
                        </div>
                      </div>
                    )}

                    {/* AI Info */}
                    {log.ai_used && (
                      <div
                        className={`glass-card p-3 rounded-xl ${
                          log.is_fallback
                            ? 'bg-amber-500/5 border-amber-500/10'
                            : 'bg-purple-500/5 border-purple-500/10'
                        }`}
                      >
                        <p
                          className={`text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5 ${
                            log.is_fallback
                              ? 'text-amber-400'
                              : 'text-purple-400'
                          }`}
                        >
                          {log.is_fallback ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <Zap className="h-3 w-3" />
                          )}
                          {log.is_fallback
                            ? 'AI Fallback Classification'
                            : 'AI Classification'}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <DetailItem
                            label="Model"
                            value={log.ai_model || '—'}
                          />
                          <DetailItem
                            label="Confidence"
                            value={
                              log.ai_confidence != null
                                ? `${(log.ai_confidence * 100).toFixed(1)}%`
                                : '—'
                            }
                          />
                          <DetailItem
                            label="Fallback"
                            value={log.is_fallback ? 'Yes' : 'No'}
                          />
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    {evt?.metadata &&
                      Object.keys(evt.metadata).length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                            Event Metadata
                          </p>
                          <div className="bg-black/30 rounded-lg px-3 py-2 text-xs text-zinc-400 font-mono overflow-x-auto">
                            {JSON.stringify(evt.metadata, null, 2)}
                          </div>
                        </div>
                      )}

                    {/* IDs */}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-zinc-600 pt-1 border-t border-white/5">
                      <span>
                        Audit ID:{' '}
                        <span className="text-zinc-500 font-mono">
                          {log.id}
                        </span>
                      </span>
                      <span>
                        Event ID:{' '}
                        <span className="text-zinc-500 font-mono">
                          {log.event_id}
                        </span>
                      </span>
                      <span>
                        Processed:{' '}
                        <span className="text-zinc-500">
                          {new Date(log.processed_at).toLocaleString()}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="glass-button px-3 py-2 text-sm disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const pn =
              totalPages <= 5
                ? i + 1
                : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return (
              <button
                key={pn}
                onClick={() => setPage(pn)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  page === pn
                    ? 'bg-purple-600 text-white'
                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {pn}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="glass-button px-3 py-2 text-sm disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function matchesSearch(log: any, q: string): boolean {
  if (!q) return true;
  const s = q.toLowerCase();
  const evt = log.notification_events;
  return (
    evt?.title?.toLowerCase().includes(s) ||
    evt?.source?.toLowerCase().includes(s) ||
    evt?.event_type?.toLowerCase().includes(s) ||
    evt?.user_id?.toLowerCase().includes(s) ||
    log.reason?.toLowerCase().includes(s) ||
    log.ai_model?.toLowerCase().includes(s) ||
    log.rules?.name?.toLowerCase().includes(s) ||
    false
  );
}

function DetailItem({
  label,
  value,
  icon,
  badge,
  badgeClass,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  badge?: boolean;
  badgeClass?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-1">
        {icon}
        {label}
      </p>
      {badge ? (
        <span
          className={`inline-block px-2 py-0.5 rounded-md text-xs font-black uppercase ${badgeClass}`}
        >
          {value}
        </span>
      ) : (
        <p className="text-xs text-zinc-300 break-all">{value}</p>
      )}
    </div>
  );
}

function getDecisionColor(d: string) {
  switch (d) {
    case 'NOW':
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20';
    case 'LATER':
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/20';
    case 'NEVER':
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/20';
    case 'SENT':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/20';
    case 'FAILED':
      return 'bg-red-500/20 text-red-400 border border-red-500/20';
    default:
      return 'bg-zinc-800 text-zinc-400';
  }
}

function getDecisionIcon(d: string) {
  const cls = 'h-5 w-5 sm:h-6 sm:w-6';
  switch (d) {
    case 'NOW':
      return <CheckCircle2 className={cls} />;
    case 'LATER':
      return <Clock className={cls} />;
    case 'NEVER':
      return <Ban className={cls} />;
    case 'SENT':
      return <Send className={cls} />;
    case 'FAILED':
      return <Skull className={cls} />;
    default:
      return null;
  }
}
