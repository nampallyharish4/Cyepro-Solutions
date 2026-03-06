'use client';

import { useState, useEffect } from 'react';
import { History, Clock, Send, Zap, Activity, Timer } from 'lucide-react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

export default function LaterQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const fetchItems = async () => {
    try {
      // We'll need a special endpoint for this or just filter the audit/events
      // For now, let's assume a generic fetch
      const { data } = await axios.get(`${API_URL}/audit`);
      // Filter for items that are being 'LATER' and potentially check status from deferred_queue
      setItems(data.filter((d: any) => d.decision === 'LATER'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchItems();
  }, []);

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          Deferred Pipeline
        </h1>
        <p className="text-lg text-zinc-400">
          View and monitor notifications scheduled for later delivery.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Stats Column */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card p-6 flex flex-col items-center justify-center text-center gap-4">
            <div className="h-16 w-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Timer className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-1">
                Queue Status
              </p>
              <h3 className="text-3xl font-bold text-white uppercase">
                {items.length} Pending
              </h3>
            </div>
          </div>

          <div className="glass-card p-8 neon-border-purple space-y-4">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-400" />
              Scheduling Strategy
            </h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Events categorized as <strong>LATER</strong> are held for 30
              minutes to batch informational updates and reduce per-hour alert
              count.
            </p>
          </div>
        </div>

        {/* Queue List Column */}
        <div className="md:col-span-2 space-y-4">
          {!mounted || loading ? (
            <div className="py-20 text-center text-zinc-600">
              {loading ? 'Syncing queue...' : 'Warming pipeline metadata...'}
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-zinc-600">
              No notifications in the deferred queue.
            </div>
          ) : (
            items.map((item: any) => (
              <div
                key={item.id}
                className="glass-card p-6 flex items-center gap-6 border-l-4 border-amber-500/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                      Scheduled: 24m remaining
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-lg">
                    {item.notification_events?.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                      User: {item.notification_events?.user_id}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-zinc-800" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                      Source: {item.notification_events?.source}
                    </span>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
                  <div className="px-3 py-1 bg-white/5 rounded-lg text-xs text-zinc-500 border border-white/5">
                    Enqueued{' '}
                    {formatDistanceToNow(new Date(item.processed_at), {
                      addSuffix: true,
                    })}
                  </div>
                  <button className="text-[10px] font-bold uppercase tracking-widest text-purple-400 hover:text-white transition-colors flex items-center gap-1">
                    Force Send <Send className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
