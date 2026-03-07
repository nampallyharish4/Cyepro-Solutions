import { supabase } from '../utils/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { AIService } from './AIService';

export interface NotificationEvent {
  user_id: string;
  event_type: string;
  title: string;
  message?: string;
  source: string;
  priority_hint?: string;
  channel?: string;
  metadata?: any;
  dedupe_key?: string;
  expires_at?: string;
}

export class DecisionEngine {
  /**
   * Main entry point for a new event
   * 1. Synchronous validation + Deduplication
   * 2. Rule evaluation
   * 3. AI classification (asynchronous)
   * 4. Audit logging
   */
  static async processEvent(event: NotificationEvent) {
    // 1. Initial storage
    const { data: savedEvent, error: saveError } = await supabase
      .from('notification_events')
      .insert([
        {
          ...event,
          status: 'PENDING',
        },
      ])
      .select()
      .single();

    if (saveError || !savedEvent) {
      throw new Error(`Failed to save event: ${saveError?.message}`);
    }

    // Return here to the client, but continue processing asynchronously
    this.executeEnginePipeline(savedEvent.id, event.user_id);

    return savedEvent;
  }

  static async executeEnginePipeline(eventId: string, userId?: string) {
    try {
      // Fetch full event
      const { data: event } = await supabase
        .from('notification_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (!event) return;

      // 0. Expiry Check — drop events that have already expired
      if (event.expires_at && new Date(event.expires_at) < new Date()) {
        await this.finalizeDecision(
          eventId,
          'NEVER',
          'Event expired before processing (expires_at in the past)',
        );
        return;
      }

      // 1. Deduplication (Exact)
      if (event.dedupe_key) {
        const { data: existing } = await supabase
          .from('notification_events')
          .select('id')
          .eq('dedupe_key', event.dedupe_key)
          .neq('id', eventId)
          .limit(1);

        if (existing && existing.length > 0) {
          await this.finalizeDecision(
            eventId,
            'NEVER',
            'Duplicate event (Matched dedupe_key)',
          );
          return;
        }
      }

      // 2. Near-duplicate detection (PostgreSQL pg_trgm similarity)
      const { data: nearDups } = await supabase.rpc('find_near_duplicates', {
        p_user_id: event.user_id,
        p_title: event.title,
        p_threshold: 0.8,
      });

      // Filter out the current event itself if the RPC happens to return it
      const actualNearDups =
        nearDups?.filter((n: any) => n.id !== eventId) || [];

      if (actualNearDups.length > 0) {
        await this.finalizeDecision(
          eventId,
          'NEVER',
          `Near-duplicate detected (Similarity: ${actualNearDups[0].similarity})`,
        );
        return;
      }

      // 3. Rule Evaluation — deterministic rules always checked before AI
      const { data: rules } = await supabase
        .from('rules')
        .select('*')
        .eq('is_active', true)
        .neq('condition_type', 'system_setting')
        .order('priority_order', { ascending: false });

      if (rules) {
        for (const rule of rules) {
          if (this.evaluateRule(event, rule)) {
            await this.finalizeDecision(
              eventId,
              rule.target_priority,
              `Rule matched: ${rule.name}`,
              rule.id,
            );
            return;
          }
        }
      }

      // 4. Fatigue Check (per-user Alert Fatigue)
      if (await this.isFatigued(event.user_id)) {
        await this.finalizeDecision(
          eventId,
          'LATER',
          'Alert Fatigue: User reached notification limit in current window.',
        );
        return;
      }

      // 5. AI / LLM Logic (Async) — with priority_hint context
      await this.runAIClassification(event);
    } catch (error) {
      console.error('Pipeline Error:', error);
      // Fallback — never lose the event
      await this.finalizeDecision(
        eventId,
        'LATER',
        'Internal Error: Processing failed, defaulted to LATER',
      );
    }
  }

  private static evaluateRule(event: any, rule: any): boolean {
    switch (rule.condition_type) {
      case 'source':
        return event.source === rule.condition_value;
      case 'type':
        return event.event_type === rule.condition_value;
      case 'title_contains':
        return event.title
          .toLowerCase()
          .includes(rule.condition_value.toLowerCase());
      case 'metadata_match': {
        // Supports dot-notation key matching in event metadata JSON
        // condition_value format: "key=value" e.g. "severity=critical"
        const parts = rule.condition_value.split('=');
        if (parts.length !== 2) return false;
        const [key, val] = parts;
        const meta = event.metadata || {};
        return String(meta[key]).toLowerCase() === val.toLowerCase();
      }
      default:
        return false;
    }
  }

  private static async isFatigued(userId: string): Promise<boolean> {
    const WINDOW_MINUTES = 60;
    let MAX_NOTIFICATIONS = 5;

    // Fetch dynamic fatigue limit from DB rules
    const { data: fatigueRule } = await supabase
      .from('rules')
      .select('condition_value')
      .eq('name', 'FATIGUE_LIMIT')
      .eq('is_active', true)
      .single();

    if (fatigueRule && fatigueRule.condition_value) {
      MAX_NOTIFICATIONS = parseInt(fatigueRule.condition_value) || 5;
    }

    const startTime = new Date(
      Date.now() - 1000 * 60 * WINDOW_MINUTES,
    ).toISOString();

    // Per-user fatigue — count NOW decisions for THIS specific user
    const { data: userEvents } = await supabase
      .from('audit_logs')
      .select('id, notification_events!inner(user_id)')
      .eq('decision', 'NOW')
      .eq('notification_events.user_id', userId)
      .gte('processed_at', startTime);

    const count = userEvents?.length || 0;
    return count >= MAX_NOTIFICATIONS;
  }

  private static async runAIClassification(event: any) {
    try {
      const classification = await AIService.classify(event);
      await this.finalizeDecision(
        event.id,
        classification.priority,
        classification.reason,
        null,
        true,
        classification.modelName,
        classification.confidence,
        classification.isFallback,
      );
    } catch (e) {
      await this.finalizeDecision(
        event.id,
        'LATER',
        'AI Unresponsive: Fallback to LATER',
        null,
        true,
        'fallback-engine',
        0,
        true,
      );
    }
  }

  private static async finalizeDecision(
    eventId: string,
    decision: string,
    reason: string,
    ruleId: string | null = null,
    aiUsed: boolean = false,
    aiModel: string | null = null,
    aiConfidence: number | null = null,
    isFallback: boolean = false,
  ) {
    // 1. Log to Audit Log (append-only)
    await supabase.from('audit_logs').insert([
      {
        event_id: eventId,
        decision,
        reason,
        rule_id: ruleId,
        ai_used: aiUsed,
        ai_model: aiModel,
        ai_confidence: aiConfidence,
        is_fallback: isFallback,
      },
    ]);

    // 2. Update Event Status
    await supabase
      .from('notification_events')
      .update({ status: 'PROCESSED' })
      .eq('id', eventId);

    // 3. Handle LATER queue
    if (decision === 'LATER') {
      await supabase.from('deferred_queue').insert([
        {
          event_id: eventId,
          process_after: new Date(Date.now() + 1000 * 60 * 30).toISOString(), // 30 min later
          status: 'WAITING',
        },
      ]);
    }

    console.log(`Decision for ${eventId}: ${decision} - ${reason}`);
  }
}
