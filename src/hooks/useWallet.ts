/**
 * useWallet
 * ---------
 * Lit le solde de crédits de l'utilisateur connecté depuis `wallets` et
 * souscrit aux changements en temps réel (Realtime). Expose aussi un helper
 * `refresh()` pour forcer un re-fetch après une transaction.
 *
 * Le solde est en CRÉDITS (entier). Conversion via `useCurrency` pour
 * l'affichage dans la devise locale (1 crédit = `credit_value_usd` USD,
 * configuré dans `platform_settings.economic_config`).
 *
 * @returns { credits, loading, refresh }
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Live wallet balance for the current authenticated user.
 * Subscribes to user_wallets realtime updates so any RPC that
 * mutates the balance (purchases, gifts, replays...) is reflected
 * automatically without a page reload.
 */
export const useWallet = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
      if (!data.user) {
        setBalance(null);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setBalance(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from("user_wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setBalance(Number(data?.balance ?? 0));
        setLoading(false);
      });
    const channel = supabase
      .channel(`wallet-hook-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_wallets", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const next = payload.new?.balance;
          if (next !== undefined) setBalance(Number(next));
        }
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { balance: balance ?? 0, isAuthenticated: !!userId, loading };
};
