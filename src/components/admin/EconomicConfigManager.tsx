import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, DollarSign, AlertTriangle, Gift, Vote, Megaphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";

interface SectionConfig {
  platform_pct: number;
  artist_pct?: number;
  artists_pct?: number;
  manager_pct?: number;
  winner_share_pct?: number;
}

interface SimpleSection {
  platform_pct: number;
}

interface SponsorConcertSection {
  enabled: boolean;
  platform_pct: number;
  artist_pct: number;
}

interface SponsorDuelSection {
  enabled: boolean;
  platform_pct: number;
  artists_pct: number;
  manager_pct: number;
  winner_share_pct: number;
}

interface DedicationSection { platform_pct: number; artist_pct: number; min_price_credits: number }

interface EconomicConfig {
  credit_value_usd: number;
  concert_ticket: SectionConfig;
  concert_replay: SectionConfig;
  duel_ticket: SectionConfig;
  duel_replay: SectionConfig;
  gift: SimpleSection;
  vote: SimpleSection;
  dedication: DedicationSection;
  sponsor_concert: SponsorConcertSection;
  sponsor_duel: SponsorDuelSection;
  withdrawal: {
    artist_fee_pct: number;
    manager_fee_pct: number;
    auto_process: boolean;
    bank_required_min_credits: number;
  };
  recharge: { fee_pct: number };
}

const DEFAULTS: EconomicConfig = {
  credit_value_usd: 0.01,
  concert_ticket: { platform_pct: 20, artist_pct: 80 },
  concert_replay: { platform_pct: 30, artist_pct: 70 },
  duel_ticket: { platform_pct: 20, artists_pct: 70, manager_pct: 10, winner_share_pct: 50 },
  duel_replay: { platform_pct: 30, artists_pct: 60, manager_pct: 10, winner_share_pct: 50 },
  gift: { platform_pct: 20 },
  vote: { platform_pct: 20 },
  dedication: { platform_pct: 20, artist_pct: 80, min_price_credits: 10 },
  sponsor_concert: { enabled: false, platform_pct: 100, artist_pct: 0 },
  sponsor_duel: { enabled: false, platform_pct: 100, artists_pct: 0, manager_pct: 0, winner_share_pct: 50 },
  withdrawal: { artist_fee_pct: 5, manager_fee_pct: 5, auto_process: false, bank_required_min_credits: 5000 },
  recharge: { fee_pct: 0 },
};

