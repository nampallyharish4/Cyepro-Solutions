import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import axios from 'axios';
import axiosRetry from 'axios-retry';

dotenv.config();

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '',
);

// Dedicated axios instance for AI calls — avoids polluting global axios with retry logic
const aiAxios = axios.create();
axiosRetry(aiAxios, {
  retries: 2,
  retryDelay: (retryCount) => retryCount * 500, // 500ms, 1000ms exponential backoff
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
    error.code === 'ECONNABORTED' ||
    error.response?.status === 429 ||
    error.response?.status === 503,
});

const VALID_PRIORITIES = ['NOW', 'LATER', 'NEVER'] as const;
type Priority = (typeof VALID_PRIORITIES)[number];

// Keywords/patterns for heuristic classification when AI is unavailable
const NOW_PATTERNS = [
  /\b(outage|down|crash|fatal|breach|unauthorized|fraud|otp|2fa|mfa|payment.?fail|security.?alert|intrusion|ddos|ransomware|exploit|vulnerability|incident)\b/i,
  /\b(cpu|memory|disk|load).{0,10}(9[0-9]|100)\s*%/i,
  /\b(connection.?pool.?exhaust|out.?of.?memory|service.?(down|unavailable|degraded)|database.?(fail|error|down)|server.?(overload|unresponsive|crash))\b/i,
  /\b(deploy.?(fail|error)|critical.?(error|alert|failure)|system.?(fail|crash|error))\b/i,
];
const NEVER_PATTERNS = [
  /\b(spam|unsubscribe|promo(tion(al)?)?|newsletter|marketing|sale|discount|coupon|deal|offer|flash.?sale|limited.?time|act.?now|click.?here)\b/i,
  /\b(badge|achievement|gamification|streak|leaderboard|like[ds]?|follow|react|upvote|retweet)\b/i,
];

export class AIService {
  private static readonly MODEL_NAME =
    process.env.MODEL_NAME || 'gemini-flash-latest';
  private static circuitBreakerFailureCount = 0;
  private static readonly FAILURE_THRESHOLD = 5;
  private static lastFailureTime: number | null = null;
  private static CIRCUIT_OPEN_TIMEOUT = 1000 * 60 * 5;
  private static traceColumnAvailable: boolean | null = null;

  /**
   * Normalize and validate the AI priority response
   */
  private static normalizePriority(raw: any): Priority {
    const upper = String(raw || '')
      .toUpperCase()
      .trim();
    if (VALID_PRIORITIES.includes(upper as Priority)) return upper as Priority;
    return 'LATER'; // Safe default for unrecognized values
  }

