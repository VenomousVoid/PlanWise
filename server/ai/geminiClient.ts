import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { CONFIG } from '../config.ts';
import { aiCache } from './cache.ts';
import {
  SYSTEM_SECURITY_INSTRUCTION,
  buildBudgetAdvisorPrompt,
  buildIdeasPrompt,
  buildVendorQuestionsPrompt,
} from './promptBuilders.ts';
import {
  BudgetAdvisorResponseSchema,
  IdeasResponseSchema,
  VendorQuestionsResponseSchema,
} from './schemas.ts';
import {
  FALLBACK_IDEAS_BY_TYPE,
  FALLBACK_VENDOR_QUESTIONS,
} from './fallbacks.ts';
import { Idea } from '../../shared/types.ts';

export interface AiServiceResult<T> {
  data: T;
  isAiGenerated: boolean;
  fallbackUsed: boolean;
  modelUsed?: string;
  source: 'gemini' | 'cache' | 'fallback';
}

class GeminiClientService {
  private ai: GoogleGenAI | null = null;
  private readonly defaultModel = CONFIG.GEMINI_MODEL || 'gemini-3.8-flash';
  private failureCooldownUntil = 0; // Circuit breaker timestamp

  constructor() {
    if (CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
      try {
        this.ai = new GoogleGenAI({
          apiKey: CONFIG.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      } catch (err) {
        console.warn('Failed to initialize GoogleGenAI client, fallback mode enabled:', err);
        this.ai = null;
      }
    }
  }

  public isKeyConfigured(): boolean {
    return Boolean(this.ai && CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  }

  private isUnderCooldown(): boolean {
    return Date.now() < this.failureCooldownUntil;
  }

  private triggerCooldown(durationMs = 45000): void {
    this.failureCooldownUntil = Date.now() + durationMs;
  }

  private async callWithTimeout<T>(promise: Promise<T>, timeoutMs = 15000): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Gemini API request timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
  }

  /**
   * Generates budget trade-off explanations and alternatives using Gemini with fallback.
   */
  async getBudgetAdvice(data: {
    eventType: string;
    totalBudget: number;
    guestCount: number;
    city: string;
    preferences: string;
    cutPercent?: number;
    savedAmount?: number;
  }): Promise<AiServiceResult<{ tradeOffExplanation: string; alternativeSuggestions: string[] }>> {
    const cacheKey = aiCache.generateKey('budget-advice', data);
    const cached = aiCache.get<{ tradeOffExplanation: string; alternativeSuggestions: string[] }>(cacheKey);
    if (cached) {
      return { data: cached, isAiGenerated: true, fallbackUsed: false, modelUsed: this.defaultModel, source: 'cache' };
    }

    const fallbackOutput = {
      tradeOffExplanation: `Budget allocation optimized for ${data.eventType} in ${data.city}. Essential venue and catering requirements were prioritized while non-core categories were trimmed proportionally to preserve contingency reserves.`,
      alternativeSuggestions: [
        'Opt for local seasonal floral arrangements rather than imported blooms.',
        'Consolidate lighting and sound setup under a single local technical vendor.',
        'Transition to digital luxury video invitations with tracked RSVP links.',
      ],
    };

    if (!this.ai || this.isUnderCooldown()) {
      return {
        data: fallbackOutput,
        isAiGenerated: false,
        fallbackUsed: true,
        source: 'fallback',
      };
    }

    try {
      const prompt = buildBudgetAdvisorPrompt(data);
      const response = await this.callWithTimeout(
        this.ai.models.generateContent({
          model: this.defaultModel,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_SECURITY_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: BudgetAdvisorResponseSchema,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        })
      );

      const text = response.text?.trim();
      if (!text) throw new Error('Empty response from Gemini');
      const parsed = JSON.parse(text);

      if (typeof parsed.tradeOffExplanation === 'string' && Array.isArray(parsed.alternativeSuggestions)) {
        aiCache.set(cacheKey, parsed);
        return { data: parsed, isAiGenerated: true, fallbackUsed: false, modelUsed: this.defaultModel, source: 'gemini' };
      }
      throw new Error('Malformed JSON structure from Gemini');
    } catch (error) {
      this.triggerCooldown(45000);
      console.info(
        `[PlanWise AI] Gemini budget advice unavailable (${error instanceof Error ? error.message : 'timeout'}). Serving high-quality deterministic fallback.`
      );
      return {
        data: fallbackOutput,
        isAiGenerated: false,
        fallbackUsed: true,
        source: 'fallback',
      };
    }
  }

  /**
   * Generates themed event ideas with fallback.
   */
  async getIdeas(data: {
    eventType: string;
    styleTheme: string;
    city: string;
    totalBudget: number;
    guestCount: number;
    foodPreference: string;
    venueType: string;
    notes?: string;
  }): Promise<AiServiceResult<Idea[]>> {
    const cacheKey = aiCache.generateKey('ideas', data);
    const cached = aiCache.get<Idea[]>(cacheKey);
    if (cached) {
      return { data: cached, isAiGenerated: true, fallbackUsed: false, modelUsed: this.defaultModel, source: 'cache' };
    }

    const fallbackList = FALLBACK_IDEAS_BY_TYPE[data.eventType] || FALLBACK_IDEAS_BY_TYPE.wedding;

    if (!this.ai || this.isUnderCooldown()) {
      return { data: fallbackList, isAiGenerated: false, fallbackUsed: true, source: 'fallback' };
    }

    try {
      const prompt = buildIdeasPrompt(data);
      const response = await this.callWithTimeout(
        this.ai.models.generateContent({
          model: this.defaultModel,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_SECURITY_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: IdeasResponseSchema,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        })
      );

      const text = response.text?.trim();
      if (!text) throw new Error('Empty response from Gemini');
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed.ideas) && parsed.ideas.length > 0) {
        const validatedIdeas: Idea[] = parsed.ideas.map((item: any, i: number) => ({
          id: `idea-ai-${Date.now().toString(36)}-${i}`,
          category: String(item.category || 'entertainment'),
          title: String(item.title || 'Special Feature'),
          description: String(item.description || ''),
          estimatedCostMin: Number.isInteger(item.estimatedCostMin) ? item.estimatedCostMin : 10000,
          estimatedCostMax: Number.isInteger(item.estimatedCostMax) ? item.estimatedCostMax : 25000,
          tags: Array.isArray(item.tags) ? item.tags.map(String) : ['Creative'],
        }));

        aiCache.set(cacheKey, validatedIdeas);
        return { data: validatedIdeas, isAiGenerated: true, fallbackUsed: false, modelUsed: this.defaultModel, source: 'gemini' };
      }
      throw new Error('Invalid ideas array structure');
    } catch (err) {
      this.triggerCooldown(45000);
      console.info('[PlanWise AI] Ideas generation served from template fallback:', err instanceof Error ? err.message : 'timeout');
      return { data: fallbackList, isAiGenerated: false, fallbackUsed: true, source: 'fallback' };
    }
  }

