import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Wallet, CreditCard, DollarSign, Smartphone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

const WalletRecharge = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileOperator, setMobileOperator] = useState("");

  useEffect(() => {
    loadWalletBalance();
  }, []);

  const loadWalletBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: wallet } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (wallet) {
        setWalletBalance(Number(wallet.balance) || 0);
      }
    } catch (error) {
      console.error("Error loading wallet balance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const rechargeAmount = parseFloat(amount);
    
    if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
      toast({
        title: t("invalidAmount"),
        description: t("enterValidAmount"),
        variant: "destructive",
      });
      return;
    }

    if (rechargeAmount < 5) {
      toast({
        title: t("amountTooLow"),
        description: t("minimumCard"),
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { amount: rechargeAmount, type: "wallet" },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }

      toast({
        title: t("redirectToPayment"),
        description: t("redirectToStripe"),
      });
    } catch (error) {
      console.error("Error processing recharge:", error);
      toast({
        title: t("error"),
        description: t("rechargeError"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const presetAmounts = [5, 10, 20, 50, 100];

  const handleMobileMoneyRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const rechargeAmount = parseFloat(amount);
    
    if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
      toast({
        title: t("invalidAmount"),
        description: t("enterValidAmount"),
        variant: "destructive",
      });
      return;
    }

    if (rechargeAmount < 500) {
      toast({
        title: t("amountTooLow"),
        description: t("minimumMobile"),
        variant: "destructive",
      });
      return;
    }

    if (!mobileNumber || mobileNumber.length < 8) {
      toast({
        title: t("invalidNumber"),
        description: t("enterValidPhone"),
        variant: "destructive",
      });
      return;
    }

    if (!mobileOperator) {
      toast({
        title: t("operatorRequired"),
        description: t("selectOperatorMsg"),
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      // For now, simulate mobile money integration
      // In production, this would call a mobile money API (Orange Money, MTN MoMo, Wave, etc.)
      toast({
        title: t("mobileMoneyPayment"),
        description: t("mobileMoneyRequested"),
      });

      setTimeout(() => {
        toast({
          title: t("waitingConfirmation"),
          description: t("confirmOnPhone"),
        });
      }, 2000);

    } catch (error) {
      console.error("Error processing mobile money:", error);
      toast({
        title: t("error"),
        description: t("mobileMoneyError"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const mobilePresetAmounts = [500, 1000, 2000, 5000, 10000];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{t("walletTitle")}</h1>
            <p className="text-muted-foreground">{t("walletSubtitle")}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Current Balance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  {t("currentBalance")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary">
                  {walletBalance.toFixed(2)}€
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("availableForTransactions")}
                </p>
              </CardContent>
            </Card>

            {/* Recharge Form Card with Tabs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  {t("addCredits")}
                </CardTitle>
                <CardDescription>
                  {t("choosePaymentMethod")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="card" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="card" className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      {t("cardTab")}
                    </TabsTrigger>
                    <TabsTrigger value="mobile" className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      {t("mobileMoneyTab")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="card">
                    <form onSubmit={handleRecharge} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount-card">{t("amountEur")}</Label>
                        <Input
                          id="amount-card"
                          type="number"
                          min="5"
                          step="0.01"
                          placeholder={t("enterAmount")}
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {presetAmounts.map((preset) => (
                          <Button
                            key={preset}
                            type="button"
                            variant="outline"
                            onClick={() => setAmount(preset.toString())}
                            className="w-full"
                          >
                            {preset}€
                          </Button>
                        ))}
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={processing}
                      >
                        {processing ? t("processing") : t("rechargeWithStripe")}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="mobile">
                    <form onSubmit={handleMobileMoneyRecharge} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="operator">{t("operator")}</Label>
                        <Select value={mobileOperator} onValueChange={setMobileOperator}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectOperator")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="orange">Orange Money</SelectItem>
                            <SelectItem value="mtn">MTN MoMo</SelectItem>
                            <SelectItem value="wave">Wave</SelectItem>
                            <SelectItem value="moov">Moov Money</SelectItem>
                            <SelectItem value="free">Free Money</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mobile-number">{t("phoneNumber")}</Label>
                        <Input
                          id="mobile-number"
                          type="tel"
                          placeholder="Ex: 77 123 45 67"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="amount-mobile">{t("amountFcfa")}</Label>
                        <Input
                          id="amount-mobile"
                          type="number"
                          min="500"
                          step="100"
                          placeholder={t("enterAmount")}
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {mobilePresetAmounts.map((preset) => (
                          <Button
                            key={preset}
                            type="button"
                            variant="outline"
                            onClick={() => setAmount(preset.toString())}
                            className="w-full text-sm"
                          >
                            {preset.toLocaleString()} F
                          </Button>
                        ))}
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:from-orange-600 hover:to-yellow-600" 
                        disabled={processing}
                      >
                        {processing ? t("processing") : t("payWithMobileMoney")}
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        {t("mobileMoneyConfirmHint")}
                      </p>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                {t("paymentMethods")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{t("bankCard")}</p>
                    <p className="text-sm text-muted-foreground">{t("bankCardProviders")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-lg border border-orange-500/20">
                  <Smartphone className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="font-medium">{t("mobileMoney")}</p>
                    <p className="text-sm text-muted-foreground">{t("mobileMoneyProviders")}</p>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• {t("securePaymentsInfo")}</p>
                <p>• {t("instantCredits")}</p>
                <p>• {t("minimumAmounts")}</p>
                <p>• {t("noTransactionFees")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Usage Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t("creditUsage")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>{t("votes")}:</strong> {t("creditUsageVotes")}</p>
              <p>• <strong>{t("virtualGifts")}:</strong> {t("creditUsageGifts")}</p>
              <p>• <strong>{t("ticketSystem")}:</strong> {t("creditUsageTickets")}</p>
              <p>• <strong>Replays:</strong> {t("creditUsageReplays")}</p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WalletRecharge;