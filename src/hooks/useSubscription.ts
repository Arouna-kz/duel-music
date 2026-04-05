import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  icon: string;
  gradient: string;
  sort_order: number;
  is_active: boolean;
  features: string[];
  rules: {
    max_votes_per_duel: number; // -1 = unlimited
    premium_replays: boolean;
    early_access: boolean;
    virtual_meets: boolean;
    exclusive_gifts: boolean;
    no_ads: boolean;
    exclusive_content: boolean;
    priority_support: boolean;
  };
}

const defaultRules: SubscriptionPlan["rules"] = {
  max_votes_per_duel: 3,
  premium_replays: false,
  early_access: false,
  virtual_meets: false,
  exclusive_gifts: false,
  no_ads: false,
  exclusive_content: false,
  priority_support: false,
};

// Fetch all plans
export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data as any[]).map((p) => ({
        ...p,
        features: Array.isArray(p.features) ? p.features : [],
        rules: { ...defaultRules, ...(typeof p.rules === "object" ? p.rules : {}) },
      })) as SubscriptionPlan[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch current user's subscription + plan rules
export const useUserSubscription = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: plans } = useSubscriptionPlans();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["user-subscription", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("fan_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const currentPlanId = subscription?.subscription_type || "free";
  const currentPlan = plans?.find((p) => p.id === currentPlanId) || null;
  const rules = currentPlan?.rules || defaultRules;

  return {
    isLoading,
    userId,
    currentPlanId,
    currentPlan,
    rules,
    plans: plans || [],
    isProOrAbove: currentPlanId === "pro" || currentPlanId === "premium",
    isPremium: currentPlanId === "premium",
  };
};
