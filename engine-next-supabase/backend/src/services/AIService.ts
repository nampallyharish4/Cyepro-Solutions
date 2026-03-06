import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import axios from 'axios';
import axiosRetry from 'axios-retry';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "");

axiosRetry(axios, {
  retries: 2, // Allow 2 retries before tripping the circuit breaker
  retryDelay: (retryCount) => {
    // Increasing delay: 500ms, then 1000ms
    return retryCount * 500;
  },
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED' || error.response?.status === 429
});

export class AIService {
  private static readonly MODEL_NAME = process.env.MODEL_NAME || 'gemini-flash-latest';
  private static circuitBreakerFailureCount = 0;
  private static readonly FAILURE_THRESHOLD = 5;
  private static lastFailureTime: number | null = null;
  private static CIRCUIT_OPEN_TIMEOUT = 1000 * 60 * 5;

  /**
   * Main Gemini classification call
   */
  static async classify(event: any): Promise<{
    priority: 'NOW' | 'LATER' | 'NEVER';
    reason: string;
    confidence: number;
    isFallback: boolean;
    modelName: string;
  }> {
    if (this.isCircuitOpen()) {
      return { ...this.fallBack('Circuit Breaker Active', 0.5), modelName: 'fallback' };
    }

    const groqKey = process.env.GROQ_API_KEY;
    const modelName = groqKey ? (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile') : this.MODEL_NAME;

    try {
      if (groqKey) {
        // Use Groq for ultra-fast classification
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: modelName,
            messages: [
              {
                role: 'system',
                content: `You are a Notification Prioritization Engine. 
                - NOW: Critical security, OTP, or immediate fatal failure.
                - LATER: Warnings (low balance, disk space), daily updates, non-critical alerts.
                - NEVER: Spam, ads, gamification noise.
                Return JSON: {"priority":"NOW"|"LATER"|"NEVER", "reason":"string", "confidence":float}`
              },
              {
                role: 'user',
                content: `Title: ${event.title}, Msg: ${event.message}, Type: ${event.event_type}, Src: ${event.source}`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 150
          },
          {
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 3000
          }
        );

        const choice = response.data.choices[0].message.content;
        const parsed = typeof choice === 'string' ? JSON.parse(choice) : choice;

        this.resetCircuit();
        return {
          priority: parsed.priority || 'LATER',
          reason: parsed.reason || 'Groq Analysis complete',
          confidence: parsed.confidence || 0.95,
          isFallback: false,
          modelName: modelName
        };
      }
      
      // Fallback to Gemini if Groq key isn't setup
      const model = genAI.getGenerativeModel({ 
        model: this.MODEL_NAME,
        generationConfig: { 
          responseMimeType: "application/json",
          maxOutputTokens: 150,
          temperature: 0.1,
          topP: 0.1,
        }
      });

      const prompt = `Classify notification as NOW, LATER, or NEVER.
        - NOW: Real-time critical (Security/Failure).
        - LATER: Information/Warnings (Balance/Sync).
        - NEVER: Promotions/Social.
        Input: Title: ${event.title}, Msg: ${event.message}, Type: ${event.event_type}, Src: ${event.source}
        Return JSON: {"priority":"NOW"|"LATER"|"NEVER", "reason":"string", "confidence":float}`;

      const aiPromise = model.generateContent(prompt);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API Timeout after 3s')), 3000)
      );

      const result = await Promise.race([aiPromise, timeoutPromise]) as any;
      const response = await result.response;
      const text = response.text();
      const parsed = JSON.parse(text);

      this.resetCircuit();

      return {
        priority: parsed.priority || 'LATER',
        reason: parsed.reason || 'AI Analysis complete',
        confidence: parsed.confidence || 0.8,
        isFallback: false,
        modelName: this.MODEL_NAME
      };
    } catch (error: any) {
      console.error('Gemini API Error Detail:', error.message || error);
      this.recordFailure();
      
      let friendlyError = 'AI Analysis unreachable';
      if (error?.message?.includes('429')) {
        friendlyError = 'AI Quota Exceeded (Rate Limited)';
      } else if (error?.message?.includes('Timeout')) {
        friendlyError = 'AI Request Timed Out (3s)';
      }

      return this.fallBack(friendlyError, 0.0);
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
      if (this.lastFailureTime && now - this.lastFailureTime < this.CIRCUIT_OPEN_TIMEOUT) {
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

  private static fallBack(errorReason: string, confidence: number) {
    return {
      priority: 'LATER' as const,
      reason: `Safe Fallback: ${errorReason}`,
      confidence: confidence,
      isFallback: true,
      modelName: 'fallback-engine'
    };
  }
}
