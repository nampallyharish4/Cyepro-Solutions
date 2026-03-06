'use client';

import { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  Ban,
  Activity as ActivityIcon,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    total: 0,
    now: 0,
    later: 0,
    never: 0,
  });
  const [health, setHealth] = useState({
    status: 'LOADING',
    engine: 'UNKNOWN',
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      try {
        const [mRes, hRes] = await Promise.all([
          axios.get(`${API_URL}/metrics`),
          axios.get(`${API_URL.replace('/api', '/health')}`),
        ]);
        setMetrics(mRes.data);
        setHealth(hRes.data);
      } catch (err) {
        console.error('Fetch failed', err);
        setHealth({ status: 'ERROR', engine: 'DISCONNECTED' });
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000); // Live refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const chartData = [
    { name: 'NOW', value: metrics.now, color: '#10b981' },
    { name: 'LATER', value: metrics.later, color: '#f59e0b' },
    { name: 'NEVER', value: metrics.never, color: '#f43f5e' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-10">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
          Engine Command
        </h1>
        <p className="text-lg text-zinc-400">
          Real-time prioritization & system intelligence overview.
        </p>
      </motion.div>

      {/* Health Status Bar */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap items-center gap-4 py-4"
      >
        <StatusBadge
          label="Engine Status"
          value={health.engine}
          icon={ActivityIcon}
          color={health.status === 'OK' ? 'emerald' : 'amber'}
        />
        <StatusBadge
          label="AI Service"
          value="Operational"
          icon={ShieldCheck}
          color="purple"
        />
      </motion.div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Events"
          value={metrics.total}
          icon={ActivityIcon}
          color="zinc"
          delay={0}
        />
        <MetricCard
          label="Deliver (NOW)"
          value={metrics.now}
          icon={ArrowUpRight}
          color="emerald"
          delay={0.1}
        />
        <MetricCard
          label="Defer (LATER)"
          value={metrics.later}
          icon={Clock}
          color="amber"
          delay={0.2}
        />
        <MetricCard
          label="Drop (NEVER)"
          value={metrics.never}
          icon={Ban}
          color="rose"
          delay={0.3}
        />
      </div>

      {/* Featured Chart Section */}
      <div className="grid grid-cols-1 gap-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-8"
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">
              Priority Distribution
            </h3>
            <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Live Flow Analysis
            </span>
          </div>
          <div className="h-72 w-full">
            {mounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
                <div className="flex h-full items-center justify-center text-zinc-600 italic">
                    {mounted ? 'Waiting for incoming data stream...' : 'Loading Analytics Hardware...'}
                </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, delay }: any) {
  const colors: any = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    zinc: 'text-zinc-400 bg-zinc-500/10 border-white/5',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-6 flex flex-col gap-4 group hover:border-white/20 transition-all duration-300"
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl border ${colors[color]} group-hover:scale-110 transition-transform`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <span className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
          {label}
        </span>
        <div className="text-3xl font-bold text-white mt-1 tabular-nums">
          {value.toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider ${colors[color]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="opacity-60">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

