import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PayoutMethodCode = "mobile_money" | "bank_transfer" | "paypal";

export interface PayoutOperator {
  code: string;
  label: string;
}

export interface PayoutConfig {
  methods: PayoutMethodCode[];
  mobile_operators: PayoutOperator[];
}

export const DEFAULT_PAYOUT_CONFIG: PayoutConfig = {
  methods: ["mobile_money", "bank_transfer", "paypal"],
  mobile_operators: [
    { code: "orange", label: "Orange Money" },
    { code: "mtn", label: "MTN MoMo" },
    { code: "wave", label: "Wave" },
    { code: "moov", label: "Moov Money" },
    { code: "free", label: "Free Money" },
  ],
};

export const usePayoutConfig = () =>
  useQuery({
    queryKey: ["payout-config"],
    queryFn: async (): Promise<PayoutConfig> => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "payout_config")
        .maybeSingle();
      const v = (data?.value ?? null) as Partial<PayoutConfig> | null;
      const methods =
        Array.isArray(v?.methods) && v!.methods!.length > 0
          ? (v!.methods as PayoutMethodCode[])
          : DEFAULT_PAYOUT_CONFIG.methods;
      const ops =
        Array.isArray(v?.mobile_operators) && v!.mobile_operators!.length > 0
          ? (v!.mobile_operators as PayoutOperator[])
          : DEFAULT_PAYOUT_CONFIG.mobile_operators;
      return { methods, mobile_operators: ops };
    },
    staleTime: 60 * 1000,
  });