const EconomicConfigManager = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [config, setConfig] = useState<EconomicConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "economic_config")
        .maybeSingle();
      if (data?.value) {
        const v = data.value as Partial<EconomicConfig>;
        setConfig({
          ...DEFAULTS,
          ...v,
          gift: { platform_pct: v.gift?.platform_pct ?? DEFAULTS.gift.platform_pct },
          vote: { platform_pct: v.vote?.platform_pct ?? DEFAULTS.vote.platform_pct },
          dedication: { ...DEFAULTS.dedication, ...((v as any).dedication || {}) },
          sponsor_concert: { ...DEFAULTS.sponsor_concert, ...(v.sponsor_concert || {}) },
          sponsor_duel: { ...DEFAULTS.sponsor_duel, ...(v.sponsor_duel || {}) },
          withdrawal: { ...DEFAULTS.withdrawal, ...((v as any).withdrawal || {}) },
          recharge: { ...DEFAULTS.recharge, ...((v as any).recharge || {}) },
        });
      }
      setLoading(false);
    })();
  }, []);

  const updateSection = <K extends keyof EconomicConfig>(key: K, value: EconomicConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): string | null => {
    const checks: Array<[string, number]> = [
      [t("ecoConcertTicket"), (config.concert_ticket.platform_pct || 0) + (config.concert_ticket.artist_pct || 0)],
      [t("ecoConcertReplay"), (config.concert_replay.platform_pct || 0) + (config.concert_replay.artist_pct || 0)],
      [t("ecoDuelTicket"), (config.duel_ticket.platform_pct || 0) + (config.duel_ticket.artists_pct || 0) + (config.duel_ticket.manager_pct || 0)],
      [t("ecoDuelReplay"), (config.duel_replay.platform_pct || 0) + (config.duel_replay.artists_pct || 0) + (config.duel_replay.manager_pct || 0)],
    ];
    for (const [k, v] of checks) {
      if (Math.abs(v - 100) > 0.01) return `${k} : ${v}% (≠ 100%)`;
    }
    if (config.gift.platform_pct < 0 || config.gift.platform_pct > 100) return `${t("ecoGift")} : 0–100%`;
    if (config.vote.platform_pct < 0 || config.vote.platform_pct > 100) return `${t("ecoVote")} : 0–100%`;
    {
      const sum = (config.dedication.platform_pct || 0) + (config.dedication.artist_pct || 0);
      if (Math.abs(sum - 100) > 0.01) return `${t("ecoDedicationErr")} : ${sum}% (≠ 100%)`;
      if ((config.dedication.min_price_credits || 0) < 1) return t("ecoDedicationMinErr");
    }
    if (config.sponsor_concert.enabled) {
      const sum = (config.sponsor_concert.platform_pct || 0) + (config.sponsor_concert.artist_pct || 0);
      if (Math.abs(sum - 100) > 0.01) return `${t("ecoSponsorConcertErr")} : ${sum}% (≠ 100%)`;
    }
    if (config.sponsor_duel.enabled) {
      const sum = (config.sponsor_duel.platform_pct || 0) + (config.sponsor_duel.artists_pct || 0) + (config.sponsor_duel.manager_pct || 0);
      if (Math.abs(sum - 100) > 0.01) return `${t("ecoSponsorDuelErr")} : ${sum}% (≠ 100%)`;
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast({ title: t("ecoSumError"), description: err, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("platform_settings").upsert({
      key: "economic_config",
      value: config as any,
      updated_by: user?.id,
    });
    if (error) {
      toast({ title: t("commonError"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("ecoSavedTitle"), description: t("ecoSavedDesc") });
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-8">{t("commonLoading")}</div>;

  const renderSection = (
    title: string,
    section: SectionConfig,
    keyName: keyof EconomicConfig,
    fields: Array<keyof SectionConfig>
  ) => {
    const total = (section.platform_pct || 0) + (section.artist_pct || 0) + (section.artists_pct || 0) + (section.manager_pct || 0);
    const validTotal = Math.abs(total - 100) < 0.01;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{title}</CardTitle>
            <Badge variant={validTotal ? "default" : "destructive"}>{total.toFixed(0)}%</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fields.map((f) => (
            <div key={f} className="space-y-1">
              <Label className="text-xs">{t(`ecoField_${f}`)}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={section[f] ?? 0}
                onChange={(e) => updateSection(keyName, { ...section, [f]: parseFloat(e.target.value) || 0 } as any)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const renderSimpleSection = (
    title: string,
    icon: React.ReactNode,
    section: SimpleSection,
    keyName: "gift" | "vote",
    description: string
  ) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <Badge variant="outline">
            {(100 - (section.platform_pct || 0)).toFixed(0)}% → {t("ecoArtist")}
          </Badge>
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">{t("ecoField_platform_pct")}</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            value={section.platform_pct ?? 0}
            onChange={(e) =>
              updateSection(keyName, { platform_pct: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("ecoArtistAuto")}</Label>
          <Input
            type="number"
            value={(100 - (section.platform_pct || 0)).toFixed(0)}
            readOnly
            className="bg-muted/50"
          />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            {t("ecoCreditValueTitle")}
          </CardTitle>
          <CardDescription>{t("ecoCreditValueDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 max-w-md">
            <Input
              type="number"
              step="0.001"
              min={0.0001}
              value={config.credit_value_usd}
              onChange={(e) => setConfig({ ...config, credit_value_usd: parseFloat(e.target.value) || 0.01 })}
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">USD / {t("creditUnit")}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("ecoExampleLabel")} : 100 {t("creditsUnit")} = {(100 * config.credit_value_usd).toFixed(2)} USD
          </p>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {renderSection(t("ecoConcertTicket"), config.concert_ticket, "concert_ticket", ["platform_pct", "artist_pct"])}
        {renderSection(t("ecoConcertReplay"), config.concert_replay, "concert_replay", ["platform_pct", "artist_pct"])}
        {renderSection(t("ecoDuelTicket"), config.duel_ticket, "duel_ticket", ["platform_pct", "artists_pct", "manager_pct", "winner_share_pct"])}
        {renderSection(t("ecoDuelReplay"), config.duel_replay, "duel_replay", ["platform_pct", "artists_pct", "manager_pct", "winner_share_pct"])}
        {renderSimpleSection(t("ecoGift"), <Gift className="w-4 h-4 text-pink-500" />, config.gift, "gift", t("ecoGiftHint"))}
        {renderSimpleSection(t("ecoVote"), <Vote className="w-4 h-4 text-purple-500" />, config.vote, "vote", t("ecoVoteHint"))}
      </div>

      {/* Dedication revenue split */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="w-4 h-4 text-pink-500" /> {t("ecoDedicationsTitle")}
            </CardTitle>
            <Badge variant={Math.abs((config.dedication.platform_pct + config.dedication.artist_pct) - 100) < 0.01 ? "default" : "destructive"}>
              {(config.dedication.platform_pct + config.dedication.artist_pct).toFixed(0)}%
            </Badge>
          </div>
          <CardDescription className="text-xs">{t("ecoDedicationsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("ecoPlatformPct")}</Label>
            <Input type="number" min={0} max={100}
              value={config.dedication.platform_pct}
              onChange={(e) => updateSection("dedication", { ...config.dedication, platform_pct: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("ecoArtistPct")}</Label>
            <Input type="number" min={0} max={100}
              value={config.dedication.artist_pct}
              onChange={(e) => updateSection("dedication", { ...config.dedication, artist_pct: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("ecoMinPriceCredits")}</Label>
            <Input type="number" min={1}
              value={config.dedication.min_price_credits}
              onChange={(e) => updateSection("dedication", { ...config.dedication, min_price_credits: parseFloat(e.target.value) || 1 })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-500" />
              {t("ecoSponsorTitle")}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {t("ecoSponsorDescNote")}
            </span>
          </div>
          <CardDescription className="text-xs">
            {t("ecoSponsorDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sponsor concert */}
          <div className="space-y-3 p-3 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{t("ecoSponsorConcert")}</p>
                <p className="text-xs text-muted-foreground">{t("ecoSponsorConcertParts")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={config.sponsor_concert.enabled ? "default" : "outline"}>
                  {config.sponsor_concert.enabled
                    ? `${(config.sponsor_concert.platform_pct + config.sponsor_concert.artist_pct).toFixed(0)}%`
                    : t("ecoOff")}
                </Badge>
                <Switch
                  checked={config.sponsor_concert.enabled}
                  onCheckedChange={(v) =>
                    updateSection("sponsor_concert", { ...config.sponsor_concert, enabled: v })
                  }
                />
              </div>
            </div>
            {config.sponsor_concert.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("ecoPlatformPct")}</Label>
                  <Input
                    type="number" min={0} max={100}
                    value={config.sponsor_concert.platform_pct}
                    onChange={(e) =>
                      updateSection("sponsor_concert", {
                        ...config.sponsor_concert,
                        platform_pct: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("ecoArtistPct")}</Label>
                  <Input
                    type="number" min={0} max={100}
                    value={config.sponsor_concert.artist_pct}
                    onChange={(e) =>
                      updateSection("sponsor_concert", {
                        ...config.sponsor_concert,
                        artist_pct: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sponsor duel */}
          <div className="space-y-3 p-3 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{t("ecoSponsorDuel")}</p>
                <p className="text-xs text-muted-foreground">{t("ecoSponsorDuelParts")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={config.sponsor_duel.enabled ? "default" : "outline"}>
                  {config.sponsor_duel.enabled
                    ? `${(config.sponsor_duel.platform_pct + config.sponsor_duel.artists_pct + config.sponsor_duel.manager_pct).toFixed(0)}%`
                    : t("ecoOff")}
                </Badge>
                <Switch
                  checked={config.sponsor_duel.enabled}
                  onCheckedChange={(v) =>
                    updateSection("sponsor_duel", { ...config.sponsor_duel, enabled: v })
                  }
                />
              </div>
            </div>
            {config.sponsor_duel.enabled && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("ecoPlatformPct")}</Label>
                  <Input
                    type="number" min={0} max={100}
                    value={config.sponsor_duel.platform_pct}
                    onChange={(e) =>
                      updateSection("sponsor_duel", {
                        ...config.sponsor_duel,
                        platform_pct: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("ecoArtistsPoolPct")}</Label>
                  <Input
                    type="number" min={0} max={100}
                    value={config.sponsor_duel.artists_pct}
                    onChange={(e) =>
                      updateSection("sponsor_duel", {
                        ...config.sponsor_duel,
                        artists_pct: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("ecoManagerPctLabel")}</Label>
                  <Input
                    type="number" min={0} max={100}
                    value={config.sponsor_duel.manager_pct}
                    onChange={(e) =>
                      updateSection("sponsor_duel", {
                        ...config.sponsor_duel,
                        manager_pct: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("ecoWinnerSharePctLabel")}</Label>
                  <Input
                    type="number" min={0} max={100}
                    value={config.sponsor_duel.winner_share_pct}
                    onChange={(e) =>
                      updateSection("sponsor_duel", {
                        ...config.sponsor_duel,
                        winner_share_pct: parseFloat(e.target.value) || 50,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ecoRechargeFeesTitle")}</CardTitle>
          <CardDescription>{t("ecoRechargeFeesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <div className="space-y-1">
            <Label className="text-xs">{t("ecoRechargeFeePct")}</Label>
            <Input
              type="number" min={0} max={100} step={0.1}
              value={config.recharge.fee_pct}
              onChange={(e) => updateSection("recharge", { fee_pct: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ecoWithdrawalFees")}</CardTitle>
          <CardDescription>{t("ecoWithdrawalDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="space-y-1">
              <Label className="text-xs">{t("ecoArtistFee")}</Label>
              <Input
                type="number" min={0} max={100}
                value={config.withdrawal.artist_fee_pct}
                onChange={(e) => updateSection("withdrawal", { ...config.withdrawal, artist_fee_pct: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("ecoManagerFee")}</Label>
              <Input
                type="number" min={0} max={100}
                value={config.withdrawal.manager_fee_pct}
                onChange={(e) => updateSection("withdrawal", { ...config.withdrawal, manager_fee_pct: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="pr-3">
              <Label className="text-sm font-medium">{t("ecoAutoWithdrawTitle")}</Label>
              <p className="text-xs text-muted-foreground">{t("ecoAutoWithdrawDesc")}</p>
            </div>
            <Switch
              checked={config.withdrawal.auto_process}
              onCheckedChange={(v) => updateSection("withdrawal", { ...config.withdrawal, auto_process: v })}
            />
          </div>

          <div className="space-y-1 max-w-md">
            <Label className="text-xs">{t("ecoBankRequiredMin")}</Label>
            <Input
              type="number" min={0} step={1}
              value={config.withdrawal.bank_required_min_credits}
              onChange={(e) => updateSection("withdrawal", { ...config.withdrawal, bank_required_min_credits: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">{t("ecoBankRequiredMinHint")}</p>
          </div>
        </CardContent>
      </Card>


      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">{t("ecoSumHint")}</p>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        <Save className="w-4 h-4 mr-2" />
        {saving ? t("commonSaving") : t("ecoSaveBtn")}
      </Button>
    </div>
  );
};

export default EconomicConfigManager;