  /**
   * Safely parse JSON from AI response, return null on failure
   */
  private static safeParseJSON(text: string): any | null {
    try {
      return JSON.parse(text);
    } catch {
      // Try to extract JSON from markdown code blocks if AI wraps it
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          /* fall through */
        }
      }
      return null;
    }
  }

  /**
   * Extract human-readable error from Groq/API error responses
   */
  private static extractErrorDetail(error: any): string {
    // Groq API error format: error.response.data.error.message
    const groqMsg = error?.response?.data?.error?.message;
    if (groqMsg) return groqMsg;

    // Generic axios error
    const status = error?.response?.status;
    if (status === 401) return 'Authorization Error (Invalid API Key)';
    if (status === 403) return 'Forbidden (API Key lacks permissions)';
    if (status === 404) return 'Model Not Found';
    if (status === 429) return 'Rate Limited (Quota Exceeded)';
    if (status === 503) return 'Service Unavailable';
    if (error?.code === 'ECONNABORTED') return 'Request Timed Out';

    return error?.message || 'AI Analysis unreachable';
  }

  /**
   * Primary classification — Groq (fast) → Gemini (fallback provider) → Safe fallback
   */
  static async classify(
    event: any,
    modelOverride?: string,
  ): Promise<{
    priority: Priority;
    reason: string;
    confidence: number;
    isFallback: boolean;
    modelName: string;
  }> {
    if (this.isCircuitOpen()) {
      return this.fallBack(
        'Circuit Breaker Active — AI paused for cooldown',
        0.5,
        event,
      );
    }

    const groqKey = process.env.GROQ_API_KEY;
    const modelName =
      modelOverride ||
      process.env.GROQ_MODEL ||
      process.env.MODEL_NAME ||
      (groqKey ? 'llama-3.1-8b-instant' : this.MODEL_NAME);

    const systemPrompt = `You are a Notification Prioritization Engine. Classify each notification into exactly one category.

Rules:
- NOW: Critical security alerts, OTP/2FA codes, fraud detection, system outages, payment failures, unauthorized access, infrastructure alerts at critical thresholds (CPU > 80%, memory > 90%, disk > 90%, service degraded/down, connection pool exhausted, high error rates), database failures, server overload, deployment failures. Anything requiring immediate human action to prevent or mitigate downtime.
- LATER: Low-priority informational updates, daily digests, non-critical status changes, reminders, calendar events, meeting notifications, minor warnings that don't risk downtime. Can wait minutes or hours.
- NEVER: Spam, promotional offers, gamification badges, social media likes, newsletters, marketing emails. No matter how "urgent" the language sounds in promotional/marketing contexts.

Priority Signal Guidelines:
- If "Hint" is "urgent" or "critical", strongly favor NOW unless the content is clearly spam/promotional.
- If "Type" is "ALERT" and "Source" is a monitoring/infrastructure system, treat as high-severity by default.
- Distinguish genuine infrastructure/system alerts from marketing that uses alarm words. Marketing spam is NEVER; real system alerts are NOW.

Return ONLY valid JSON: {"priority":"NOW"|"LATER"|"NEVER", "reason":"concise explanation", "confidence":0.0-1.0}`;

    const userContent = `Title: ${event.title || ''}\nMessage: ${event.message || ''}\nType: ${event.event_type || ''}\nSource: ${event.source || ''}${event.priority_hint ? '\nHint: ' + event.priority_hint : ''}`;

    try {
      if (groqKey) {
        try {
          const response = await aiAxios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
              model: modelName,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.1,
              max_tokens: 200,
            },
            {
              headers: {
                Authorization: `Bearer ${groqKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 3000,
            },
          );

          const choice = response.data?.choices?.[0]?.message?.content;
          if (!choice) {
            throw new Error(
              'Groq returned empty response — no choices in payload',
            );
          }

          const parsed = this.safeParseJSON(
            typeof choice === 'string' ? choice : JSON.stringify(choice),
          );
          if (!parsed) {
            console.error('Groq JSON parse failed. Raw:', choice);
            throw new Error('Groq returned malformed JSON');
          }

          this.resetCircuit();
          return {
            priority: this.normalizePriority(parsed.priority),
            reason: String(parsed.reason || 'Groq analysis complete').slice(
              0,
              500,
            ),
            confidence: Math.min(
              1,
              Math.max(0, Number(parsed.confidence) || 0.85),
            ),
            isFallback: false,
            modelName: modelName,
          };
        } catch (groqError: any) {
          console.error(
            'Groq failed, falling back to Gemini:',
            this.extractErrorDetail(groqError),
          );
          // Fall through to Gemini execution
        }
      }

      // Fallback to Gemini if Groq key isn't configured
      const model = genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 200,
          temperature: 0.1,
          topP: 0.1,
        },
      });

      const prompt = `${systemPrompt}\n\nInput:\n${userContent}`;

      // Timeout for Gemini API call
      const geminiTimeoutMs = 8000;
      let result: any;
      try {
        result = await Promise.race([
          model.generateContent(prompt),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Gemini API Timeout')),
              geminiTimeoutMs,
            ),
          ),
        ]);
      } catch (timeoutError) {
        console.error('Gemini API timed out:', timeoutError);
        this.recordFailure();
        return this.fallBack('Gemini API Timeout', 0.0);
      }

      const response = await result.response;
      const text = response.text();
      const parsed = this.safeParseJSON(text);

      if (!parsed) {
        console.error('Gemini JSON parse failed. Raw:', text);
        throw new Error('Gemini returned malformed JSON');
      }

      this.resetCircuit();

      return {
        priority: this.normalizePriority(parsed.priority),
        reason: String(parsed.reason || 'Gemini analysis complete').slice(
          0,
          500,
        ),
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.8)),
        isFallback: false,
        modelName: this.MODEL_NAME,
      };
    } catch (error: any) {
      const detail = this.extractErrorDetail(error);
      console.error(
        `AI Service Error [${modelName}]:`,
        detail,
        error?.response?.status || '',
      );
      this.recordFailure();
      return this.fallBack(detail, 0.0, event);
    }
  }

  public static getStatus() {
    return {
      circuitBreaker: this.isCircuitOpen() ? 'OPEN' : 'CLOSED',
      failureCount: this.circuitBreakerFailureCount,
      lastFailure: this.lastFailureTime,
    };
  }

  private static isCircuitOpen(): boolean {
    if (this.circuitBreakerFailureCount >= this.FAILURE_THRESHOLD) {
      const now = Date.now();
      if (
        this.lastFailureTime &&
        now - this.lastFailureTime < this.CIRCUIT_OPEN_TIMEOUT
      ) {
        return true;
      }
      this.resetCircuit();
    }
    return false;
  }

  private static recordFailure() {
    this.circuitBreakerFailureCount++;
    this.lastFailureTime = Date.now();
  }

  private static resetCircuit() {
    this.circuitBreakerFailureCount = 0;
    this.lastFailureTime = null;
  }

  /**
   * Keyword-based heuristic classifier — used when AI providers are unavailable
   */
  static heuristicClassify(event: any): {
    priority: Priority;
    reason: string;
    confidence: number;
    isFallback: boolean;
    modelName: string;
  } {
    const text =
      `${event.title || ''} ${event.message || ''} ${event.event_type || ''} ${event.source || ''}`.toLowerCase();
    const hint = (event.priority_hint || '').toLowerCase();

    // Check NEVER first (spam/marketing)
    for (const pattern of NEVER_PATTERNS) {
      if (pattern.test(text) && !hint.match(/urgent|critical/)) {
        return {
          priority: 'NEVER',
          reason: 'Heuristic: Matches spam/promotional pattern',
          confidence: 0.7,
          isFallback: true,
          modelName: 'heuristic-engine',
        };
      }
    }

    // Check NOW patterns (critical alerts)
    for (const pattern of NOW_PATTERNS) {
      if (pattern.test(text)) {
        return {
          priority: 'NOW',
          reason: 'Heuristic: Matches critical alert pattern',
          confidence: 0.75,
          isFallback: true,
          modelName: 'heuristic-engine',
        };
      }
    }

    // Priority hint signals
    if (hint === 'urgent' || hint === 'critical') {
      return {
        priority: 'NOW',
        reason: 'Heuristic: Priority hint indicates urgency',
        confidence: 0.7,
        isFallback: true,
        modelName: 'heuristic-engine',
      };
    }

    // Source-based signals
    if (
      [
        'monitoring',
        'security',
        'infrastructure',
        'alertmanager',
        'pagerduty',
        'datadog',
        'cloudwatch',
      ].includes(event.source?.toLowerCase()) &&
      event.event_type?.toUpperCase() === 'ALERT'
    ) {
      return {
        priority: 'NOW',
        reason: 'Heuristic: Alert from monitoring source',
        confidence: 0.65,
        isFallback: true,
        modelName: 'heuristic-engine',
      };
    }

    return {
      priority: 'LATER',
      reason: 'Heuristic: No critical pattern matched, defaulting to LATER',
      confidence: 0.5,
      isFallback: true,
      modelName: 'heuristic-engine',
    };
  }

  private static fallBack(
    errorReason: string,
    confidence: number,
    event?: any,
  ) {
    if (event) {
      const heuristic = this.heuristicClassify(event);
      heuristic.reason = `${heuristic.reason} (AI unavailable: ${errorReason})`;
      return heuristic;
    }
    return {
      priority: 'LATER' as const,
      reason: `Safe Fallback: ${errorReason}`,
      confidence: confidence,
      isFallback: true,
      modelName: 'fallback-engine',
    };
  }
}
