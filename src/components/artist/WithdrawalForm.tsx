import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Banknote, Clock, CheckCircle, XCircle, ArrowRight, Gift } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface WithdrawalFormProps {
  userId: string;
  availableBalance: number;
}

interface WithdrawalRequest {
  id: string; amount: number; status: string; payment_method: string | null; created_at: string; processed_at: string | null;
}

interface GiftConversion {
  id: string; gift_value: number; cash_value: number; status: string; created_at: string;
}

export const WithdrawalForm = ({ userId, availableBalance }: WithdrawalFormProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [conversions, setConversions] = useState<GiftConversion[]>([]);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [giftValue, setGiftValue] = useState("");
  const [convertingGifts, setConvertingGifts] = useState(false);
  const [totalGiftValue, setTotalGiftValue] = useState(0);

  useEffect(() => { loadData(); }, [userId]);

  const loadData = async () => {
    try {
      const [withdrawalsRes, conversionsRes, giftsRes] = await Promise.all([
        supabase.from("withdrawal_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("gift_conversions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("gift_transactions").select("gift_id, virtual_gifts(price)").eq("to_user_id", userId)
      ]);
      setWithdrawals(withdrawalsRes.data || []);
      setConversions(conversionsRes.data || []);
      const total = giftsRes.data?.reduce((sum, g) => {
        const price = (g.virtual_gifts as any)?.price || 0;
        return sum + Number(price);
      }, 0) || 0;
      setTotalGiftValue(total);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast({ title: t("commonError"), description: t("wdInvalidAmount"), variant: "destructive" });
      return;
    }
    if (withdrawAmount > availableBalance) {
      toast({ title: t("wdInsufficientBalance"), description: t("wdInsufficientBalanceDesc"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("withdrawal_requests").insert({
        user_id: userId, amount: withdrawAmount, payment_method: paymentMethod, payment_details: { details: paymentDetails }
      });
      if (error) throw error;
      toast({ title: t("wdRequestSent"), description: `${t("wdWithdrawalOf")} ${withdrawAmount}€` });
      setAmount(""); setPaymentDetails(""); loadData();
    } catch (error: any) {
      toast({ title: t("commonError"), description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGiftConversion = async () => {
    const giftAmount = parseFloat(giftValue);
    if (isNaN(giftAmount) || giftAmount <= 0) {
      toast({ title: t("commonError"), description: t("wdInvalidValue"), variant: "destructive" });
      return;
    }
    if (giftAmount > totalGiftValue) {
      toast({ title: t("wdInsufficientGifts"), description: t("wdInsufficientGiftsDesc"), variant: "destructive" });
      return;
    }
    setConvertingGifts(true);
    try {
      const cashValue = giftAmount * 0.5;
      const { error } = await supabase.from("gift_conversions").insert({ user_id: userId, gift_value: giftAmount, cash_value: cashValue });
      if (error) throw error;
      toast({ title: t("wdConversionRequested"), description: `${giftAmount} ${t("wdCredits")} → ${cashValue.toFixed(2)}€` });
      setGiftValue(""); loadData();
    } catch (error: any) {
      toast({ title: t("commonError"), description: error.message, variant: "destructive" });
    } finally {
      setConvertingGifts(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500"><Clock className="w-3 h-3 mr-1" />{t("wdStatusPending")}</Badge>;
      case "processing":
        return <Badge variant="outline" className="border-blue-500 text-blue-500"><Clock className="w-3 h-3 mr-1" />{t("wdStatusProcessing")}</Badge>;
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />{t("wdStatusCompleted")}</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t("wdStatusRejected")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) return <div className="text-center py-8">{t("commonLoading")}</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Gift className="w-5 h-5 text-pink-500" />{t("wdConvertTitle")}</CardTitle>
            <CardDescription>{t("wdConvertDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-pink-500/10 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">{t("wdGiftValue")}</p>
              <p className="text-2xl font-bold text-pink-500">{totalGiftValue} {t("wdCredits")}</p>
              <p className="text-xs text-muted-foreground">≈ {(totalGiftValue * 0.5).toFixed(2)}€</p>
            </div>
            <div className="space-y-2">
              <Label>{t("wdConvertAmount")}</Label>
              <div className="flex gap-2">
                <Input type="number" value={giftValue} onChange={(e) => setGiftValue(e.target.value)} placeholder="0" max={totalGiftValue} />
                <Button onClick={handleGiftConversion} disabled={convertingGifts}><ArrowRight className="w-4 h-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("wdConvertRate")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Banknote className="w-5 h-5 text-green-500" />{t("wdWithdrawTitle")}</CardTitle>
            <CardDescription>{t("wdWithdrawDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWithdrawal} className="space-y-4">
              <div className="p-4 bg-green-500/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">{t("wdAvailableBalance")}</p>
                <p className="text-2xl font-bold text-green-500">{availableBalance.toFixed(2)}€</p>
              </div>
              <div className="space-y-2">
                <Label>{t("wdWithdrawAmount")}</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" step="0.01" max={availableBalance} required />
              </div>
              <div className="space-y-2">
                <Label>{t("wdPaymentMethod")}</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="bank_transfer">{t("wdBankTransfer")}</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("wdPaymentDetails")}</Label>
                <Input value={paymentDetails} onChange={(e) => setPaymentDetails(e.target.value)} placeholder={paymentMethod === "mobile_money" ? t("wdPhoneNumber") : paymentMethod === "bank_transfer" ? t("wdIBAN") : t("wdPaypalAddress")} required />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? t("wdSending") : t("wdRequestWithdraw")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {(withdrawals.length > 0 || conversions.length > 0) && (
        <Card>
          <CardHeader><CardTitle>{t("wdHistory")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{t("wdWithdrawalOf")} {w.amount.toFixed(2)}€</p>
                  <p className="text-sm text-muted-foreground">{w.payment_method} • {new Date(w.created_at).toLocaleDateString()}</p>
                </div>
                {getStatusBadge(w.status)}
              </div>
            ))}
            {conversions.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{t("wdConversionOf")} {c.gift_value} {t("wdCredits")} → {c.cash_value.toFixed(2)}€</p>
                  <p className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                </div>
                {getStatusBadge(c.status)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};