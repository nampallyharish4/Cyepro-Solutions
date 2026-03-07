import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient';
import { DecisionEngine } from '../services/DecisionEngine';

export class NotificationController {
  /**
   * Submit an event
   * Requirement: Return immediately, process async.
   */
  static async submitEvent(req: Request, res: Response) {
    try {
      const eventData = req.body;
      const result = await DecisionEngine.processEvent(eventData);

      return res.status(202).json({
        message: 'Event accepted for processing',
        event_id: result.id,
        status: 'PENDING',
      });
    } catch (error) {
      console.error('Submit Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Get Live Metrics for Dashboard
   */
  static async getMetrics(req: Request, res: Response) {
    try {
      const { count: total } = await supabase
        .from('notification_events')
        .select('id', { count: 'exact', head: true });

      const { count: nowCount } = await supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('decision', 'NOW');

      const { count: laterCount } = await supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('decision', 'LATER');

      const { count: neverCount } = await supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('decision', 'NEVER');

      const { count: sentCount } = await supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('decision', 'SENT');

      const { count: queueWaiting } = await supabase
        .from('deferred_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'WAITING');

      const { count: queueFailed } = await supabase
        .from('deferred_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'FAILED');

      const { count: queueDeadLetter } = await supabase
        .from('deferred_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'DEAD_LETTER');

      // Recent decisions (last 10)
      const { data: recent } = await supabase
        .from('audit_logs')
        .select('id, event_id, decision, reason, ai_model, is_fallback, processed_at, notification_events(title, source, user_id)')
        .order('processed_at', { ascending: false })
        .limit(10);

      return res.json({
        total: total || 0,
        now: nowCount || 0,
        later: laterCount || 0,
        never: neverCount || 0,
        sent: sentCount || 0,
        queue: {
          waiting: queueWaiting || 0,
          failed: queueFailed || 0,
          dead_letter: queueDeadLetter || 0,
        },
        recent: recent || [],
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }

  /**
   * Get Metrics Timeline — hourly breakdown for the last 24 hours
   */
  static async getMetricsTimeline(req: Request, res: Response) {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: logs } = await supabase
        .from('audit_logs')
        .select('decision, processed_at')
        .gte('processed_at', since)
        .order('processed_at', { ascending: true });

      // Bucket into hourly intervals
      const buckets: Record<
        string,
        { hour: string; now: number; later: number; never: number }
      > = {};

      (logs || []).forEach((log: any) => {
        const dt = new Date(log.processed_at);
        const hourKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}T${String(dt.getHours()).padStart(2, '0')}:00`;
        if (!buckets[hourKey]) {
          buckets[hourKey] = { hour: hourKey, now: 0, later: 0, never: 0 };
        }
        const d = log.decision?.toUpperCase();
        if (d === 'NOW') buckets[hourKey].now++;
        else if (d === 'LATER') buckets[hourKey].later++;
        else if (d === 'NEVER') buckets[hourKey].never++;
      });

      return res.json(Object.values(buckets));
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Failed to fetch timeline metrics' });
    }
  }

  /**
   * Get Audit Logs — with pagination, rule join, and total count
   */
  static async getAuditLogs(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 30);
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('audit_logs')
        .select('*, notification_events(*), rules(*)', { count: 'exact' })
        .order('processed_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return res.json({ data, total: count || 0, page, limit });
    } catch (err) {
      return res.status(500).json({ error: 'Audit fetch failed' });
    }
  }

  /**
   * Get Rules
   */
  static async getRules(req: Request, res: Response) {
    const { data } = await supabase
      .from('rules')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: false });
    return res.json(data);
  }

  /**
   * Create a Rule
   */
  static async createRule(req: Request, res: Response) {
    const { data, error } = await supabase
      .from('rules')
      .insert([req.body])
      .select()
      .single();
    if (error) return res.status(500).json(error);
    return res.status(201).json(data);
  }

  /**
   * Update (Edit) a Rule
   */
  static async updateRule(req: Request, res: Response) {
    const { id } = req.params;
    const updates = req.body;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('rules')
      .update(updates)
      .eq('id', id)
      .eq('is_active', true)
      .select()
      .single();

    if (error) return res.status(500).json(error);
    if (!data)
      return res
        .status(404)
        .json({ error: 'Rule not found or already deleted' });
    return res.json(data);
  }

  /**
   * Soft-delete a Rule — "Deleted data must be recoverable — hard deletes are not acceptable."
   */
  static async deleteRule(req: Request, res: Response) {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('rules')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json(error);
    return res.json(data);
  }

  /**
   * Get Deferred Queue — real data from deferred_queue table
   */
  static async getDeferredQueue(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
      const status = req.query.status as string;
      const search = req.query.search as string;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('deferred_queue')
        .select('*, notification_events(*)', { count: 'exact' });

      if (status && status !== 'ALL') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(
          `notification_events.title.ilike.%${search}%,notification_events.source.ilike.%${search}%,notification_events.event_type.ilike.%${search}%,notification_events.user_id.ilike.%${search}%`
        );
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return res.json({ data, total: count ?? 0, page, limit });
    } catch (err) {
      return res.status(500).json({ error: 'Deferred queue fetch failed' });
    }
  }

  /**
   * Force-send a deferred queue item
   */
  static async forceSendDeferred(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Optimistic concurrency — only update if still WAITING or FAILED
      const { data, error } = await supabase
        .from('deferred_queue')
        .update({ status: 'SENT' })
        .eq('id', id)
        .in('status', ['WAITING', 'FAILED'])
        .select()
        .single();

      if (error || !data) {
        return res
          .status(409)
          .json({ error: 'Item already processed or not found' });
      }

      // Log the forced send in audit
      await supabase.from('audit_logs').insert([
        {
          event_id: data.event_id,
          decision: 'SENT',
          reason: 'Manually force-sent by admin from deferred queue.',
          is_fallback: false,
        },
      ]);

      return res.json({ message: 'Item force-sent successfully', data });
    } catch (err) {
      return res.status(500).json({ error: 'Force send failed' });
    }
  }
}
