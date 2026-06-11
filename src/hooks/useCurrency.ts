/**
 * useCurrency
 * -----------
 * Préférence de devise utilisateur (persistée dans `profiles.preferred_currency`
 * et mirroré en localStorage). Combine `exchange_rates` (USD pivot) et
 * `platform_settings.economic_config.credit_value_usd` pour exposer :
 *
 *  - `format(credits)`        : libellé localisé (ex: "1 250 FCFA")
 *  - `creditsToFiat(credits)` : valeur numérique dans la devise courante
 *  - `setCurrency(code)`      : mutation (invalide les queries dépendantes)
 *
 * Taux rafraîchis par CRON via l'edge function `refresh-exchange-rates`.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ExchangeRate {
  currency_code: string;
  name: string | null;
  symbol: string | null;
  rate_per_usd: number;
}

const FALLBACK_RATES: ExchangeRate[] = [
  { currency_code: "USD", name: "US Dollar", symbol: "$", rate_per_usd: 1 },
  { currency_code: "EUR", name: "Euro", symbol: "€", rate_per_usd: 0.92 },
  { currency_code: "XOF", name: "CFA franc BCEAO", symbol: "FCFA", rate_per_usd: 605 },
  { currency_code: "XAF", name: "CFA franc BEAC", symbol: "FCFA", rate_per_usd: 605 },
  { currency_code: "NGN", name: "Nigerian Naira", symbol: "₦", rate_per_usd: 1550 },
  { currency_code: "GHS", name: "Ghanaian Cedi", symbol: "₵", rate_per_usd: 15 },
  { currency_code: "KES", name: "Kenyan Shilling", symbol: "KSh", rate_per_usd: 130 },
  { currency_code: "ZAR", name: "South African Rand", symbol: "R", rate_per_usd: 18 },
  { currency_code: "MAD", name: "Moroccan Dirham", symbol: "DH", rate_per_usd: 10 },
  { currency_code: "GBP", name: "British Pound", symbol: "£", rate_per_usd: 0.79 },
  { currency_code: "CAD", name: "Canadian Dollar", symbol: "C$", rate_per_usd: 1.36 },
];

export const useExchangeRates = () => {
  return useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const { data } = await supabase.from("exchange_rates").select("*");
      if (!data || data.length === 0) return FALLBACK_RATES;
      return data as ExchangeRate[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreditValueUsd = () => {
  return useQuery({
    queryKey: ["credit-value-usd"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "economic_config")
        .maybeSingle();
      const val = data?.value as Record<string, unknown> | null;
      return Number(val?.credit_value_usd ?? 0.01);
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUserCurrency = () => {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const query = useQuery({
    queryKey: ["user-currency", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_currency_preferences")
        .select("currency_code")
        .eq("user_id", userId!)
        .maybeSingle();
      return data?.currency_code || "USD";
    },
  });

  const mutation = useMutation({
    mutationFn: async (currency: string) => {
      const { error } = await supabase.rpc("set_user_currency", { p_currency: currency });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-currency", userId] });
    },
  });

  return { currency: query.data || "USD", setCurrency: mutation.mutate, isLoading: query.isLoading };
};

export const useCurrencyFormatter = () => {
  const { data: rates } = useExchangeRates();
  const { data: creditValueUsd } = useCreditValueUsd();
  const { currency } = useUserCurrency();

  const rate = rates?.find((r) => r.currency_code === currency) ?? FALLBACK_RATES[0];
  const symbol = rate.symbol || rate.currency_code;
  const valueUsd = creditValueUsd ?? 0.01;

  const formatCredits = (credits: number, options?: { withCredits?: boolean }) => {
    const inUsd = credits * valueUsd;
    const inCurrency = inUsd * Number(rate.rate_per_usd);
    const display = inCurrency >= 100
      ? Math.round(inCurrency).toLocaleString()
      : inCurrency.toFixed(2);
    if (options?.withCredits === false) return `${display} ${symbol}`;
    const unit = credits > 1 ? "Crédits" : "Crédit";
    return `${credits.toLocaleString()} ${unit} (~${display} ${symbol})`;
  };

  const formatPrice = (credits: number) => {
    const inUsd = credits * valueUsd;
    const inCurrency = inUsd * Number(rate.rate_per_usd);
    const display = inCurrency >= 100
      ? Math.round(inCurrency).toLocaleString()
      : inCurrency.toFixed(2);
    return `${display} ${symbol}`;
  };

  const creditUnit = (credits: number) => (Number(credits) > 1 ? "Crédits" : "Crédit");
  const formatCreditsLabel = (credits: number) =>
    `${Number(credits).toLocaleString()} ${creditUnit(credits)}`;

  return { formatCredits, formatPrice, formatCreditsLabel, creditUnit, currency, symbol, rate };
};