  /**
   * Generates vendor vetting questions with fallback.
   */
  async getVendorQuestions(category: string, eventType = 'wedding'): Promise<AiServiceResult<string[]>> {
    const normCategory = category.toLowerCase();
    const cacheKey = aiCache.generateKey('vendor-questions', { category: normCategory, eventType });
    const cached = aiCache.get<string[]>(cacheKey);
    if (cached) {
      return { data: cached, isAiGenerated: true, fallbackUsed: false, modelUsed: this.defaultModel, source: 'cache' };
    }

    const fallbackQuestions = FALLBACK_VENDOR_QUESTIONS[normCategory] || FALLBACK_VENDOR_QUESTIONS.venue;

    if (!this.ai || this.isUnderCooldown()) {
      return { data: fallbackQuestions, isAiGenerated: false, fallbackUsed: true, source: 'fallback' };
    }

    try {
      const prompt = buildVendorQuestionsPrompt(normCategory, eventType);
      const response = await this.callWithTimeout(
        this.ai.models.generateContent({
          model: this.defaultModel,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_SECURITY_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: VendorQuestionsResponseSchema,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        })
      );

      const text = response.text?.trim();
      if (!text) throw new Error('Empty response from Gemini');
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        const questions = parsed.questions.map(String);
        aiCache.set(cacheKey, questions);
        return { data: questions, isAiGenerated: true, fallbackUsed: false, modelUsed: this.defaultModel, source: 'gemini' };
      }
      throw new Error('Invalid questions format');
    } catch (err) {
      this.triggerCooldown(45000);
      console.info('[PlanWise AI] Vendor questions served from template fallback:', err instanceof Error ? err.message : 'timeout');
      return { data: fallbackQuestions, isAiGenerated: false, fallbackUsed: true, source: 'fallback' };
    }
  }
}

export const geminiClientService = new GeminiClientService();

