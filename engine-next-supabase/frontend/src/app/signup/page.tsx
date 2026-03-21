'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Zap,
  Lock,
  Mail,
  ArrowRight,
  Terminal,
  UserPlus,
  CheckCircle2,
  XCircle,
  X,
  ShieldCheck,
  Check,
  AlertTriangle,
} from 'lucide-react';
import axios from 'axios';

/* ─────────────────────────────────────────────
   Password strength logic
───────────────────────────────────────────── */
type StrengthInfo = {
  score: number;       // 0–5 (number of rules passed)
  label: string;
  color: string;
  barHex: string;      // direct hex — no Tailwind class parsing needed
  rules: { label: string; passed: boolean }[];
};

function getStrength(password: string): StrengthInfo {
  const rules = [
    { label: 'At least 8 characters',    passed: password.length >= 8 },
    { label: 'Uppercase letter (A–Z)',    passed: /[A-Z]/.test(password) },
    { label: 'Lowercase letter (a–z)',    passed: /[a-z]/.test(password) },
    { label: 'Number (0–9)',             passed: /\d/.test(password) },
    { label: 'Special character (!@#…)', passed: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = rules.filter((r) => r.passed).length;
  // 5 levels, indexed 0–4. Clamp score so levels[index] is never undefined.
  const levels = [
    { label: 'Too Weak',   color: 'text-red-400',     barHex: '#ef4444' },
    { label: 'Weak',       color: 'text-orange-400',   barHex: '#f97316' },
    { label: 'Fair',       color: 'text-amber-400',    barHex: '#f59e0b' },
    { label: 'Strong',     color: 'text-emerald-400',  barHex: '#10b981' },
    { label: 'Very Strong',color: 'text-emerald-300',  barHex: '#34d399' },
  ];
  const idx = Math.min(score, levels.length - 1);
  return { score, ...levels[idx], rules };
}

/* ─────────────────────────────────────────────
   Modal component (reusable)
───────────────────────────────────────────── */
type ModalProps = {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  detail?: string;
  email?: string;
  onClose: () => void;
  onContinue?: () => void;
  continueLabel?: string;
};

function Modal({ type, title, message, detail, email, onClose, onContinue, continueLabel }: ModalProps) {
  const isSuccess = type === 'success';
  const isWarning = type === 'warning';

  const palette = {
    success: { glow: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)',  text: '#34d399' },
    warning: { glow: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)',  text: '#fbbf24' },
    error:   { glow: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)',   text: '#f87171' },
  }[type];

  const btnGradient = {
    success: 'linear-gradient(135deg, #10b981, #059669)',
    warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
    error:   'linear-gradient(135deg, #ef4444, #b91c1c)',
  }[type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border p-8 space-y-6 shadow-2xl"
        style={{
          backgroundColor: '#0f0f12',
          borderColor: palette.border,
          boxShadow: `0 0 60px ${palette.glow}, 0 25px 50px rgba(0,0,0,0.6)`,
          animation: 'modal-in 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-xl text-zinc-600 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="flex justify-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-3xl"
            style={{ background: `linear-gradient(135deg, ${palette.glow.replace('0.15','0.3')}, ${palette.glow})`, border: `1px solid ${palette.border}` }}
          >
            {isSuccess  && <CheckCircle2   className="h-10 w-10 text-emerald-400" />}
            {isWarning  && <AlertTriangle  className="h-10 w-10 text-amber-400" />}
            {!isSuccess && !isWarning && <XCircle className="h-10 w-10 text-red-400" />}
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black tracking-tight" style={{ color: palette.text }}>
            {title}
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">{message}</p>
          {detail && <p className="text-xs text-zinc-600 leading-relaxed">{detail}</p>}
        </div>

        {/* Email chip (success) */}
        {isSuccess && email && (
          <div
            className="rounded-2xl p-4 flex items-center justify-between"
            style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}
          >
            <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Account</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs">
              <ShieldCheck className="h-3 w-3" /> {email}
            </span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          {onContinue ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-zinc-400 hover:text-white border border-white/10 hover:bg-white/5 transition-all"
              >
                Close
              </button>
              <button
                onClick={onContinue}
                className="flex-1 py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all"
                style={{ background: btnGradient }}
              >
                {continueLabel ?? 'Continue'} <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-sm font-black text-white transition-all"
              style={{ background: btnGradient }}
            >
              {isWarning ? 'Go to Login' : 'Fix & Retry'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Signup page
───────────────────────────────────────────── */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Signup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });
  const [modal, setModal] = useState<null | {
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
    detail?: string;
    email?: string;
    navigateTo?: string;
    continueLabel?: string;
  }>(null);

  /* Live strength */
  const strength = useMemo(() => getStrength(form.password), [form.password]);

  /* Inline validation helpers */
  const emailError   = touched.email   && !EMAIL_REGEX.test(form.email)   ? 'Please enter a valid email address.' : null;
  const confirmError = touched.confirm && form.confirm && form.password !== form.confirm ? 'Passwords do not match.' : null;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- Client-side checks ---
    if (!EMAIL_REGEX.test(form.email)) {
      setModal({
        type: 'error',
        title: 'Invalid Email',
        message: 'The email address you entered is not in a valid format.',
        detail: 'Example of a valid email: yourname@domain.com',
      });
      return;
    }
    if (strength.score < 3) {
      setModal({
        type: 'error',
        title: 'Weak Password',
        message: `Your password is "${strength.label}". Please choose a stronger password.`,
        detail: 'Use at least 8 characters with uppercase, lowercase, a number and a special character.',
      });
      return;
    }
    if (form.password !== form.confirm) {
      setModal({
        type: 'error',
        title: 'Passwords Don\'t Match',
        message: 'The passwords you entered do not match. Please re-enter them carefully.',
      });
      return;
    }

    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';
      const { data } = await axios.post(`${apiBase}/signup`, {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setModal({
        type: 'success',
        title: 'Account Created!',
        message: 'Your account has been created successfully. Please log in to access the engine.',
        email: data.user.email,
        navigateTo: '/login',
        continueLabel: 'Go to Login',
      });
    } catch (err: any) {
      const serverMsg: string = err?.response?.data?.error ?? '';
      const status: number   = err?.response?.status ?? 0;

      if (status === 409 || serverMsg.toLowerCase().includes('already exists') || serverMsg.toLowerCase().includes('duplicate')) {
        setModal({
          type: 'warning',
          title: 'Account Already Exists',
          message: `An account with "${form.email.trim().toLowerCase()}" already exists.`,
          detail: 'Try logging in instead, or use a different email address.',
          navigateTo: '/login',
          continueLabel: 'Go to Login',
        });
      } else if (err?.code === 'ERR_NETWORK') {
        setModal({
          type: 'error',
          title: 'Server Unreachable',
          message: 'Cannot connect to the backend. Make sure the server is running on port 5000.',
        });
      } else {
        setModal({
          type: 'error',
          title: 'Signup Failed',
          message: serverMsg || 'An unexpected error occurred. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
    onBlur: () => setTouched({ ...touched, [key]: true }),
  });

  return (
    <>
      {/* ── Modal ── */}
      {modal && (
        <Modal
          type={modal.type}
          title={modal.title}
          message={modal.message}
          detail={modal.detail}
          email={modal.email}
          onClose={() => setModal(null)}
          onContinue={modal.navigateTo ? () => router.push(modal.navigateTo!) : undefined}
          continueLabel={modal.continueLabel}
        />
      )}

      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">

          {/* Header */}
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-2xl shadow-purple-500/20">
              <Zap className="h-10 w-10 text-white" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">Create Account</h1>
              <p className="text-zinc-500 font-medium">Notification Prioritization Engine v2.1</p>
            </div>
          </div>

          {/* Form card */}
          <div className="glass-card p-10 neon-border-purple space-y-6">
            <form onSubmit={handleSignup} className="space-y-5">

              {/* Email */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
                  <input
                    id="signup-email"
                    type="text"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={`w-full bg-white/5 border rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 transition-all ${emailError ? 'border-red-500/50 focus:ring-red-500/40' : 'border-white/10 focus:ring-purple-500/50'}`}
                    {...field('email')}
                  />
                </div>
                {emailError && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5 pl-1">
                    <XCircle className="h-3 w-3 shrink-0" /> {emailError}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
                  <input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    {...field('password')}
                  />
                </div>

                {/* Strength meter */}
                {form.password.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {/* Segmented bar */}
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-1.5 flex-1 rounded-full transition-all duration-300"
                          style={{
                            backgroundColor: i < strength.score ? strength.barHex : 'rgba(255,255,255,0.07)',
                          }}
                        />
                      ))}
                    </div>
                    {/* Label */}
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${strength.color}`}>
                      Password strength: {strength.label}
                    </p>
                    {/* Rules checklist */}
                    <div className="grid grid-cols-1 gap-0.5 pt-0.5">
                      {strength.rules.map((r) => (
                        <p key={r.label} className={`text-[10px] flex items-center gap-1.5 ${r.passed ? 'text-emerald-500' : 'text-zinc-600'}`}>
                          {r.passed
                            ? <Check className="h-3 w-3 shrink-0" />
                            : <X className="h-3 w-3 shrink-0" />}
                          {r.label}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
                  <input
                    id="signup-confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    className={`w-full bg-white/5 border rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 transition-all ${confirmError ? 'border-red-500/50 focus:ring-red-500/40' : 'border-white/10 focus:ring-purple-500/50'}`}
                    {...field('confirm')}
                  />
                </div>
                {confirmError && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5 pl-1">
                    <XCircle className="h-3 w-3 shrink-0" /> {confirmError}
                  </p>
                )}
                {!confirmError && form.confirm.length > 0 && form.password === form.confirm && (
                  <p className="text-xs text-emerald-500 flex items-center gap-1.5 pl-1">
                    <Check className="h-3 w-3 shrink-0" /> Passwords match
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                id="signup-submit"
                className="glass-button w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black uppercase tracking-[0.1em] flex items-center justify-center gap-3 py-5 transition-all"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    Create Account
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            {/* Sign in link */}
            <p className="text-center text-sm text-zinc-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 text-zinc-600">
            <Terminal className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Secured by NPE Solutions</span>
          </div>
        </div>
      </div>

      {/* Modal animation */}
      <style>{`
        @keyframes modal-in {
          0%   { opacity: 0; transform: scale(0.85) translateY(16px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
