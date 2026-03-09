'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Zap,
  Lock,
  Mail,
  ArrowRight,
  ShieldAlert,
  Terminal,
  CheckCircle2,
  XCircle,
  X,
  ShieldCheck,
} from 'lucide-react';
import axios from 'axios';

/* ─────────────────────────────────────────────
   Modal component
───────────────────────────────────────────── */
type ModalProps = {
  type: 'success' | 'error';
  title: string;
  message: string;
  email?: string;
  role?: string;
  onClose: () => void;
  onContinue?: () => void;
};

function Modal({ type, title, message, email, role, onClose, onContinue }: ModalProps) {
  const isSuccess = type === 'success';

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-sm rounded-3xl border p-8 space-y-6 shadow-2xl"
        style={{
          backgroundColor: '#0f0f12',
          borderColor: isSuccess ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
          boxShadow: isSuccess
            ? '0 0 60px rgba(16,185,129,0.15), 0 25px 50px rgba(0,0,0,0.6)'
            : '0 0 60px rgba(239,68,68,0.15), 0 25px 50px rgba(0,0,0,0.6)',
          animation: 'modal-in 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
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
            style={{
              background: isSuccess
                ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(185,28,28,0.1))',
              border: isSuccess ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
            }}
          >
            {isSuccess ? (
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            ) : (
              <XCircle className="h-10 w-10 text-red-400" />
            )}
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2
            className="text-xl font-black tracking-tight"
            style={{ color: isSuccess ? '#34d399' : '#f87171' }}
          >
            {title}
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">{message}</p>
        </div>

        {/* User info (success only) */}
        {isSuccess && email && (
          <div className="rounded-2xl p-4 space-y-2" style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 uppercase tracking-widest font-bold">Access Key</span>
              <span className="text-emerald-400 font-mono">{email}</span>
            </div>
            {role && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 uppercase tracking-widest font-bold">Role</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-widest">
                  <ShieldCheck className="h-3 w-3" />
                  {role}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {isSuccess && onContinue ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-zinc-400 hover:text-white border border-white/10 hover:bg-white/5 transition-all"
              >
                Stay
              </button>
              <button
                onClick={onContinue}
                className="flex-1 py-3 rounded-2xl text-sm font-black text-white transition-all flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                Enter System <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-sm font-black text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Login page
───────────────────────────────────────────── */
export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<null | {
    type: 'success' | 'error';
    title: string;
    message: string;
    email?: string;
    role?: string;
    // held in state, NOT written to localStorage until user confirms
    pendingToken?: string;
    pendingUser?: string;
    navigateTo?: string;
  }>(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const handleCloseModal = () => {
    if (modal?.type === 'success') {
      setForm({ email: '', password: '' });
    }
    setModal(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!form.email || !form.password) {
      setModal({
        type: 'error',
        title: 'Missing Credentials',
        message: 'Both an access key (email) and master secret (password) are required.',
      });
      setLoading(false);
      return;
    }

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';
      const { data } = await axios.post(`${apiBase}/login`, {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      // ✅ Do NOT write to localStorage yet — wait for user to confirm via modal
      setModal({
        type: 'success',
        title: 'Access Granted',
        message: 'Authentication successful. Welcome to the Notification Prioritization Engine.',
        email: data.user.email,
        role: data.user.role,
        // Store credentials in modal state only
        pendingToken: data.token,
        pendingUser: JSON.stringify(data.user),
        navigateTo: '/',
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        (err?.code === 'ERR_NETWORK'
          ? 'Cannot reach the server. Make sure the backend is running on port 5000.'
          : 'Login failed. Please check your credentials and try again.');

      setModal({
        type: 'error',
        title: 'Access Denied',
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Modal overlay */}
      {modal && (
        <Modal
          type={modal.type}
          title={modal.title}
          message={modal.message}
          email={modal.email}
          role={modal.role}
          onClose={handleCloseModal}  // Stay — discard credentials, stay on login
          onContinue={
            modal.navigateTo
              ? () => {
                  // Commit credentials to localStorage only now
                  if (modal.pendingToken) localStorage.setItem('token', modal.pendingToken);
                  if (modal.pendingUser) localStorage.setItem('user', modal.pendingUser);
                  router.push(modal.navigateTo!);
                }
              : undefined
          }
        />
      )}

      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Title Section */}
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-2xl shadow-purple-500/20">
              <Zap className="h-10 w-10 text-white" />
            </div>
            <div className="space-y-2">
              <p className="text-zinc-500 font-medium">
                Notification Prioritization Engine v2.1
              </p>
            </div>
          </div>

          {/* Login Form */}
          <div className="glass-card p-6 sm:p-10 neon-border-purple space-y-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Access Key (Email)
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Master Secret
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="glass-button w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black uppercase tracking-[0.1em] flex items-center justify-center gap-3 py-5 transition-all"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Engage System
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            {/* Sign up link */}
            <p className="text-center text-sm text-zinc-500">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="font-semibold text-purple-400 hover:text-purple-300 transition-colors"
              >
                Create one
              </Link>
            </p>

            {/* Mock Credentials Badge */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-4">
              <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-500/80 leading-relaxed font-medium">
                <strong>Reviewer Credentials:</strong>
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/60 w-16">Admin</span>
                    <code className="text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded">admin@cyepro.com</code>
                    <span className="text-amber-500/40">|</span>
                    <code className="text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded">password123</code>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/60 w-16">Operator</span>
                    <code className="text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded">operator@cyepro.com</code>
                    <span className="text-amber-500/40">|</span>
                    <code className="text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded">operator123</code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 text-zinc-600">
            <Terminal className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Secured by Cyepro Solutions
            </span>
          </div>
        </div>
      </div>

      {/* Modal animation keyframe */}
      <style>{`
        @keyframes modal-in {
          0% { opacity: 0; transform: scale(0.85) translateY(16px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
