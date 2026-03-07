'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Rocket,
  Send,
  RefreshCcw,
  CheckCircle2,
  Clock,
  Ban,
  AlertCircle,
  Zap,
  Activity as ActivityIcon,
  Brain,
  Shield,
  ChevronDown,
  ChevronRight,
  Trash2,
  Copy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const CHANNELS = ['PUSH', 'EMAIL', 'SMS', 'IN_APP', 'WEBHOOK'];

interface SubmissionResult {
  id: string;
  event_id: string;
  decision?: string;
  reason?: string;
  ai_used?: boolean;
  ai_model?: string;
  ai_confidence?: number;
  is_fallback?: boolean;
  rule_id?: string;
  rules?: any;
  status?: string;
  error?: string;
  processed_at?: string;
  notification_events?: any;
  _submitted_at: number;
  _form: any;
}

export default function Simulator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [history, setHistory] = useState<SubmissionResult[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    user_id: '',
    event_type: '',
    title: '',
    message: '',
    source: '',
    channel: 'PUSH',
    priority_hint: '',
    dedupe_key: '',
    metadata: '{}',
    expires_at: '',
  });

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const generateDedupeKey = () => `dedupe_${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    setForm((prev) => ({ ...prev, dedupe_key: generateDedupeKey() }));
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const validate = () => {
    if (!form.user_id.trim()) { showToast('User ID is required', 'err'); return false; }
    if (!form.event_type.trim()) { showToast('Event Type is required', 'err'); return false; }
    if (!form.title.trim()) { showToast('Title is required', 'err'); return false; }
    if (!form.source.trim()) { showToast('Source is required', 'err'); return false; }
    if (form.metadata.trim()) {
      try { JSON.parse(form.metadata); } catch {
        showToast('Metadata must be valid JSON', 'err'); return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setResult(null);
    if (pollRef.current) clearInterval(pollRef.current);

    try {
      const payload: any = {
        user_id: form.user_id.trim(),
        event_type: form.event_type.trim(),
        title: form.title.trim(),
        message: form.message.trim() || undefined,
        source: form.source.trim(),
        channel: form.channel,
        dedupe_key: form.dedupe_key.trim() || undefined,
      };
      if (form.priority_hint.trim()) payload.priority_hint = form.priority_hint.trim();
      if (form.expires_at) payload.expires_at = new Date(form.expires_at).toISOString();
      if (form.metadata.trim() && form.metadata.trim() !== '{}') {
        payload.metadata = JSON.parse(form.metadata);
      }

      const { data } = await api.post('/notifications', payload);
      const pending: SubmissionResult = {
        ...data,
        id: data.event_id,
        event_id: data.event_id,
        status: 'PROCESSING',
        _submitted_at: Date.now(),
        _form: { ...form },
      };
      setResult(pending);

      // Poll for audit log result
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const auditRes = await api.get('/audit', { params: { limit: 20 } });
          const items = auditRes.data?.data || auditRes.data || [];
          const match = items.find((a: any) => a.event_id === data.event_id);
          if (match) {
            const final: SubmissionResult = {
              ...match,
              _submitted_at: pending._submitted_at,
              _form: pending._form,
            };
            setResult(final);
            setHistory((prev) => [final, ...prev].slice(0, 20));
            if (pollRef.current) clearInterval(pollRef.current);
            showToast(`Classified as ${match.decision}`, 'ok');
          }
        } catch (err) {
          console.error(err);
        }
        if (attempts > 25 && pollRef.current) {
          clearInterval(pollRef.current);
          showToast('Classification timed out — check Audit Log', 'err');
        }
      }, 800);

      // Reset form for next submission
      setForm((prev) => ({
        ...prev,
        title: '',
        message: '',
        dedupe_key: generateDedupeKey(),
        metadata: '{}',
        expires_at: '',
      }));
    } catch (err: any) {
      console.error(err);
      const errResult: SubmissionResult = {
        id: 'error',
        event_id: 'error',
        error: err.response?.data?.error || 'Failed to submit event',
        _submitted_at: Date.now(),
        _form: { ...form },
      };
      setResult(errResult);
      showToast(errResult.error!, 'err');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium border backdrop-blur-lg shadow-2xl transition-all ${toast.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          System Simulator
        </h1>
        <p className="text-base text-zinc-400">
          Trigger notification events to test prioritization logic & AI classification.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Form Section */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-5 sm:p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row: User ID + Event Type */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputGroup label="User ID *" placeholder="e.g. user_123" value={form.user_id} onChange={(v: string) => setForm({ ...form, user_id: v })} />
              <InputGroup label="Event Type *" placeholder="e.g. payment_failed" value={form.event_type} onChange={(v: string) => setForm({ ...form, event_type: v })} />
            </div>

            <InputGroup label="Title *" placeholder="e.g. Payment Failed for Order #456" value={form.title} onChange={(v: string) => setForm({ ...form, title: v })} />

            {/* Row: Source + Channel */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputGroup label="Source *" placeholder="e.g. payment-service" value={form.source} onChange={(v: string) => setForm({ ...form, source: v })} />
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-500">Channel</label>
                <select
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 appearance-none"
                >
                  {CHANNELS.map((ch) => <option key={ch} value={ch} className="bg-zinc-900">{ch}</option>)}
                </select>
              </div>
            </div>

            {/* Row: Priority Hint + Dedupe Key */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputGroup label="Priority Hint" placeholder="e.g. high, low, medium" value={form.priority_hint} onChange={(v: string) => setForm({ ...form, priority_hint: v })} />
              <InputGroup label="Dedupe Key" placeholder="Auto-generated" value={form.dedupe_key} onChange={(v: string) => setForm({ ...form, dedupe_key: v })} />
            </div>

            {/* Expires At */}
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-500">Expires At (optional)</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 [color-scheme:dark]"
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-500">Message</label>
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 min-h-[80px] resize-y"
                placeholder="Optional message body..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>

            {/* Metadata JSON */}
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-500">Metadata (JSON)</label>
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-sm text-white font-mono focus:outline-none focus:border-purple-500/50 min-h-[60px] resize-y"
                placeholder='{"severity": "critical", "region": "us-east-1"}'
                value={form.metadata}
                onChange={(e) => setForm({ ...form, metadata: e.target.value })}
              />
            </div>

            <button
              disabled={loading}
              className="glass-button w-full bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center gap-2 group py-3"
            >
              {loading ? (
                <RefreshCcw className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Rocket className="h-5 w-5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                  Launch Event
                </>
              )}
            </button>
          </form>
        </motion.section>

        {/* Results Section */}
        <section className="flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-5 sm:p-8 min-h-[400px] flex flex-col"
          >
            <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2 text-white">
              <ActivityIcon className="h-5 w-5 text-purple-400" />
              Classification Result
            </h3>

            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key={result.id || 'pending'}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex-1"
                >
                  {result.error ? (
                    <div className="flex flex-col items-center justify-center h-full text-rose-400 gap-3">
                      <AlertCircle className="h-12 w-12" />
                      <p className="text-sm text-center">{result.error}</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Decision Badge */}
                      <div className="flex items-center gap-4">
                        <div className={`h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${getDecisionColor(result.decision || result.status)}`}>
                          {getDecisionIcon(result.decision || result.status)}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                            {result.decision ? 'Final Decision' : 'Processing'}
                          </span>
                          <h4 className="text-xl sm:text-2xl font-bold text-white">
                            {result.decision || result.status}
                          </h4>
                        </div>
                      </div>

                      {/* Detail Rows */}
                      <div className="space-y-3">
                        <DetailRow label="Event ID" value={result.event_id} mono />
                        <DetailRow
                          label="Reason"
                          value={result.reason || 'Analysis in progress...'}
                          isReason
                        />

                        {/* Rule Info */}
                        {result.rule_id && (
                          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 sm:p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Shield className="h-4 w-4 text-cyan-400" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Matched Rule</span>
                            </div>
                            {result.rules ? (
                              <p className="text-sm text-cyan-200">
                                {result.rules.name} — {result.rules.condition_type}: {result.rules.condition_value}
                              </p>
                            ) : (
                              <p className="text-xs text-cyan-400/60 font-mono">{result.rule_id}</p>
                            )}
                          </div>
                        )}

                        {/* AI Info */}
                        {result.ai_used && (
                          <div className={`rounded-xl border p-3 sm:p-4 ${result.is_fallback ? 'border-amber-500/30 bg-amber-500/5' : 'border-purple-500/30 bg-purple-500/5'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Brain className="h-4 w-4" style={{ color: result.is_fallback ? '#f59e0b' : '#a78bfa' }} />
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${result.is_fallback ? 'text-amber-300' : 'text-purple-300'}`}>
                                {result.is_fallback ? 'AI Fallback' : 'AI Classification'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                              <span className={result.is_fallback ? 'text-amber-200' : 'text-purple-200'}>
                                Model: {result.ai_model || '—'}
                              </span>
                              <span className={result.is_fallback ? 'text-amber-200' : 'text-purple-200'}>
                                Confidence: {result.ai_confidence != null ? `${(result.ai_confidence * 100).toFixed(1)}%` : '—'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Timestamp */}
                        {result.processed_at && (
                          <DetailRow
                            label="Processed"
                            value={formatDistanceToNow(new Date(result.processed_at), { addSuffix: true })}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-4 opacity-30">
                  <Send className="h-16 w-16 sm:h-20 sm:w-20" />
                  <p className="font-medium text-center text-sm sm:text-base">
                    Submit an event to see classification results.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Submission History */}
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 sm:p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-500" />
                  Session History ({history.length})
                </h4>
                <button
                  onClick={() => setHistory([])}
                  className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              </div>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      setResult(h);
                      setExpandedHistoryId(expandedHistoryId === h.id ? null : h.id);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/5 transition-colors text-left"
                  >
                    <DecisionDot decision={h.decision || '?'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{h._form?.title || 'Untitled'}</p>
                      <p className="text-[10px] text-zinc-600 truncate">{h.reason}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest shrink-0 ${decisionColor(h.decision)}`}>
                      {h.decision || '...'}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}

