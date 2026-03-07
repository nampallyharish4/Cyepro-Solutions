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
  Database,
  Send,
  Skull,
  Brain,
  ChevronRight,
} from 'lucide-react';
import api, { API_URL } from '@/lib/api';
import axios from 'axios';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>({
    total: 0, now: 0, later: 0, never: 0, sent: 0,
    queue: { waiting: 0, failed: 0, dead_letter: 0 },
    recent: [],
  });
  const [health, setHealth] = useState<any>({
    status: 'LOADING', engine: 'UNKNOWN', database: 'UNKNOWN',
    ai_service: { status: 'UNKNOWN', circuitBreaker: 'UNKNOWN', failureCount: 0 },
  });
  const [timeline, setTimeline] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      try {
        const [mRes, hRes, tRes] = await Promise.all([
          api.get('/metrics'),
          axios.get(`${API_URL.replace('/api', '/health')}`),
          api.get('/metrics/timeline'),
        ]);
        setMetrics(mRes.data);
        setHealth(hRes.data);
        setTimeline(tRes.data);
      } catch (err) {
        console.error('Fetch failed', err);
        setHealth((prev: any) => ({ ...prev, status: 'ERROR', engine: 'DISCONNECTED' }));
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const chartData = [
    { name: 'NOW', value: metrics.now, fill: '#10b981' },
    { name: 'LATER', value: metrics.later, fill: '#f59e0b' },
    { name: 'NEVER', value: metrics.never, fill: '#f43f5e' },
  ].filter((d) => d.value > 0);

  const aiStatus = health.ai_service || {};
  const aiHealthy = aiStatus.status === 'HEALTHY' || aiStatus.circuitBreaker === 'CLOSED';
  const dbHealthy = health.database === 'CONNECTED';

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
          Engine Command
        </h1>
        <p className="text-base sm:text-lg text-zinc-400">
          Real-time prioritization & system intelligence overview.
        </p>
      </motion.div>

      {/* Health Status Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap items-center gap-3"
      >
        <StatusBadge
          label="System"
          value={health.status === 'OK' ? 'Healthy' : health.status === 'DEGRADED' ? 'Degraded' : health.status}
          icon={ActivityIcon}
          color={health.status === 'OK' ? 'emerald' : 'amber'}
        />
        <StatusBadge
          label="Database"
          value={dbHealthy ? 'Connected' : health.database || 'Unknown'}
          icon={Database}
          color={dbHealthy ? 'emerald' : 'amber'}
        />
        <StatusBadge
          label="AI Service"
          value={aiHealthy ? 'Operational' : aiStatus.circuitBreaker === 'OPEN' ? 'Circuit Open' : 'Degraded'}
          icon={Brain}
          color={aiHealthy ? 'purple' : 'amber'}
        />
        {aiStatus.failureCount > 0 && (
          <StatusBadge
            label="AI Failures"
            value={`${aiStatus.failureCount} / ${aiStatus.failureThreshold || 5}`}
            icon={AlertTriangle}
            color="amber"
          />
        )}
      </motion.div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Total Events" value={metrics.total} icon={ActivityIcon} color="zinc" delay={0} />
        <MetricCard label="Deliver (NOW)" value={metrics.now} icon={ArrowUpRight} color="emerald" delay={0.05} />
        <MetricCard label="Defer (LATER)" value={metrics.later} icon={Clock} color="amber" delay={0.1} />
        <MetricCard label="Drop (NEVER)" value={metrics.never} icon={Ban} color="rose" delay={0.15} />
        <MetricCard label="Sent" value={metrics.sent} icon={Send} color="purple" delay={0.2} />
      </div>

      {/* Queue Stats */}
      {(metrics.queue?.waiting > 0 || metrics.queue?.failed > 0 || metrics.queue?.dead_letter > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex flex-wrap gap-3"
        >
          {metrics.queue.waiting > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-sm">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-amber-300 font-semibold">{metrics.queue.waiting}</span>
              <span className="text-zinc-400">in queue</span>
            </div>
          )}
          {metrics.queue.failed > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span className="text-rose-300 font-semibold">{metrics.queue.failed}</span>
              <span className="text-zinc-400">failed (retrying)</span>
            </div>
          )}
          {metrics.queue.dead_letter > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm">
              <Skull className="h-4 w-4 text-red-400" />
              <span className="text-red-300 font-semibold">{metrics.queue.dead_letter}</span>
              <span className="text-zinc-400">dead letter</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 sm:p-8"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-semibold text-white">Priority Distribution</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Live</span>
          </div>
          <div className="h-60 sm:h-72 w-full">
            {mounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
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
                {mounted ? 'Waiting for incoming data...' : 'Loading...'}
              </div>
            )}
          </div>
          {/* Legend under pie */}
          {mounted && chartData.length > 0 && (
            <div className="flex justify-center gap-6 mt-2">
              {chartData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                  {d.name}: {d.value}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Area Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6 sm:p-8"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-semibold text-white">Hourly Trend (24h)</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Time Series</span>
          </div>
          <div className="h-60 sm:h-72 w-full">
            {mounted && timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="colorNow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorLater" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNever" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="hour"
                    stroke="#52525b"
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    tickFormatter={(v: string) => v.split('T')[1] || v}
                  />
                  <YAxis stroke="#52525b" tick={{ fill: '#71717a', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    labelFormatter={(v) => String(v).replace('T', ' ')}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
                  <Area type="monotone" dataKey="now" name="NOW" stroke="#10b981" fillOpacity={1} fill="url(#colorNow)" />
                  <Area type="monotone" dataKey="later" name="LATER" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLater)" />
                  <Area type="monotone" dataKey="never" name="NEVER" stroke="#f43f5e" fillOpacity={1} fill="url(#colorNever)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-600 italic">
                {mounted ? 'No timeline data yet — events will appear here.' : 'Loading...'}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6 sm:p-8"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-semibold text-white">Recent Activity</h3>
          <a href="/audit" className="text-[10px] font-bold uppercase tracking-widest text-purple-400 hover:text-white transition-colors flex items-center gap-1">
            View All <ChevronRight className="h-3 w-3" />
          </a>
        </div>

        {!mounted ? (
          <div className="py-8 text-center text-zinc-600 italic">Loading...</div>
        ) : metrics.recent?.length === 0 ? (
          <div className="py-8 text-center text-zinc-600 italic">No decisions yet — submit an event from the Simulator.</div>
        ) : (
          <div className="space-y-2">
            {metrics.recent.map((entry: any) => {
              const ev = entry.notification_events;
              return (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-colors">
                  <div className="shrink-0">
                    <DecisionDot decision={entry.decision} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {ev?.title || 'Untitled'}
                    </p>
                    <p className="text-[11px] text-zinc-600 truncate">
                      {entry.reason}
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${decisionTextColor(entry.decision)}`}>
                      {entry.decision}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {formatDistanceToNow(new Date(entry.processed_at), { addSuffix: true })}
                    </span>
                  </div>
                  {/* Mobile decision badge */}
                  <div className="sm:hidden shrink-0">
                    <span className={`text-[10px] font-bold uppercase ${decisionTextColor(entry.decision)}`}>
                      {entry.decision}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function decisionTextColor(d: string) {
  switch (d) {
    case 'NOW': return 'text-emerald-400';
    case 'LATER': return 'text-amber-400';
    case 'NEVER': return 'text-rose-400';
    case 'SENT': return 'text-purple-400';
    case 'FAILED': return 'text-red-400';
    default: return 'text-zinc-400';
  }
}

function DecisionDot({ decision }: { decision: string }) {
  const bg = {
    NOW: 'bg-emerald-500',
    LATER: 'bg-amber-500',
    NEVER: 'bg-rose-500',
    SENT: 'bg-purple-500',
    FAILED: 'bg-red-500',
  }[decision] || 'bg-zinc-500';

  return <span className={`block h-2.5 w-2.5 rounded-full ${bg} shadow-lg`} />;
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
      className="glass-card p-4 sm:p-6 flex flex-col gap-3 group hover:border-white/20 transition-all duration-300"
    >
      <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border ${colors[color]} group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div>
        <span className="text-[10px] sm:text-sm font-medium text-zinc-500 uppercase tracking-wide">{label}</span>
        <div className="text-2xl sm:text-3xl font-bold text-white mt-0.5 tabular-nums">{value.toLocaleString()}</div>
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
    <div className={`flex items-center gap-2 rounded-full border px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${colors[color]}`}>
      <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
      <span className="opacity-60">{label}:</span>
      <span>{value}</span>
    </div>
  );
}
