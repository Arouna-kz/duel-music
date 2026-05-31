import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePricingEnabled = () => {
  return useQuery({
    queryKey: ["pricing-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "pricing_config")
        .single();
      if (!data?.value) return true;
      const val = data.value as Record<string, unknown>;
      return (val.enabled as boolean) ?? true;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useReferralEnabled = () => {
  return useQuery({
    queryKey: ["referral-config-enabled"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "referral_config")
        .maybeSingle();
      if (!data?.value) return true;
      const val = data.value as Record<string, unknown>;
      return (val.enabled as boolean) ?? true;
    },
    staleTime: 60 * 1000,
  });
};
