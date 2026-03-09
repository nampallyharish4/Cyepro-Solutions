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
    this.executeEnginePipeline(savedEvent.id);

    return savedEvent;
  }

  static async executeEnginePipeline(eventId: string) {
    const trace: any[] = [];
    const addTrace = (stage: string, status: string, details: string) => {
      trace.push({ stage, status, details, timestamp: new Date().toISOString() });
    };

    try {
      // Fetch full event
      const { data: event } = await supabase
        .from('notification_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (!event) return;

      // 0. Expiry Check
      if (event.expires_at && new Date(event.expires_at) < new Date()) {
        addTrace('EXPIRY_CHECK', 'TRIPPED', 'Expiration date in the past');
        await this.finalizeDecision(
          eventId,
          'NEVER',
          'Event expired before processing (expires_at in the past)',
          null, false, null, null, false, trace
        );
        return;
      }
      addTrace('EXPIRY_CHECK', 'PASSED', 'Event is within validity window');

      // Fetch System Settings
      const { data: settings } = await supabase.from('system_settings').select('key, value');
      const getSetting = (key: string, def: string) => settings?.find(s => s.key === key)?.value || def;
      
      const dedupeThreshold = parseFloat(getSetting('DEDUPE_THRESHOLD', '0.8'));

      // 1. Deduplication (Exact)
      if (event.dedupe_key) {
        const { data: existing } = await supabase
          .from('notification_events')
          .select('id')
          .eq('dedupe_key', event.dedupe_key)
          .neq('id', eventId)
          .limit(1);

        if (existing && existing.length > 0) {
          addTrace('EXACT_DEDUPE', 'TRIPPED', `Matched key: ${event.dedupe_key}`);
          await this.finalizeDecision(
            eventId,
            'NEVER',
            'Duplicate event (Matched dedupe_key)',
            null, false, null, null, false, trace
          );
          return;
        }
      }
      addTrace('EXACT_DEDUPE', 'PASSED', 'No exact key match found');

      // 2. Near-duplicate detection
      const { data: nearDups } = await supabase.rpc('find_near_duplicates', {
        p_user_id: event.user_id,
        p_title: event.title,
        p_threshold: dedupeThreshold,
      });

      const actualNearDups = nearDups?.filter((n: any) => n.id !== eventId) || [];

      if (actualNearDups.length > 0) {
        const sim = actualNearDups[0].similarity;
        addTrace('NEAR_DEDUPE', 'TRIPPED', `Similarity ${sim} above threshold ${dedupeThreshold}`);
        await this.finalizeDecision(
          eventId,
          'NEVER',
          `Near-duplicate detected (Similarity: ${sim})`,
          null, false, null, null, false, trace
        );
        return;
      }
      addTrace('NEAR_DEDUPE', 'PASSED', `No near-duplicates found above threshold ${dedupeThreshold}`);

      // 3. Rule Evaluation
      const { data: rules } = await supabase
        .from('rules')
        .select('*')
        .eq('is_active', true)
        .neq('condition_type', 'system_setting')
        .order('priority_order', { ascending: false });

      let ruleMatched = false;
      if (rules) {
        for (const rule of rules) {
          if (this.evaluateRule(event, rule)) {
            addTrace('RULE_ENGINE', 'MATCHED', `Rule: ${rule.name} (#${rule.id})`);
            await this.finalizeDecision(
              eventId,
              rule.target_priority,
              `Rule matched: ${rule.name}`,
              rule.id,
              false, null, null, false, trace
            );
            ruleMatched = true;
            break;
          }
        }
      }
      
      if (ruleMatched) return;
      addTrace('RULE_ENGINE', 'SKIPPED', 'No active rules matched event criteria');

      // 4. Fatigue Check
      const fatigueThreshold = parseInt(getSetting('FATIGUE_LIMIT', '5'));
      if (await this.isFatigued(event.user_id, fatigueThreshold)) {
        addTrace('FATIGUE_LIMIT', 'TRIPPED', `User exceeded threshold of ${fatigueThreshold} NOW events / 60m`);
        await this.finalizeDecision(
          eventId,
          'LATER',
          'Alert Fatigue: User reached notification limit in current window.',
          null, false, null, null, false, trace
        );
        return;
      }
      addTrace('FATIGUE_LIMIT', 'PASSED', `User within threshold (${fatigueThreshold})`);

      // 5. AI classification
      const activeModel = getSetting('AI_MODEL', process.env.MODEL_NAME || '');
      addTrace('AI_CLASSIFICATION', 'INIT', `Routing to intelligent analysis [Model: ${activeModel || 'Default'}]`);
      await this.runAIClassification(event, trace, activeModel);
    } catch (error: any) {
      console.error('Pipeline Error:', error);
      addTrace('ERROR_HANDLER', 'CRITICAL', error.message || 'Unknown processing error');
      await this.finalizeDecision(
        eventId,
        'LATER',
        'Internal Error: Processing failed, defaulted to LATER',
        null, false, null, null, false, trace
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
        return event.title.toLowerCase().includes(rule.condition_value.toLowerCase());
      case 'metadata_match': {
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

  private static async isFatigued(userId: string, limit: number): Promise<boolean> {
    const WINDOW_MINUTES = 60;
    const startTime = new Date(Date.now() - 1000 * 60 * WINDOW_MINUTES).toISOString();

    const { data: userEvents } = await supabase
      .from('audit_logs')
      .select('id, notification_events!inner(user_id)')
      .eq('decision', 'NOW')
      .eq('notification_events.user_id', userId)
      .gte('processed_at', startTime);

    return (userEvents?.length || 0) >= limit;
  }

  private static async runAIClassification(event: any, trace: any[], modelOverride?: string) {
    try {
      const classification = await AIService.classify(event, modelOverride);
      trace.push({ 
        stage: 'AI_RESPONSE', 
        status: classification.priority, 
        details: `Model: ${classification.modelName}, Confidence: ${classification.confidence}`,
        timestamp: new Date().toISOString()
      });

      await this.finalizeDecision(
        event.id,
        classification.priority,
        classification.reason,
        null,
        true,
        classification.modelName,
        classification.confidence,
        classification.isFallback,
        trace
      );
    } catch (e: any) {
      trace.push({ stage: 'AI_ERROR', status: 'FAILED', details: e.message || 'AI timeout', timestamp: new Date().toISOString() });
      await this.finalizeDecision(
        event.id,
        'LATER',
        'AI Unresponsive: Fallback to LATER',
        null, true, 'fallback-engine', 0, true, trace
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
    trace: any[] = []
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
        trace,
      },
    ]);

    // 2. Update Event Status
    await supabase.from('notification_events').update({ status: 'PROCESSED' }).eq('id', eventId);

    // 3. Handle LATER queue
    if (decision === 'LATER') {
      const { data: settings } = await supabase.from('system_settings').select('value').eq('key', 'LATER_DELAY_MIN').single();
      const delay = parseInt(settings?.value || '30');
      
      await supabase.from('deferred_queue').insert([
        {
          event_id: eventId,
          process_after: new Date(Date.now() + 1000 * 60 * delay).toISOString(),
          status: 'WAITING',
        },
      ]);
    }

    console.log(`Decision for ${eventId}: ${decision} - ${reason}`);
  }
}
