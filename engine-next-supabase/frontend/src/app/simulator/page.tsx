'use client';

import { useState, useEffect } from 'react';
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
  Terminal,
  Layers,
  Fingerprint,
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
  const [toast, setToast] = useState<{
    msg: string;
    type: 'ok' | 'err';
  } | null>(null);

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

  const generateDedupeKey = () =>
    `pkt_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  useEffect(() => {
    setForm((prev) => ({ ...prev, dedupe_key: generateDedupeKey() }));
  }, []);

  const validate = () => {
    if (!form.user_id.trim()) {
      showToast('User ID is required', 'err');
      return false;
    }
    if (!form.event_type.trim()) {
      showToast('Event Type is required', 'err');
      return false;
    }
    if (!form.title.trim()) {
      showToast('Title is required', 'err');
      return false;
    }
    if (!form.source.trim()) {
      showToast('Source is required', 'err');
      return false;
    }
    if (form.metadata.trim()) {
      try {
        JSON.parse(form.metadata);
      } catch {
        showToast('Metadata must be valid JSON', 'err');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setResult(null);

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
      if (form.priority_hint.trim())
        payload.priority_hint = form.priority_hint.trim();
      if (form.expires_at)
        payload.expires_at = new Date(form.expires_at).toISOString();
      if (form.metadata.trim() && form.metadata.trim() !== '{}') {
        payload.metadata = JSON.parse(form.metadata);
      }

      const { data } = await api.post('/notifications', payload);
      const final: SubmissionResult = {
        ...data,
        id: data.event_id,
        event_id: data.event_id,
        _submitted_at: Date.now(),
        _form: { ...form },
      };
      setResult(final);
      setHistory((prev: any) => [final, ...prev].slice(0, 10));
      showToast(`Decision: ${data.decision}`, 'ok');

      setForm((prev: any) => ({
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
        error: err.response?.data?.error || 'Submission failed',
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
    <div className="space-y-12 pb-20">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed top-8 right-8 z-[1000] px-6 py-4 rounded-2xl border backdrop-blur-3xl shadow-2xl flex items-center gap-3 ${toast.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}
          >
            {toast.type === 'ok' ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span className="text-sm font-black uppercase tracking-widest">
              {toast.msg}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(147,51,234,0.1)]">
            <Rocket className="h-6 w-6" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter uppercase underline decoration-purple-600/30 underline-offset-8">
            Event Simulator
          </h1>
        </div>
        <p className="text-lg text-zinc-500 font-medium max-w-2xl leading-relaxed">
          Submit test notification events and see the classification result (NOW
          / LATER / NEVER).
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 sm:p-10 border-t-2 border-t-purple-600"
        >
          <div className="flex items-center gap-3 mb-10">
            <Terminal className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">
              Event Input
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <InputGroup
                label="User ID"
                placeholder="e.g. user_01"
                value={form.user_id}
                onChange={(v: string) => setForm({ ...form, user_id: v })}
              />
              <InputGroup
                label="Event Type"
                placeholder="e.g. ALERT, REMINDER"
                value={form.event_type}
                onChange={(v: string) => setForm({ ...form, event_type: v })}
              />
            </div>

            <InputGroup
              label="Title"
              placeholder="e.g. Server CPU Critical"
              value={form.title}
              onChange={(v: string) => setForm({ ...form, title: v })}
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <InputGroup
                label="Source"
                placeholder="e.g. monitoring-service"
                value={form.source}
                onChange={(v: string) => setForm({ ...form, source: v })}
              />
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 block">
                  Channel
                </label>
                <div className="relative">
                  <select
                    value={form.channel}
                    onChange={(e) =>
                      setForm({ ...form, channel: e.target.value })
                    }
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-purple-500/50 appearance-none font-bold"
                  >
                    {CHANNELS.map((ch) => (
                      <option key={ch} value={ch} className="bg-zinc-950">
                        {ch}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-700 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <InputGroup
                label="Priority Hint"
                placeholder="low | high | urgent"
                value={form.priority_hint}
                onChange={(v: string) => setForm({ ...form, priority_hint: v })}
              />
              <InputGroup
                label="Dedupe Key"
                placeholder="Auto-generated"
                value={form.dedupe_key}
                onChange={(v: string) => setForm({ ...form, dedupe_key: v })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 block">
                Expires At
              </label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) =>
                  setForm({ ...form, expires_at: e.target.value })
                }
                className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-purple-500/50 [color-scheme:dark] font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 block">
                Message
              </label>
              <textarea
                className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-purple-500/50 min-h-[80px] resize-y"
                placeholder="Optional message body..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 block">
                Metadata (JSON)
              </label>
              <textarea
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-[11px] text-emerald-400 font-mono focus:outline-none focus:border-purple-500/50 min-h-[80px] resize-y"
                placeholder="{}"
                value={form.metadata}
                onChange={(e) => setForm({ ...form, metadata: e.target.value })}
              />
            </div>

            <button
              disabled={loading}
              className="relative w-full overflow-hidden rounded-[24px] bg-purple-600 py-4 font-black uppercase tracking-[0.3em] text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 group flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Event
                </>
              )}
            </button>
          </form>
        </motion.section>

        <section className="flex flex-col gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 sm:p-10 min-h-[500px] flex flex-col relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <Fingerprint className="h-5 w-5 text-purple-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">
                  Classification Result
                </h3>
              </div>
            </div>

            <div className="flex-1">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center gap-6 py-16"
                  >
                    <div className="relative h-16 w-16">
                      <div
                        className="absolute inset-0 rounded-full border-2 border-transparent"
                        style={{
                          borderTopColor: '#a855f7',
                          borderRightColor: '#a855f7',
                          animation:
                            'spin 1.4s cubic-bezier(0.65,0,0.35,1) infinite',
                        }}
                      />
                      <div
                        className="absolute rounded-full border-2 border-transparent"
                        style={{
                          inset: '7px',
                          borderBottomColor: '#10b981',
                          borderLeftColor: '#10b981',
                          animation:
                            'spin 1.0s cubic-bezier(0.65,0,0.35,1) infinite reverse',
                        }}
                      />
                      <div
                        className="absolute rounded-full border-2 border-transparent"
                        style={{
                          inset: '14px',
                          borderTopColor: 'rgba(168,85,247,0.5)',
                          borderRightColor: 'rgba(16,185,129,0.5)',
                          animation: 'spin 0.7s linear infinite',
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="block h-1.5 w-1.5 rounded-full bg-purple-500"
                          style={{
                            animation: `dot-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                      Classifying event...
                    </p>
                    <style>{`
                      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                      @keyframes dot-pulse { 0%, 100% { opacity: 0.2; transform: scale(0.75); } 50% { opacity: 1; transform: scale(1.3); } }
                    `}</style>
                  </motion.div>
                ) : !result ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-6 opacity-20">
                    <Send className="h-20 w-20" />
                    <p className="font-black uppercase tracking-widest text-xs">
                      Submit an event to see results
                    </p>
                  </div>
                ) : result.error ? (
                  <div className="flex flex-col items-center justify-center h-full text-rose-500 gap-4">
                    <Ban className="h-8 w-8" />
                    <p className="font-black uppercase tracking-widest text-sm">
                      Submission Failed
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-center gap-6 p-6 rounded-[32px] bg-white/[0.02] border border-white/5">
                      <div
                        className={`h-20 w-20 rounded-[24px] flex items-center justify-center text-white ${getDecisionColor(result.decision || result.status)}`}
                      >
                        {getDecisionIcon(result.decision || result.status)}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-1">
                          Decision
                        </p>
                        <h4 className="text-4xl font-black text-white uppercase">
                          {result.decision || result.status}
                        </h4>
                      </div>
                    </div>
                    <ForensicRow label="Event ID" value={result.event_id} />
                    <ForensicRow
                      label="Reason"
                      value={result.reason || '...'}
                      highlight
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 sm:p-8"
            >
              <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-8">
                Recent Submissions
              </h4>
              <div className="space-y-3">
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setResult(h)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-transparent hover:border-white/5 transition-all text-left"
                  >
                    <div
                      className={`h-3 w-3 rounded-full ${DecisionDotColor(h.decision)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-black uppercase truncate">
                        {h._form?.title || 'Event'}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase ${decisionColor(h.decision)}`}
                    >
                      {h.decision}
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
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 block">
        {label}
      </label>
      <input
        className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-zinc-800 focus:outline-none focus:border-purple-500/50 font-bold"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ForensicRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1.5 border-b border-white/5 pb-4">
      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 block">
        {label}
      </span>
      <p
        className={`text-sm break-all font-bold ${highlight ? 'text-zinc-200 italic' : 'text-zinc-500 font-mono text-[11px]'}`}
      >
        {value}
      </p>
    </div>
  );
}

function DecisionDotColor(d?: string) {
  return d === 'NOW'
    ? 'bg-emerald-500'
    : d === 'LATER'
      ? 'bg-amber-500'
      : 'bg-rose-500';
}

function decisionColor(d?: string) {
  return d === 'NOW'
    ? 'text-emerald-400'
    : d === 'LATER'
      ? 'text-amber-400'
      : 'text-rose-400';
}

function getDecisionColor(d?: string) {
  return d === 'NOW'
    ? 'bg-emerald-500'
    : d === 'LATER'
      ? 'bg-amber-500'
      : d === 'NEVER'
        ? 'bg-rose-500'
        : 'bg-indigo-600';
}

function getDecisionIcon(d?: string) {
  switch (d) {
    case 'NOW':
      return <CheckCircle2 className="h-10 w-10" />;
    case 'LATER':
      return <Clock className="h-10 w-10" />;
    case 'NEVER':
      return <Ban className="h-10 w-10" />;
    case 'PROCESSING':
      return <RefreshCcw className="h-10 w-10 animate-spin" />;
    default:
      return null;
  }
}
