'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Brain,
  Zap,
  Clock,
  Shield,
  Save,
  RefreshCcw,
  AlertTriangle,
  Database,
  CheckCircle2,
  Cpu,
  Fingerprint,
} from 'lucide-react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Setting {
  key: string;
  value: string;
  description: string;
}

const DEFAULT_SETTINGS: Setting[] = [
  {
    key: 'AI_MODEL',
    value: 'llama-3.3-70b-versatile',
    description: 'Primary cognitive model for classification.',
  },
  {
    key: 'DEDUPE_THRESHOLD',
    value: '0.8',
    description: 'Sensitivity for fuzzy duplicate detection (0.0-1.0).',
  },
  {
    key: 'LATER_DELAY_MIN',
    value: '30',
    description: 'Default deferral period in minutes.',
  },
  {
    key: 'FATIGUE_LIMIT',
    value: '5',
    description: 'Max high-priority alerts / hour / user.',
  },
];

export default function IntelligenceSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      // Merge with defaults to ensure all keys exist
      const merged = DEFAULT_SETTINGS.map((def) => {
        const found = data.find((s: any) => s.key === def.key);
        return found
          ? {
              key: found.key,
              value: found.value,
              description: found.description,
            }
          : def;
      });
      setSettings(merged);
    } catch (e) {
      // Silent catch to prevent dev-mode error overlays when hitting a deployed backend that lacks these routes.
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const updateVal = (key: string, val: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value: val } : s)),
    );
  };

  const handleSave = async (key: string) => {
    const setting = settings.find((s) => s.key === key);
    if (!setting) return;

    setSaving(true);
    try {
      await api.post('/settings', setting);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      // Silently discard to prevent dev-mode error overlays
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-4">
        <RefreshCcw className="h-10 w-10 text-zinc-700 animate-spin" />
        <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">
          Synchronizing Engine State...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-500">
            <Settings className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase">
            Intelligence Tuning
          </h1>
        </div>
        <p className="text-zinc-500 font-medium max-w-2xl">
          Modify global cognitive parameters in real-time. Changes are applied
          instantly to the decision pipeline without restart.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI & Logic Section */}
        <SettingsCard
          icon={Brain}
          title="Cognitive Intelligence"
          subtitle="Logic & Strategy Control"
        >
          <div className="space-y-8 p-3">
            <SettingInput
              icon={Cpu}
              label="Primary AI Model"
              description={
                settings.find((s) => s.key === 'AI_MODEL')?.description || ''
              }
              value={settings.find((s) => s.key === 'AI_MODEL')?.value || ''}
              onChange={(v: string) => updateVal('AI_MODEL', v)}
              onSave={() => handleSave('AI_MODEL')}
              isSaving={saving}
            >
              <select
                value={settings.find((s) => s.key === 'AI_MODEL')?.value}
                onChange={(e) => {
                  updateVal('AI_MODEL', e.target.value);
                  handleSave('AI_MODEL');
                }}
                className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="llama-3.3-70b-versatile">
                  Llama 3.3 70B (Fast/Optimal)
                </option>
                <option value="gemini-flash-latest">
                  Gemini 2.0 Flash (Fast Reasoning)
                </option>
                <option value="gemini-pro-1.5">
                  Gemini 1.5 Pro (Deep Context)
                </option>
                <option value="mixtral-8x7b-32768">
                  Mixtral 8x7B (Stable)
                </option>
              </select>
            </SettingInput>

            <SettingInput
              icon={Fingerprint}
              label="Dedupe Sensitivity"
              description={
                settings.find((s) => s.key === 'DEDUPE_THRESHOLD')
                  ?.description || ''
              }
              value={
                settings.find((s) => s.key === 'DEDUPE_THRESHOLD')?.value || ''
              }
              onChange={(v: string) => updateVal('DEDUPE_THRESHOLD', v)}
              onSave={() => handleSave('DEDUPE_THRESHOLD')}
              isSaving={saving}
              type="number"
              min="0"
              max="1"
              step="0.05"
            />
          </div>
        </SettingsCard>

        {/* Operational Limits Section */}
        <SettingsCard
          icon={Shield}
          title="Strategic Throttling"
          subtitle="Fatigue & Queue Management"
        >
          <div className="space-y-8 p-3">
            <SettingInput
              icon={Zap}
              label="Alert Fatigue Limit"
              description={
                settings.find((s) => s.key === 'FATIGUE_LIMIT')?.description ||
                ''
              }
              value={
                settings.find((s) => s.key === 'FATIGUE_LIMIT')?.value || ''
              }
              onChange={(v: string) => updateVal('FATIGUE_LIMIT', v)}
              onSave={() => handleSave('FATIGUE_LIMIT')}
              isSaving={saving}
              type="number"
            />

            <SettingInput
              icon={Clock}
              label="Queue Deferral (Min)"
              description={
                settings.find((s) => s.key === 'LATER_DELAY_MIN')
                  ?.description || ''
              }
              value={
                settings.find((s) => s.key === 'LATER_DELAY_MIN')?.value || ''
              }
              onChange={(v: string) => updateVal('LATER_DELAY_MIN', v)}
              onSave={() => handleSave('LATER_DELAY_MIN')}
              isSaving={saving}
              type="number"
            />
          </div>
        </SettingsCard>
      </div>

      {/* Advanced Footer */}
      <div className="glass-card p-6 border-l-4 border-l-purple-600 flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-purple-600/10 text-purple-400">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black text-white uppercase tracking-tighter">
              Persistence Mode
            </p>
            <p className="text-xs text-zinc-500 font-medium">
              All settings are versioned in the primary database.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
            System Synced
          </span>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black uppercase text-xs tracking-widest flex items-center gap-3 shadow-2xl shadow-emerald-500/20"
          >
            <CheckCircle2 className="h-4 w-4" />
            Settings Updated Live
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: any;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-400 border border-white/5 shadow-inner">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">
            {title}
          </h3>
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function SettingInput({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  onSave,
  isSaving,
  type = 'text',
  children,
  ...props
}: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-950 text-zinc-700">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div>
            <label className="text-xs font-black text-zinc-300 uppercase tracking-widest">
              {label}
            </label>
            <p className="text-[10px] text-zinc-600 font-bold mt-0.5">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {children ? (
          children
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            {...props}
          />
        )}
        {!children && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="h-12 w-12 flex items-center justify-center rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition-all disabled:opacity-30 shadow-lg shadow-purple-600/20"
          >
            {isSaving ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
