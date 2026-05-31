import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Banknote, ArrowDownToLine } from "lucide-react";
import { useCurrencyFormatter } from "@/hooks/useCurrency";
import { useLanguage } from "@/contexts/LanguageContext";

interface PayoutMethod {
  id: string;
  method: string;
  label: string | null;
  is_default: boolean;
  phone_number: string | null;
  mobile_operator: string | null;
  iban: string | null;
  bank_name: string | null;
  paypal_email: string | null;
}

interface Props {
  balance: number;
  trigger?: React.ReactNode;
}

export const QuickWithdrawDialog = ({ balance, trigger }: Props) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { formatPrice } = useCurrencyFormatter();
  const [open, setOpen] = useState(false);
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [methodId, setMethodId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [feePreview, setFeePreview] = useState<{ fee_pct: number; fee: number; net: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [wdCfg, setWdCfg] = useState<Record<string, { enabled: boolean; min_amount_credits: number; mode: string }> | null>(null);

  const creditUnit = (n: number) => n > 1 ? t("creditsSuffix") : t("creditSuffix");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: pm }, { data: cfg }] = await Promise.all([
        supabase.from("user_payout_methods" as any).select("*").order("is_default", { ascending: false }),
        supabase.from("platform_settings").select("value").eq("key", "withdrawal_providers_config").maybeSingle(),
      ]);
      const list = (pm as any[]) ?? [];
      setMethods(list);
      const def = list.find((m) => m.is_default) ?? list[0];
      if (def) setMethodId(def.id);
      if (cfg?.value) setWdCfg(cfg.value as any);
    })();
  }, [open]);

  useEffect(() => {
    const n = parseFloat(amount);
    if (!isNaN(n) && n > 0) {
      supabase.auth.getUser().then(({ data }) => {
        if (!data.user) return;
        supabase.rpc("calculate_withdrawal_net", { p_user_id: data.user.id, p_amount: n })
          .then(({ data: d }) => setFeePreview(d as any));
      });
    } else setFeePreview(null);
  }, [amount]);

  const selectedMethod = useMemo(() => methods.find((m) => m.id === methodId), [methods, methodId]);

  const handleSubmit = async () => {
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) {
      toast({ title: t("qwInvalidAmount"), variant: "destructive" });
      return;
    }
    if (n > balance) {
      toast({ title: t("qwInsufficient"), variant: "destructive" });
      return;
    }
    if (!methodId) {
      toast({ title: t("qwSelectMethod"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("request_withdrawal_with_saved_method" as any, {
      p_amount: n,
      p_payout_method_id: methodId,
    });
    setSubmitting(false);
    const result = data as any;
    if (error || !result?.success) {
      const message = result?.message || result?.error || error?.message || t("payoutError");
      toast({ title: t("qwFailed"), description: message, variant: "destructive" });
      return;
    }
    toast({
      title: t("qwSentTitle"),
      description: t("qwSentDesc").replace("{amount}", n.toLocaleString()).replace("{unit}", creditUnit(n)),
    });
    setOpen(false);
    setAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="w-full sm:w-auto">
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            {t("qwWithdraw")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-green-500" />
            {t("qwDirectTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("qwDirectDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">{t("qwAvailable")}</p>
            <p className="text-2xl font-bold">{balance.toLocaleString()} {creditUnit(balance)}</p>
            {wdCfg && (
              <div className="text-xs p-2 rounded bg-muted/40 space-y-0.5 mt-2 text-left">
                <p className="font-semibold mb-1">{t("qwThresholds")}</p>
                {(["cinetpay", "moneroo", "stripe"] as const).map((p) => wdCfg[p]?.enabled && (
                  <div key={p} className="flex justify-between">
                    <span className="capitalize">{p}</span>
                    <span>{t("qwMinCreditsShort")} {wdCfg[p].min_amount_credits} {t("qwCreditsShort")} · {wdCfg[p].mode === "auto_payout" ? t("qwModeAuto") : wdCfg[p].mode === "auto_approve" ? t("qwModeAutoApprove") : t("qwModeManual")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {methods.length === 0 ? (
            <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-destructive">
              {t("qwNoMethod")}
            </div>
          ) : (
            <>
              {!methods.some((m) => m.is_default) && (
                <div className="p-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-xs text-yellow-700 dark:text-yellow-400">
                  {t("qwNoDefaultWarn")}
                </div>
              )}
              <div>
                <Label>{t("qwMethod")}</Label>
                <Select value={methodId} onValueChange={setMethodId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {methods.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label || m.method} {m.is_default ? "★" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMethod && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedMethod.method === "mobile_money" && `${selectedMethod.mobile_operator} • ${selectedMethod.phone_number}`}
                    {selectedMethod.method === "bank_transfer" && `${selectedMethod.bank_name} • ${selectedMethod.iban}`}
                    {selectedMethod.method === "paypal" && selectedMethod.paypal_email}
                  </p>
                )}
              </div>

              <div>
                <Label>{t("qwAmountIn")} {creditUnit(parseFloat(amount || "0"))}</Label>
                <Input type="number" min={1} max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} />
                {amount && !isNaN(parseFloat(amount)) && (
                  <p className="text-xs text-muted-foreground mt-1">≈ {formatPrice(parseFloat(amount))}</p>
                )}
              </div>

              {feePreview && feePreview.fee_pct > 0 && (
                <div className="text-xs p-2 rounded bg-muted/50 space-y-0.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("qwFees")} ({feePreview.fee_pct}%)</span><span>-{feePreview.fee.toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold"><span>{t("qwNetReceivedIn")} {creditUnit(feePreview.net)}</span><span className="text-green-500">{feePreview.net.toFixed(2)}</span></div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("payoutCancel")}</Button>
          <Button onClick={handleSubmit} disabled={submitting || methods.length === 0}>
            {submitting ? t("qwSubmitting") : t("qwConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickWithdrawDialog;

