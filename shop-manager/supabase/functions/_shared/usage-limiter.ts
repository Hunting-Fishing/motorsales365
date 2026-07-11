import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export type ApiService = 'openai' | 'twilio_sms' | 'twilio_voice' | 'resend_email';

export interface UsageLimitResult {
  allowed: boolean;
  current_usage: number;
  limit: number;
  remaining: number;
  percentage_used: number;
}

export interface LogUsageParams {
  shopId: string;
  userId?: string;
  apiService: ApiService;
  functionName: string;
  tokensUsed?: number;
  unitsUsed?: number;
  estimatedCostCents?: number;
  metadata?: Record<string, unknown>;
}

// Cost estimates per unit (in cents)
export const API_COSTS = {
  openai: {
    // GPT-4o: ~$5/1M input, ~$15/1M output tokens - average ~1 cent per 1000 tokens
    costPerThousandTokens: 1,
  },
  twilio_sms: {
    // ~$0.0079 per SMS segment
    costPerSms: 0.79,
  },
  twilio_voice: {
    // ~$0.013 per minute
    costPerMinute: 1.3,
  },
  resend_email: {
    // ~$0.001 per email after free tier
    costPerEmail: 0.1,
  },
};

/**
 * Check if a shop has remaining API usage quota
 */
export async function checkUsageLimit(
  shopId: string,
  tierSlug: string,
  apiService: ApiService,
  units: number = 1
): Promise<UsageLimitResult> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { data, error } = await supabase.rpc('check_usage_limit', {
      p_shop_id: shopId,
      p_tier_slug: tierSlug,
      p_api_service: apiService,
      p_units: units,
    });

    if (error) {
      console.error('Error checking usage limit:', error);
      // Default to allowing on error to not block operations
      return {
        allowed: true,
        current_usage: 0,
        limit: 999999,
        remaining: 999999,
        percentage_used: 0,
      };
    }

    return data as UsageLimitResult;
  } catch (err) {
    console.error('Exception checking usage limit:', err);
    return {
      allowed: true,
      current_usage: 0,
      limit: 999999,
      remaining: 999999,
      percentage_used: 0,
    };
  }
}

/**
 * Log API usage after a successful call
 */
export async function logApiUsage(params: LogUsageParams): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { error } = await supabase.from('api_usage_logs').insert({
      shop_id: params.shopId,
      user_id: params.userId,
      api_service: params.apiService,
      function_name: params.functionName,
      tokens_used: params.tokensUsed || 0,
      units_used: params.unitsUsed || 1,
      estimated_cost_cents: params.estimatedCostCents || 0,
      metadata: params.metadata || {},
    });

    if (error) {
      console.error('Error logging API usage:', error);
    }
  } catch (err) {
    console.error('Exception logging API usage:', err);
  }
}

/**
 * Calculate estimated cost for OpenAI usage
 */
export function calculateOpenAICost(tokensUsed: number): number {
  return Math.ceil((tokensUsed / 1000) * API_COSTS.openai.costPerThousandTokens);
}

/**
 * Calculate estimated cost for SMS
 */
export function calculateSmsCost(segmentCount: number = 1): number {
  return Math.ceil(segmentCount * API_COSTS.twilio_sms.costPerSms);
}

/**
 * Calculate estimated cost for voice call
 */
export function calculateVoiceCost(minutes: number): number {
  return Math.ceil(minutes * API_COSTS.twilio_voice.costPerMinute);
}

/**
 * Calculate estimated cost for email
 */
export function calculateEmailCost(emailCount: number = 1): number {
  return Math.ceil(emailCount * API_COSTS.resend_email.costPerEmail);
}

/**
 * Get shop's tier slug from their subscription
 * Falls back to 'starter' if not found
 */
export async function getShopTier(shopId: string): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Try to get tier from module_subscriptions
    const { data, error } = await supabase
      .from('module_subscriptions')
      .select('tier_slug')
      .eq('shop_id', shopId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return 'starter';
    }

    return data.tier_slug || 'starter';
  } catch (err) {
    console.error('Exception getting shop tier:', err);
    return 'starter';
  }
}

/**
 * Helper to create usage limit exceeded error response
 */
export function createLimitExceededResponse(
  service: string,
  usageResult: UsageLimitResult
): Response {
  return new Response(
    JSON.stringify({
      error: 'Usage limit exceeded',
      message: `You have reached your monthly ${service} limit. Please upgrade your plan or wait until next billing period.`,
      current_usage: usageResult.current_usage,
      limit: usageResult.limit,
      percentage_used: usageResult.percentage_used,
    }),
    {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
