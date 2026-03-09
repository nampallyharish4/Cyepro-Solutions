'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Zap,
  Lock,
  Mail,
  ArrowRight,
  Terminal,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import axios from 'axios';

export default function Signup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirm: '',
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.email || !form.password) {
      setError('Email and password are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';
      const { data } = await axios.post(`${apiBase}/signup`, {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/');
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        (err?.code === 'ERR_NETWORK'
          ? 'Cannot reach the server. Make sure the backend is running on port 5000.'
          : 'Signup failed. Please try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Title Section */}
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-2xl shadow-purple-500/20">
            <Zap className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
              Create Account
            </h1>
            <p className="text-zinc-500 font-medium">
              Notification Prioritization Engine v2.1
            </p>
          </div>
        </div>

        {/* Signup Form */}
        <div className="glass-card p-10 neon-border-purple space-y-8">
          <form onSubmit={handleSignup} className="space-y-6">
            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-300 leading-relaxed">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  value={form.email}
                  onChange={(e) => {
                    setError(null);
                    setForm({ ...form, email: e.target.value });
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Min. 6 characters"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  value={form.password}
                  onChange={(e) => {
                    setError(null);
                    setForm({ ...form, password: e.target.value });
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
                <input
                  id="signup-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Re-enter password"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  value={form.confirm}
                  onChange={(e) => {
                    setError(null);
                    setForm({ ...form, confirm: e.target.value });
                  }}
                />
              </div>
            </div>

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
            <Link
              href="/login"
              className="font-semibold text-purple-400 hover:text-purple-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
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
  );
}
