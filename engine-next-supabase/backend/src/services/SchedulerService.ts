import { supabase } from '../utils/supabaseClient';
import { DecisionEngine } from './DecisionEngine';

export class SchedulerService {
  private static isRunning = false;

  /**
   * Start the background job for processing LATER queue
   */
  static start() {
    console.log(
      'Scheduler Service Started: Checking LATER queue every 1 minute.',
    );
    setInterval(() => this.processLaterQueue(), 1000 * 60); // Every 1 minute
  }

  private static async processLaterQueue() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = new Date().toISOString();

      // 1. Get items that are ready to be processed
      const { data: queueItems, error } = await supabase
        .from('deferred_queue')
        .select('*, notification_events(*)')
        .eq('status', 'WAITING')
        .lte('process_after', now)
        .limit(10); // Process in batches

      if (error) throw error;
      if (!queueItems || queueItems.length === 0) {
        this.isRunning = false;
        return;
      }

      console.log(`Processing ${queueItems.length} items from LATER queue...`);

      for (const item of queueItems) {
        await this.handleQueueItem(item);
      }
    } catch (err) {
      console.error('Scheduler Error:', err);
    } finally {
      this.isRunning = false;
    }
  }

  private static async handleQueueItem(item: any) {
    try {
      // Logic for re-processing or final delivery
      // For the demo: Move it to SENT
      await supabase
        .from('deferred_queue')
        .update({ status: 'SENT' })
        .eq('id', item.id);

      // Log the action in audit log
      await supabase.from('audit_logs').insert([
        {
          event_id: item.event_id,
          decision: 'SENT',
          reason: 'Deferred notification sent after LATER period.',
          is_fallback: false,
        },
      ]);
    } catch (e) {
      console.error(`Failed to process queue item ${item.id}:`, e);
      // Increment retry or mark as FAILED
      await supabase
        .from('deferred_queue')
        .update({ status: 'FAILED', retry_count: (item.retry_count || 0) + 1 })
        .eq('id', item.id);
    }
  }
}
