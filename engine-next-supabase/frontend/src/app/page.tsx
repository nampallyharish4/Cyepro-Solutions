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
  Target,
  BarChart3,
  TrendingDown,
  Microscope
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
  BarChart,
  Bar
} from 'recharts';
import { PageLoader } from '@/components/PageLoader';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>({
    total: 0, now: 0, later: 0, never: 0, sent: 0,
    queue: { waiting: 0, failed: 0, dead_letter: 0 },
    recent: [],
  });
  const [analytics, setAnalytics] = useState<any>({
    ruleEfficiency: [],
    noiseSources: [],
    aiMetrics: { avgConfidence: 0, fallbackRate: 0, totalAnalyses: 0 }
  });
   const [health, setHealth] = useState<any>({
    status: 'LOADING', engine: 'UNKNOWN', database: 'UNKNOWN',
    ai_service: { status: 'UNKNOWN', circuitBreaker: 'UNKNOWN', failureCount: 0 },
  });
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      try {
        const [mRes, hRes, tRes, aRes] = await Promise.all([
          api.get('/metrics').catch(() => ({ data: null })),
          axios.get(`${API_URL.replace('/api', '/health')}`).catch(() => ({ data: null })),
          api.get('/metrics/timeline').catch(() => ({ data: null })),
          api.get('/analytics').catch(() => ({ data: null })),
        ]);
        if (mRes.data) setMetrics(mRes.data);
        if (hRes.data) setHealth(hRes.data);
        if (tRes.data) setTimeline(tRes.data);
        if (aRes.data) setAnalytics(aRes.data);
      } catch (err) {
        // Silent catch for unexpected global failures
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 8000);
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

   if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white uppercase underline decoration-purple-600/30 underline-offset-8">
          Engine Command
        </h1>
        <p className="text-base sm:text-lg text-zinc-500 font-medium">
          Strategic overview of system intelligence & cognitive performance.
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
          label="AI Engine"
          value={aiHealthy ? 'Operational' : 'Paused'}
          icon={Brain}
          color={aiHealthy ? 'purple' : 'amber'}
        />
      </motion.div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Total Packets" value={metrics.total} icon={ActivityIcon} color="zinc" delay={0} />
        <MetricCard label="Immediate (NOW)" value={metrics.now} icon={ArrowUpRight} color="emerald" delay={0.05} />
        <MetricCard label="Deferred (LATER)" value={metrics.later} icon={Clock} color="amber" delay={0.1} />
        <MetricCard label="Dropped (NEVER)" value={metrics.never} icon={Ban} color="rose" delay={0.15} />
        <MetricCard label="Final Dispatch" value={metrics.sent} icon={Send} color="purple" delay={0.2} />
      </div>

      {/* Main Intelligence Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Trend Analysis */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 glass-card p-6 sm:p-8 hover:border-purple-500/30 hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.2)] transition-all duration-500"
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              Cognitive Trends (24h)
            </h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Real-time Timeline</span>
          </div>
          <div className="h-64 w-full">
            {mounted && timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="colorNow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    stroke="#3f3f46"
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }}
                    tickFormatter={(v: string) => v.split('T')[1]?.slice(0, 5) || v}
                  />
                  <YAxis stroke="#3f3f46" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="now" name="NOW" stroke="#10b981" strokeWidth={3} fill="url(#colorNow)" />
                  <Area type="monotone" dataKey="later" name="LATER" stroke="#f59e0b" strokeWidth={2} fill="transparent" />
                  <Area type="monotone" dataKey="never" name="NEVER" stroke="#f43f5e" strokeWidth={2} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-700 font-medium">Synthesizing timeline data...</div>
            )}
          </div>
        </motion.div>

        {/* Priority Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6 sm:p-8 flex flex-col items-center justify-center hover:border-purple-500/30 hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.2)] transition-all duration-500"
        >
          <div className="flex flex-col items-center text-center gap-2 mb-4">
             <Target className="h-8 w-8 text-zinc-700" />
             <h3 className="text-sm font-black text-white uppercase tracking-widest">Logic Distribution</h3>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none">
                  {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4 w-full mt-6">
             {chartData.map(d => (
               <div key={d.name} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{d.name}</span>
                  <span className="text-sm font-black text-white">{d.value}</span>
               </div>
             ))}
          </div>
        </motion.div>

      </div>

      {/* Intelligence Insights Row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Rule Efficiency */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4, scale: 1.02 }} transition={{ delay: 0.4 }}
          className="glass-card p-6 hover:border-purple-500/30 hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.2)] transition-all duration-500"
        >
          <div className="flex items-center justify-between mb-6">
             <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Rule Efficiency
             </h4>
             <a href="/rules" className="text-[9px] font-black text-purple-400 hover:text-white transition-colors">OPTIMIZE</a>
          </div>
          <div className="space-y-4">
             {analytics.ruleEfficiency.length === 0 ? (
               <p className="text-zinc-700 text-xs py-4 text-center">No rule hits recorded.</p>
             ) : (
               analytics.ruleEfficiency.slice(0, 4).map((r: any) => (
                <div key={r.rule_id} className="space-y-1.5">
                   <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-zinc-400 truncate pr-4">{r.rule_name}</span>
                      <span className="text-white">{r.hits} Hits</span>
                   </div>
                   <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500" style={{ width: `${Math.min(100, (r.hits / metrics.total) * 500)}%` }} />
                   </div>
                </div>
               ))
             )}
          </div>
        </motion.div>

        {/* Noise Attribution */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4, scale: 1.02 }} transition={{ delay: 0.45 }}
          className="glass-card p-6 hover:border-purple-500/30 hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.2)] transition-all duration-500"
        >
          <div className="flex items-center justify-between mb-6">
             <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <TrendingDown className="h-3.5 w-3.5" /> Noise Sources
             </h4>
          </div>
          <div className="space-y-4">
             {analytics.noiseSources.length === 0 ? (
               <p className="text-zinc-700 text-xs py-4 text-center">Noise levels nominal.</p>
             ) : (
               analytics.noiseSources.slice(0, 4).map((n: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                   <div className="flex items-center gap-3">
                      <div className={`h-1.5 w-1.5 rounded-full ${n.decision === 'NEVER' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      <span className="text-xs font-bold text-zinc-300">{n.source}</span>
                   </div>
                   <span className="text-[10px] font-black text-zinc-600 uppercase">{n.count} Deflections</span>
                </div>
               ))
             )}
          </div>
        </motion.div>

        {/* AI Performance */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4, scale: 1.02 }} transition={{ delay: 0.5 }}
          className="glass-card p-6 border-l-2 border-l-purple-600 hover:border-purple-500/50 hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.2)] transition-all duration-500"
        >
          <div className="flex items-center justify-between mb-6">
             <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Microscope className="h-3.5 w-3.5" /> Cognitive Performance
             </h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-600 block uppercase">Confidence</span>
                <span className="text-2xl font-black text-white tabular-nums">{Math.round((analytics.aiMetrics?.avgConfidence || 0) * 100)}%</span>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-600 block uppercase">Fallbacks</span>
                <span className="text-2xl font-black text-rose-500 tabular-nums">{Math.round((analytics.aiMetrics?.fallbackRate || 0) * 100)}%</span>
             </div>
          </div>
          <p className="mt-8 text-[9px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2">
             <Brain className="h-3 w-3" /> Based on last {analytics.aiMetrics?.totalAnalyses} packets
          </p>
        </motion.div>

      </div>

      {/* Recent Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4, scale: 1.01 }} transition={{ delay: 0.55 }}
        className="glass-card p-6 sm:p-8 hover:border-purple-500/30 hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.2)] transition-all duration-500"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-black text-white uppercase tracking-tighter">Live Decision Stream</h3>
          <a href="/audit" className="text-[10px] font-black uppercase tracking-widest text-purple-400 hover:text-white transition-colors flex items-center gap-1">
            Historical Archive <ChevronRight className="h-3 w-3" />
          </a>
        </div>

        <div className="space-y-2">
          {metrics.recent.slice(0, 3).map((entry: any) => (
            <div key={entry.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/5 transition-all border border-transparent hover:border-white/5 group">
              <div className="shrink-0">
                <div className={`h-2.5 w-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${DecisionDotColor(entry.decision)}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-black uppercase truncate group-hover:text-purple-400 transition-colors">
                  {entry.notification_events?.title || 'Packet Overload'}
                </p>
                <p className="text-[11px] text-zinc-600 font-medium truncate mt-0.5">&ldquo;{entry.reason}&rdquo;</p>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className={`text-[10px] font-black uppercase tracking-widest ${decisionTextColor(entry.decision)}`}>
                  {entry.decision}
                </span>
                <span className="text-[10px] text-zinc-700 font-bold uppercase">
                  {formatDistanceToNow(new Date(entry.processed_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function DecisionDotColor(d: string) {
  switch (d) {
    case 'NOW': return 'bg-emerald-500 shadow-emerald-500/20';
    case 'LATER': return 'bg-amber-500 shadow-amber-500/20';
    case 'NEVER': return 'bg-rose-500 shadow-rose-500/20';
    default: return 'bg-zinc-600';
  }
}

function decisionTextColor(d: string) {
  switch (d) {
    case 'NOW': return 'text-emerald-400';
    case 'LATER': return 'text-amber-400';
    case 'NEVER': return 'text-rose-400';
    default: return 'text-zinc-400';
  }
}

function MetricCard({ label, value, icon: Icon, color, delay }: any) {
  const colors: any = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-amber-500/5',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-rose-500/5',
    zinc: 'text-zinc-500 bg-zinc-500/10 border-white/5',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-purple-500/5',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ delay }}
      className="glass-card p-5 sm:p-7 flex flex-col gap-4 group hover:border-purple-500/30 hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.2)] transition-all duration-500"
    >
      <div className={`flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-[18px] border ${colors[color]} group-hover:rotate-6 transition-transform`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div>
        <span className="text-[10px] sm:text-xs font-black text-zinc-600 uppercase tracking-[0.2em]">{label}</span>
        <div className="text-2xl sm:text-3xl font-black text-white mt-1 tabular-nums">{value.toLocaleString()}</div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-purple-500/10',
  };

  return (
    <div className={`flex items-center gap-2.5 rounded-2xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 ${colors[color]}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="opacity-40">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function Loader() {
  return (
    <div className="loading">
      {/* Three concentric spinning rings */}
      <div className="loading__rings">
        <div className="loading__ring" />
        <div className="loading__ring" />
        <div className="loading__ring" />
      </div>
      {/* Pulsing accent dots */}
      <div className="loading__dots">
        <div className="loading__dot" />
        <div className="loading__dot" />
        <div className="loading__dot" />
      </div>
      {/* Animated status text */}
      <span className="loading__text">Connecting to systems…</span>
    </div>
  );
}
