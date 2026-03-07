'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Lock,
  Mail,
  ArrowRight,
  ShieldAlert,
  Terminal,
} from 'lucide-react';
import axios from 'axios';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: 'admin@cyepro.com',
    password: 'password123',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api'}/login`, form);
      localStorage.setItem('token', data.token);
      router.push('/');
    } catch (err) {
      alert("Invalid credentials / Database connection failed");
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
              Command Terminal
            </h1>
            <p className="text-zinc-500 font-medium">
              Notification Prioritization Engine v2.1
            </p>
          </div>
        </div>

        {/* Login Form */}
        <div className="glass-card p-10 neon-border-purple space-y-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Access Key (Email)
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
                <input
                  type="email"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
                  type="password"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>

            <button
              disabled={loading}
              className="glass-button w-full bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-[0.1em] flex items-center justify-center gap-3 py-5"
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <>
                  Engage System
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Mock Credentials Badge */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-4">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-500/80 leading-relaxed font-medium">
              <strong>Reviewer Credentials:</strong>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/60 w-16">Admin</span>
                  <code className="text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded">admin@cyepro.com</code>
                  <span className="text-amber-500/40">|</span>
                  <code className="text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded">password123</code>
                </div>
                <div className="flex items-center gap-2">
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
  );
}
