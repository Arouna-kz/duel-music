import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Copy, Gift, Users, CheckCircle, Share2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useReferralEnabled } from "@/hooks/usePlatformConfig";
import { ReferralShareDialog } from "./ReferralShareDialog";
import { useUiPreferences } from "@/hooks/useUiPreferences";
import { formatTz } from "@/lib/datetime";

interface Referral {
  id: string;
  referred_id: string;
  status: string;
  reward_claimed: boolean;
  created_at: string;
  referred_name?: string;
}

const ReferralSection = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { prefs } = useUiPreferences();
  const tz = prefs.timezone;
  const { data: referralEnabled = true, isLoading: configLoading } = useReferralEnabled();
  const [referralCode, setReferralCode] = useState<string>("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .single();

    if (profile?.referral_code) {
      setReferralCode(profile.referral_code);
    }

    const { data: referralsData } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (referralsData && referralsData.length > 0) {
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
    } else {
      setReferrals([]);
    }

    setLoading(false);
  };

  // When referral system is disabled, share the plain origin (no ref param)
  // so any previously shared invite link gracefully degrades to a normal link.
  const referralLink = referralEnabled && referralCode
    ? `${window.location.origin}/auth?ref=${referralCode}`
    : `${window.location.origin}/auth`;

  const copyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    toast({ title: t("codeCopied") });
  };

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast({ title: t("linkCopied") });
  };

  const shareLink = () => {
    if (!referralLink) return;
    setShareOpen(true);
  };

  const claimReward = async (referralId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
  const unclaimedRewards = completedReferrals.filter(r => !r.reward_claimed);

  if (loading || configLoading) {
    return <div className="text-center py-8 text-muted-foreground">{t("loading")}...</div>;
  }

  // System disabled by admin: hide code/link, show notice only
  if (!referralEnabled) {
    return (
      <Card className="bg-gradient-to-br from-muted/40 to-muted/10 border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-muted-foreground" />
            {t("referralProgram")}
          </CardTitle>
          <CardDescription>{t("referralDisabledNotice")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("referralDisabledDetail")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            {t("referralProgram")}
          </CardTitle>
          <CardDescription>{t("referralDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Referral code */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              {t("yourReferralCode")}
            </label>
            <div className="flex gap-2">
              <Input
                value={referralCode}
                readOnly
                className="bg-background/50 font-mono font-bold tracking-wider"
              />
              <Button onClick={copyCode} variant="secondary" title={t("copyCode")}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Referral link */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              {t("yourReferralLink")}
            </label>
            <div className="flex gap-2">
              <Input value={referralLink} readOnly className="bg-background/50 text-xs" />
              <Button onClick={copyLink} variant="secondary" title={t("copyLink")}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button onClick={shareLink} className="bg-gradient-primary" title={t("shareLink")}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4">
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-2xl font-bold text-primary">{referrals.length}</p>
              <p className="text-xs text-muted-foreground">{t("signupsViaCode")}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-2xl font-bold text-green-500">{completedReferrals.length}</p>
              <p className="text-xs text-muted-foreground">{t("confirmed")}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-2xl font-bold text-accent">{unclaimedRewards.length * 50}</p>
              <p className="text-xs text-muted-foreground">{t("creditsToCollect")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("yourReferrals")}
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
                        {formatTz(referral.created_at, "dd MMM yyyy", { timezone: tz, language })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {referral.status === "completed" ? (
                      referral.reward_claimed ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {t("claimed")}
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => claimReward(referral.id)}
                          className="bg-gradient-primary"
                        >
                          <Gift className="w-3 h-3 mr-1" />
                          +50
                        </Button>
                      )
                    ) : (
                      <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                        {t("pending")}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <ReferralShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        referralLink={referralLink}
        referralCode={referralCode}
      />
    </div>
  );
};

export default ReferralSection;
