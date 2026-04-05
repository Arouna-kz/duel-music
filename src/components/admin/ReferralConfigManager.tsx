import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Users, Gift, Save } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Json } from "@/integrations/supabase/types";

interface ReferralConfig {
  enabled: boolean;
  credits_per_referral: number;
}

const ReferralConfigManager = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [config, setConfig] = useState<ReferralConfig>({ enabled: true, credits_per_referral: 50 });
  const [stats, setStats] = useState({ total: 0, completed: 0, totalCredits: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [configRes, referralsRes] = await Promise.all([
      supabase.from("platform_settings").select("value").eq("key", "referral_config").single(),
      supabase.from("referrals").select("status, reward_claimed"),
    ]);
    if (configRes.data?.value) {
      const val = configRes.data.value as Record<string, unknown>;
      setConfig({ enabled: val.enabled as boolean ?? true, credits_per_referral: val.credits_per_referral as number ?? 50 });
    }
    const referrals = referralsRes.data || [];
    const completed = referrals.filter(r => r.status === "completed");
    const claimed = completed.filter(r => r.reward_claimed);
    setStats({ total: referrals.length, completed: completed.length, totalCredits: claimed.length * (config.credits_per_referral || 50) });
    setLoading(false);
  };

  const saveConfig = async () => {
    setSaving(true);
    const configJson: Json = { enabled: config.enabled, credits_per_referral: config.credits_per_referral };
    const { error } = await supabase.from("platform_settings").upsert(
      { key: "referral_config", value: configJson, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (error) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("adminReferralSaved") });
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">{t("loading")}...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> {t("adminReferralTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("adminReferralDesc")}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground">{t("adminReferralTotal")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-500">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">{t("adminReferralCompleted")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-accent">{stats.totalCredits}</p>
            <p className="text-sm text-muted-foreground">{t("adminReferralCreditsDistributed")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gift className="w-5 h-5" /> {t("adminReferralConfig")}</CardTitle>
          <CardDescription>{t("adminReferralConfigDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <Label className="text-base font-medium">{t("adminReferralEnable")}</Label>
              <p className="text-sm text-muted-foreground">{t("adminReferralEnableDesc")}</p>
            </div>
            <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
          </div>
          <div className="p-4 bg-muted/30 rounded-lg space-y-2">
            <Label className="text-base font-medium">{t("adminReferralCreditsPerRef")}</Label>
            <p className="text-sm text-muted-foreground">{t("adminReferralCreditsPerRefDesc")}</p>
            <Input type="number" value={config.credits_per_referral} onChange={(e) => setConfig({ ...config, credits_per_referral: parseInt(e.target.value) || 0 })} className="w-32" min={0} />
          </div>
          <Button onClick={saveConfig} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? t("adminReferralSaving") : t("adminReferralSaveBtn")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralConfigManager;
