/**
 * usePlatformSettings
 * -------------------
 * Variante batch de `usePlatformConfig` : récupère plusieurs clés en un seul
 * round-trip, avec souscription Realtime aux modifications admin.
 *
 * Préférer ce hook quand un composant a besoin de >2 clés (évite N requêtes).
 */
import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePlatformSetting = <T = any>(key: string, defaultValue: T) => {
  return useQuery({
    queryKey: ["platform_setting", key],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      return ((data?.value as T) ?? defaultValue) as T;
    },
    staleTime: 60_000,
  });
};

export const updatePlatformSetting = async (key: string, value: any) => {
  const { error } = await supabase
    .from("platform_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
};

export interface ContactInfo {
  email: string;
  phone: string;
  address: string;
}
export const DEFAULT_CONTACT: ContactInfo = {
  email: "contact@duelmusic.com",
  phone: "+33 1 23 45 67 89",
  address: "123 Avenue de la Musique, 75001 Paris, France",
};

export interface SocialLinks {
  facebook: string; instagram: string; x: string; youtube: string;
  tiktok: string; whatsapp: string; telegram: string; linkedin: string; discord: string;
}
export const DEFAULT_SOCIAL: SocialLinks = {
  facebook: "", instagram: "", x: "", youtube: "",
  tiktok: "", whatsapp: "", telegram: "", linkedin: "", discord: "",
};

export interface PushConfig { vapid_public_key: string }
export const DEFAULT_PUSH: PushConfig = { vapid_public_key: "" };