function InputGroup({ label, placeholder, value, onChange }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</label>
      <input
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-purple-500/50"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function DetailRow({ label, value, mono, isReason }: { label: string; value: string; mono?: boolean; isReason?: boolean }) {
  return (
    <div className="border-b border-white/5 pb-2.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-0.5">{label}</span>
      <p className={`text-sm break-all ${mono ? 'font-mono text-zinc-500 text-xs' : isReason ? 'text-zinc-300 italic' : 'text-zinc-300'}`}>
        {value}
      </p>
    </div>
  );
}

function DecisionDot({ decision }: { decision: string }) {
  const bg: Record<string, string> = {
    NOW: 'bg-emerald-500', LATER: 'bg-amber-500', NEVER: 'bg-rose-500', SENT: 'bg-purple-500',
  };
  return <span className={`block h-2.5 w-2.5 rounded-full shrink-0 ${bg[decision] || 'bg-zinc-600'}`} />;
}

function decisionColor(d?: string) {
  switch (d) {
    case 'NOW': return 'text-emerald-400';
    case 'LATER': return 'text-amber-400';
    case 'NEVER': return 'text-rose-400';
    default: return 'text-zinc-500';
  }
}

const getDecisionColor = (d?: string) => {
  switch (d) {
    case 'NOW': return 'bg-emerald-500 shadow-emerald-500/20';
    case 'LATER': return 'bg-amber-500 shadow-amber-500/20';
    case 'NEVER': return 'bg-rose-500 shadow-rose-500/20';
    case 'PROCESSING': return 'bg-indigo-500 animate-pulse';
    default: return 'bg-zinc-700';
  }
};

const getDecisionIcon = (d?: string) => {
  switch (d) {
    case 'NOW': return <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8" />;
    case 'LATER': return <Clock className="h-7 w-7 sm:h-8 sm:w-8" />;
    case 'NEVER': return <Ban className="h-7 w-7 sm:h-8 sm:w-8" />;
    case 'PROCESSING': return <RefreshCcw className="h-7 w-7 sm:h-8 sm:w-8 animate-spin" />;
    default: return null;
  }
};
