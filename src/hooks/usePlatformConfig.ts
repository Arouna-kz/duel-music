/**
 * usePlatformConfig
 * -----------------
 * Lit une clé typée de `platform_settings` (cache react-query 5 min).
 * Pour des écritures admin, utiliser `PlatformConfigManager` qui invalide
 * automatiquement le cache.
 *
 * Exemples de clés : `vote_config`, `report_config`, `welcome_config`,
 * `pricing_config`, `economic_config`, `push_config`.
 *
 * @param key      - clé dans la table `platform_settings`
 * @param fallback - valeur par défaut si la clé n'existe pas
 */
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
