import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings, Coins, CreditCard, Save } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Json } from "@/integrations/supabase/types";

interface WelcomeConfig {
  welcome_credits: number;
}

interface PricingConfig {
  enabled: boolean;
}

const PlatformConfigManager = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [welcomeConfig, setWelcomeConfig] = useState<WelcomeConfig>({ welcome_credits: 100 });
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>({ enabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [welcomeRes, pricingRes] = await Promise.all([
      supabase.from("platform_settings").select("value").eq("key", "welcome_config").single(),
      supabase.from("platform_settings").select("value").eq("key", "pricing_config").single(),
    ]);
    if (welcomeRes.data?.value) {
      const val = welcomeRes.data.value as Record<string, unknown>;
      setWelcomeConfig({ welcome_credits: (val.welcome_credits as number) ?? 100 });
    }
    if (pricingRes.data?.value) {
      const val = pricingRes.data.value as Record<string, unknown>;
      setPricingConfig({ enabled: (val.enabled as boolean) ?? true });
    }
    setLoading(false);
  };

  const saveAll = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const welcomeJson: Json = { welcome_credits: welcomeConfig.welcome_credits };
    const pricingJson: Json = { enabled: pricingConfig.enabled };

    const [r1, r2] = await Promise.all([
      supabase.from("platform_settings").upsert(
        { key: "welcome_config", value: welcomeJson, updated_at: now },
        { onConflict: "key" }
      ),
      supabase.from("platform_settings").upsert(
        { key: "pricing_config", value: pricingJson, updated_at: now },
        { onConflict: "key" }
      ),
    ]);

    if (r1.error || r2.error) {
      toast({ title: t("error"), description: (r1.error || r2.error)?.message, variant: "destructive" });
    } else {
      toast({ title: t("adminPlatformConfigSaved") });
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">{t("loading")}...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> {t("adminPlatformConfigTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("adminPlatformConfigDesc")}</p>
      </div>

      {/* Welcome Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Coins className="w-5 h-5" /> {t("adminWelcomeCreditsTitle")}</CardTitle>
          <CardDescription>{t("adminWelcomeCreditsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-lg space-y-2">
            <Label className="text-base font-medium">{t("adminWelcomeCreditsAmount")}</Label>
            <p className="text-sm text-muted-foreground">{t("adminWelcomeCreditsAmountDesc")}</p>
            <Input
              type="number"
              value={welcomeConfig.welcome_credits}
              onChange={(e) => setWelcomeConfig({ welcome_credits: parseInt(e.target.value) || 0 })}
              className="w-32"
              min={0}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing Page Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> {t("adminPricingToggleTitle")}</CardTitle>
          <CardDescription>{t("adminPricingToggleDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <Label className="text-base font-medium">{t("adminPricingEnable")}</Label>
              <p className="text-sm text-muted-foreground">{t("adminPricingEnableDesc")}</p>
            </div>
            <Switch
              checked={pricingConfig.enabled}
              onCheckedChange={(v) => setPricingConfig({ enabled: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveAll} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? t("adminReferralSaving") : t("adminPlatformConfigSaveBtn")}
      </Button>
    </div>
  );
};

export default PlatformConfigManager;
