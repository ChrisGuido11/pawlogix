import { supabase } from '@/lib/supabase';
import { checkEntitlement } from '@/lib/revenucat';

/** Free tier limits */
export const FREE_LIMITS = {
  scansPerMonth: 2,
  chatMessagesPerRecord: 5,
  maxPets: 1,
} as const;

export type SubscriptionTier = 'free' | 'plus';

export interface UsageInfo {
  scansThisMonth: number;
  scansRemaining: number;
  billingPeriodStart: string;
  tier: SubscriptionTier;
}

/**
 * Get current month boundaries in ISO format.
 */
function getMonthBounds(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Check the user's current scan usage for this billing period.
 * Returns usage info including remaining scans.
 */
export async function getUsageInfo(userId: string): Promise<UsageInfo> {
  const { start } = getMonthBounds();

  // Check subscription tier from RevenueCat
  let tier: SubscriptionTier = 'free';
  try {
    const isPremium = await checkEntitlement('plus');
    if (isPremium) tier = 'plus';
  } catch {
    // Fall back to free tier on error
  }

  if (tier === 'plus') {
    return {
      scansThisMonth: 0,
      scansRemaining: Infinity,
      billingPeriodStart: start,
      tier,
    };
  }

  // Count scans this month
  const { count, error } = await supabase
    .from('pl_health_records')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', start);

  const scansThisMonth = error ? 0 : (count ?? 0);
  const scansRemaining = Math.max(0, FREE_LIMITS.scansPerMonth - scansThisMonth);

  return {
    scansThisMonth,
    scansRemaining,
    billingPeriodStart: start,
    tier,
  };
}

/**
 * Check if the user can perform a scan.
 */
export async function canScan(userId: string): Promise<boolean> {
  const usage = await getUsageInfo(userId);
  return usage.scansRemaining > 0;
}

/**
 * Format the reset date (first of next month).
 */
export function getResetDateLabel(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}
