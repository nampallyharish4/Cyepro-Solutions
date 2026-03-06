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
      // 1. Total processed in last 24h
      const { count: total } = await supabase
        .from('notification_events')
        .select('id', { count: 'exact', head: true });

      // 2. Breakdown by decision
      const { data: decisions } = await supabase
        .from('audit_logs')
        .select('decision');

      const stats = {
        total: total || 0,
        now: decisions?.filter((d) => d.decision === 'NOW').length || 0,
        later: decisions?.filter((d) => d.decision === 'LATER').length || 0,
        never: decisions?.filter((d) => d.decision === 'NEVER').length || 0,
      };

      return res.json(stats);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }

  /**
   * Get Audit Logs
   */
  static async getAuditLogs(req: Request, res: Response) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, notification_events(*)')
        .order('processed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Audit fetch failed' });
    }
  }

  /**
   * Manage Rules
   */
  static async getRules(req: Request, res: Response) {
    const { data } = await supabase
      .from('rules')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: false });
    return res.json(data);
  }

  static async createRule(req: Request, res: Response) {
    const { data, error } = await supabase
      .from('rules')
      .insert([req.body])
      .select()
      .single();
    if (error) return res.status(500).json(error);
    return res.status(201).json(data);
  }

  static async deleteRule(req: Request, res: Response) {
    // Soft delete requirement: "Deleted data must be recoverable — hard deletes are not acceptable."
    const { id } = req.params;
    const { data, error } = await supabase
      .from('rules')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json(error);
    return res.json(data);
  }
}

