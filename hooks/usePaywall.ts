import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/lib/auth-context';
import {
  checkEntitlement,
  restorePurchases as rcRestorePurchases,
} from '@/lib/revenucat';
import { FREE_LIMITS } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';

interface UsageRecord {
  feature_name: string;
  usage_count: number;
  reset_at: string;
}

interface UsePaywallResult {
  isPremium: boolean;
  isLoading: boolean;
  canUseFeature: (feature: keyof typeof FREE_LIMITS) => Promise<boolean>;
  incrementUsage: (feature: keyof typeof FREE_LIMITS) => Promise<void>;
  getUsageInfo: (feature: keyof typeof FREE_LIMITS) => Promise<{
    used: number;
    limit: number;
    remaining: number;
  }>;
  showPaywall: () => void;
  restorePurchases: () => Promise<boolean>;
  refreshEntitlement: () => Promise<void>;
}

function getResetTimestamp(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

export function usePaywall(): UsePaywallResult {
  const { user } = useAuth();
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshEntitlement = useCallback(async () => {
    setIsLoading(true);
    try {
      const entitled = await checkEntitlement('Pawlogix pro');
      setIsPremium(entitled);
    } catch {
      setIsPremium(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-check entitlement on mount AND when screen regains focus (e.g. after paywall dismisses)
  useFocusEffect(
    useCallback(() => {
      refreshEntitlement();
    }, [refreshEntitlement])
  );

  const getOrCreateUsage = useCallback(
    async (feature: string): Promise<UsageRecord | null> => {
      if (!user?.id) return null;

      const now = new Date();
      const { data, error } = await supabase
        .from('pl_usage')
        .select('feature_name, usage_count, reset_at')
        .eq('user_id', user.id)
        .eq('feature_name', feature)
        .single();

      if (error && error.code !== 'PGRST116') return null; // PGRST116 = no rows

      if (!data) {
        // Create initial record
        const resetAt = getResetTimestamp();
        const { data: created, error: createError } = await supabase
          .from('pl_usage')
          .insert({
            user_id: user.id,
            feature_name: feature,
            usage_count: 0,
            reset_at: resetAt,
            period: 'monthly',
          })
          .select('feature_name, usage_count, reset_at')
          .single();

        if (createError) return null;
        return created;
      }

      // Check if period has expired and reset
      if (new Date(data.reset_at) <= now) {
        const resetAt = getResetTimestamp();
        const { data: updated, error: updateError } = await supabase
          .from('pl_usage')
          .update({ usage_count: 0, reset_at: resetAt, updated_at: now.toISOString() })
          .eq('user_id', user.id)
          .eq('feature_name', feature)
          .select('feature_name, usage_count, reset_at')
          .single();

        if (updateError) return data;
        return updated;
      }

      return data;
    },
    [user?.id]
  );

  const canUseFeature = useCallback(
    async (feature: keyof typeof FREE_LIMITS): Promise<boolean> => {
      if (isPremium) return true;

      const usage = await getOrCreateUsage(feature);
      if (!usage) return true; // fail open

      const limit = FREE_LIMITS[feature];
      return usage.usage_count < limit;
    },
    [isPremium, getOrCreateUsage]
  );

  const incrementUsage = useCallback(
    async (feature: keyof typeof FREE_LIMITS): Promise<void> => {
      if (isPremium || !user?.id) return;

      const usage = await getOrCreateUsage(feature);
      if (!usage) return;

      const { error: updateError } = await supabase
        .from('pl_usage')
        .update({
          usage_count: usage.usage_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('feature_name', feature);
      if (updateError) throw updateError;
    },
    [isPremium, user?.id, getOrCreateUsage]
  );

  const getUsageInfo = useCallback(
    async (feature: keyof typeof FREE_LIMITS) => {
      const limit = FREE_LIMITS[feature];
      if (isPremium) {
        return { used: 0, limit: Infinity, remaining: Infinity };
      }

      const usage = await getOrCreateUsage(feature);
      const used = usage?.usage_count ?? 0;
      return {
        used,
        limit,
        remaining: Math.max(0, limit - used),
      };
    },
    [isPremium, getOrCreateUsage]
  );

  const showPaywall = useCallback(() => {
    router.push('/paywall');
  }, [router]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      const info = await rcRestorePurchases();
      const entitled = info.entitlements.active['Pawlogix pro'] !== undefined;
      setIsPremium(entitled);
      return entitled;
    } catch {
      return false;
    }
  }, []);

  return {
    isPremium,
    isLoading,
    canUseFeature,
    incrementUsage,
    getUsageInfo,
    showPaywall,
    restorePurchases,
    refreshEntitlement,
  };
}
