import { supabase } from '../utils/supabaseClient';
import { DecisionEngine } from './DecisionEngine';

export class SchedulerService {
  private static isRunning = false;
  private static readonly MAX_RETRIES = 3;

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

      // 1. Get WAITING items that are ready to be processed
      const { data: queueItems, error } = await supabase
        .from('deferred_queue')
        .select('*, notification_events(*)')
        .eq('status', 'WAITING')
        .lte('process_after', now)
        .limit(10); // Process in batches

      if (error) throw error;

      // 2. Also retry FAILED items that haven't exceeded max retries
      const { data: failedItems } = await supabase
        .from('deferred_queue')
        .select('*, notification_events(*)')
        .eq('status', 'FAILED')
        .lt('retry_count', this.MAX_RETRIES)
        .limit(5);

      const allItems = [...(queueItems || []), ...(failedItems || [])];

      if (allItems.length === 0) {
        this.isRunning = false;
        return;
      }

      console.log(`Processing ${allItems.length} items from LATER queue...`);

      for (const item of allItems) {
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
      // Optimistic concurrency guard — only claim items still in WAITING or FAILED
      const { data: claimed, error: claimError } = await supabase
        .from('deferred_queue')
        .update({ status: 'PROCESSING' })
        .eq('id', item.id)
        .in('status', ['WAITING', 'FAILED'])
        .select()
        .single();

      if (claimError || !claimed) {
        // Another instance already claimed this item
        return;
      }

      // Deliver the notification (in production this would push to a channel)
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
      const newRetryCount = (item.retry_count || 0) + 1;

      if (newRetryCount >= this.MAX_RETRIES) {
        // Permanently failed — mark as DEAD_LETTER for manual review
        await supabase
          .from('deferred_queue')
          .update({ status: 'DEAD_LETTER', retry_count: newRetryCount })
          .eq('id', item.id);

        await supabase.from('audit_logs').insert([
          {
            event_id: item.event_id,
            decision: 'FAILED',
            reason: `Deferred item exhausted ${this.MAX_RETRIES} retries, moved to dead letter.`,
            is_fallback: false,
          },
        ]);
      } else {
        // Mark as FAILED for retry on next scheduler tick
        await supabase
          .from('deferred_queue')
          .update({ status: 'FAILED', retry_count: newRetryCount })
          .eq('id', item.id);
      }
    }
  }
}
