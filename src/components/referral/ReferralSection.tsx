import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Copy, Gift, Users, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Referral {
  id: string;
  referred_id: string;
  status: string;
  reward_claimed: boolean;
  created_at: string;
  referred_name?: string;
}

const ReferralSection = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string>("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's referral code
    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .single();

    if (profile?.referral_code) {
      setReferralCode(profile.referral_code);
    } else {
      // Generate a referral code if not exists
      const code = `REF-${user.id.slice(0, 8).toUpperCase()}`;
      await supabase
        .from("profiles")
        .update({ referral_code: code })
        .eq("id", user.id);
      setReferralCode(code);
    }

    // Get referrals
    const { data: referralsData } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (referralsData) {
      // Get referred users' names
      const referredIds = referralsData.map(r => r.referred_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", referredIds);

      const enrichedReferrals = referralsData.map(ref => ({
        ...ref,
        referred_name: profiles?.find(p => p.id === ref.referred_id)?.full_name || "Utilisateur"
      }));

      setReferrals(enrichedReferrals);
    }

    setLoading(false);
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/auth?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast({
      title: t("success"),
      description: "Lien de parrainage copié!",
    });
  };

  const claimReward = async (referralId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Atomic: marks reward claimed AND credits wallet in one DB transaction (prevents replay attacks)
    const { data: success, error } = await supabase.rpc("claim_referral_reward", {
      p_referral_id: referralId,
      p_user_id: user.id,
    });

    if (error || !success) {
      toast({
        title: t("error"),
        description: "Impossible de réclamer la récompense (déjà réclamée ou non éligible)",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Récompense réclamée! 🎉",
      description: "50 crédits ont été ajoutés à votre portefeuille",
    });

    fetchReferralData();
  };


  const completedReferrals = referrals.filter(r => r.status === "completed");
  const pendingReferrals = referrals.filter(r => r.status === "pending");
  const unclaimedRewards = completedReferrals.filter(r => !r.reward_claimed);

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            {t("referralProgram") || "Programme de Parrainage"}
          </CardTitle>
          <CardDescription>
            {t("referralDescription") || "Invitez vos amis et gagnez 50 crédits par parrainage réussi!"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              {t("yourReferralLink") || "Votre lien de parrainage"}
            </label>
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/auth?ref=${referralCode}`}
                readOnly
                className="bg-background/50"
              />
              <Button onClick={copyReferralLink} variant="secondary">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-2xl font-bold text-primary">{referrals.length}</p>
              <p className="text-xs text-muted-foreground">{t("totalInvites") || "Total invités"}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-2xl font-bold text-green-500">{completedReferrals.length}</p>
              <p className="text-xs text-muted-foreground">{t("confirmed") || "Confirmés"}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-2xl font-bold text-accent">{unclaimedRewards.length * 50}</p>
              <p className="text-xs text-muted-foreground">{t("creditsToCollect") || "Crédits à récupérer"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("yourReferrals") || "Vos Filleuls"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      {referral.referred_name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-medium">{referral.referred_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {referral.status === "completed" ? (
                      referral.reward_claimed ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {t("claimed") || "Réclamé"}
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => claimReward(referral.id)}
                          className="bg-gradient-primary"
                        >
                          <Gift className="w-3 h-3 mr-1" />
                          +50 crédits
                        </Button>
                      )
                    ) : (
                      <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                        {t("pending") || "En attente"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReferralSection;
