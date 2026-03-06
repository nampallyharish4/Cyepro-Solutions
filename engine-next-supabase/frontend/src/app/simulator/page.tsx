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
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

export default function Simulator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({
    user_id: '',
    event_type: '',
    title: '',
    message: '',
    source: '',
    channel: 'PUSH',
    dedupe_key: '',
  });

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      dedupe_key: `dedupe_${Math.random().toString(36).substr(2, 9)}`,
    }));
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const { data } = await axios.post(`${API_URL}/notifications`, form);
      // Since it's async, we set temporary status
      setResult({ ...data, status: 'ACCEPTED' });

      // Poll for the audit log of this event
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const auditRes = await axios.get(`${API_URL}/audit`);
          const item = auditRes.data.find(
            (a: any) => a.event_id === data.event_id,
          );
          if (item) {
            setResult(item);
            clearInterval(interval);
          }
        } catch (err) {
            console.error(err);
        }
        if (attempts > 20) clearInterval(interval);
      }, 800);

      // Regenerate dedupe key for next test
      setForm(prev => ({
        ...prev,
        dedupe_key: `dedupe_${Math.random().toString(36).substr(2, 9)}`
      }));

    } catch (err) {
      console.error(err);
      setResult({ error: 'Failed to submit event' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-4xl font-bold text-white tracking-tight">
          System Simulator
        </h1>
        <p className="text-lg text-zinc-400">
          Trigger notification events to test prioritization logic & AI classification.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Form Section */}
        <motion.section 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <InputGroup
              label="User ID"
              value={form.user_id}
              onChange={(v: string) => setForm({ ...form, user_id: v })}
            />
            <div className="grid grid-cols-2 gap-4">
              <InputGroup
                label="Event Type"
                value={form.event_type}
                onChange={(v: string) => setForm({ ...form, event_type: v })}
              />
              <InputGroup
                label="Source"
                value={form.source}
                onChange={(v: string) => setForm({ ...form, source: v })}
              />
            </div>
            <InputGroup
              label="Title"
              value={form.title}
              onChange={(v: string) => setForm({ ...form, title: v })}
            />
            <div className="space-y-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <label>Message Payload</label>
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[100px]"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>

            <button
              disabled={loading}
              className="glass-button w-full bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <RefreshCcw className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Rocket className="h-5 w-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
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
            className="glass-card p-8 min-h-[400px] flex flex-col"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white">
              <ActivityIcon className="h-5 w-5 text-purple-400" />
              Real-time Output
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
                    <div className="flex flex-col items-center justify-center h-full text-rose-400 gap-2">
                        <AlertCircle className="h-12 w-12" />
                        <p>{result.error}</p>
                    </div>
                    ) : (
                    <div className="space-y-8">
                        {/* Status Display */}
                        <div className="flex items-center gap-4">
                        <div
                            className={`h-16 w-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${getDecisionColor(result.decision || result.status)}`}
                        >
                            {getDecisionIcon(result.decision || result.status)}
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                            Processing Stage
                            </span>
                            <h4 className="text-2xl font-bold text-white capitalize">
                            {result.decision || result.status}
                            </h4>
                        </div>
                        </div>

                        <div className="space-y-4">
                        <DetailRow
                            label="Event ID"
                            value={result.event_id || result.id}
                        />
                        <DetailRow
                            label="Final Priority"
                            value={result.decision || 'PENDING'}
                            highlight
                        />
                        <DetailRow
                            label="Decision Reason"
                            value={result.reason || 'Analysis in progress...'}
                            isMessage
                        />
                        {result.ai_used && (
                            <div className="mt-6 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 flex items-center gap-3">
                            <Zap className="h-5 w-5 text-purple-400" />
                            <div>
                                <p className="text-xs font-semibold uppercase text-purple-300">
                                AI Analyzed
                                </p>
                                <p className="text-sm text-purple-200">
                                Confidence:{' '}
                                {((result.ai_confidence || 0) * 100).toFixed(1)}% (
                                {result.ai_model})
                                </p>
                            </div>
                            </div>
                        )}
                        </div>
                    </div>
                    )}
                </motion.div>
                ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-4 opacity-30">
                    <Send className="h-20 w-20" />
                    <p className="font-medium text-center">
                    Submit an event to see classification results.
                    </p>
                </div>
                )}
            </AnimatePresence>
          </motion.div>
        </section>
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange }: any) {
  return (
    <div className="space-y-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
      <label>{label}</label>
      <input
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function DetailRow({ label, value, highlight, isMessage }: any) {
  return (
    <div className="border-b border-white/5 pb-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">
        {label}
      </span>
      <p
        className={`text-sm ${highlight ? 'font-bold text-white bg-white/5 px-2 py-0.5 rounded-md inline-block' : 'text-zinc-300'} ${isMessage ? 'italic text-zinc-400' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}

const getDecisionColor = (d: string) => {
  switch (d) {
    case 'NOW':
      return 'bg-emerald-500 shadow-emerald-500/20';
    case 'LATER':
      return 'bg-amber-500 shadow-amber-500/20';
    case 'NEVER':
      return 'bg-rose-500 shadow-rose-500/20';
    case 'ACCEPTED':
      return 'bg-indigo-500 animate-pulse';
    default:
      return 'bg-zinc-700';
  }
};

const getDecisionIcon = (d: string) => {
  switch (d) {
    case 'NOW':
      return <CheckCircle2 className="h-8 w-8" />;
    case 'LATER':
      return <Clock className="h-8 w-8" />;
    case 'NEVER':
      return <Ban className="h-8 w-8" />;
    case 'ACCEPTED':
      return <RefreshCcw className="h-8 w-8 animate-spin" />;
    default:
      return null;
  }
};
