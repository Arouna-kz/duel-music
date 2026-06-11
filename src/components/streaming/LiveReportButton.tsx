/**
 * LiveReportButton
 * ----------------
 * Bouton de signalement contextuel affiché pendant un live/concert/duel.
 *
 * Visibilité conditionnée par `platform_settings.report_config` :
 *  - feature flag par type de stream (`live`, `concert`, `duel`)
 *  - seuil minimum de spectateurs avant affichage
 *
 * Insère une ligne dans `live_reports` (déduplique par reporter+stream).
 * Au-delà de 75% de spectateurs ayant signalé, un trigger côté DB stoppe
 * automatiquement le live (voir mem://features/moderation-reporting-system).
 *
 * @prop streamId    - id du concert / duel / live
 * @prop streamType  - 'concert' | 'duel' | 'live'
 * @prop viewerCount - nombre courant de spectateurs (alimente le seuil)
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ReportStreamType = "live" | "concert" | "duel";

interface LiveReportButtonProps {
  /** Stream id (live id, concert id or duel id). */
  liveId: string;
  viewerCount: number;
  /** True if current user hosts/owns the stream and should not see the button. */
  isArtist: boolean;
  /** Defaults to "live" for backward compatibility. */
  streamType?: ReportStreamType;
  onAutoStop?: () => void;
}

const REPORT_REASONS = [
  { value: "inappropriate", label: "Contenu inapproprié" },
  { value: "violence", label: "Violence" },
  { value: "harassment", label: "Harcèlement" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Autre" },
];

interface ReportConfig {
  enabled_live: boolean;
  enabled_concert: boolean;
  enabled_duel: boolean;
  viewer_threshold: number;
  stop_percentage: number;
}

const DEFAULT_REPORT_CONFIG: ReportConfig = {
  enabled_live: true,
  enabled_concert: true,
  enabled_duel: true,
  viewer_threshold: 5,
  stop_percentage: 75,
};

export const LiveReportButton = ({
  liveId,
  viewerCount,
  isArtist,
  streamType = "live",
  onAutoStop,
}: LiveReportButtonProps) => {
  const { toast } = useToast();
  const [hasReported, setHasReported] = useState(false);
  const [reportCount, setReportCount] = useState(0);
  const [reason, setReason] = useState("inappropriate");
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<ReportConfig>(DEFAULT_REPORT_CONFIG);
  const [warningIssued, setWarningIssued] = useState(false);

  // Load merged config (new live_report_config + legacy keys as fallback)
  useEffect(() => {
    const loadSettings = async () => {
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", [
          "live_report_config",
          "live_report_viewer_threshold",
          "live_report_stop_percentage",
        ]);

      const merged: ReportConfig = { ...DEFAULT_REPORT_CONFIG };
      settings?.forEach((s: any) => {
        if (s.key === "live_report_config" && s.value && typeof s.value === "object") {
          Object.assign(merged, {
            enabled_live: s.value.enabled_live ?? merged.enabled_live,
            enabled_concert: s.value.enabled_concert ?? merged.enabled_concert,
            enabled_duel: s.value.enabled_duel ?? merged.enabled_duel,
            viewer_threshold: Number(s.value.viewer_threshold ?? merged.viewer_threshold),
            stop_percentage: Number(s.value.stop_percentage ?? merged.stop_percentage),
          });
        }
        if (s.key === "live_report_viewer_threshold" && typeof s.value?.value === "number") {
          merged.viewer_threshold = s.value.value;
        }
        if (s.key === "live_report_stop_percentage" && typeof s.value?.value === "number") {
          merged.stop_percentage = s.value.value;
        }
      });
      setConfig(merged);
    };

    const loadReports = async () => {
      const { count } = await supabase
        .from("live_reports")
        .select("id", { count: "exact", head: true })
        .eq("live_id", liveId);
      setReportCount(count || 0);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("live_reports")
          .select("id")
          .eq("live_id", liveId)
          .eq("user_id", user.id)
          .maybeSingle();
        setHasReported(!!data);
      }
    };

    loadSettings();
    loadReports();

    const channel = supabase
      .channel(`live-reports-${liveId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "live_reports",
        filter: `live_id=eq.${liveId}`,
      }, () => {
        setReportCount(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [liveId]);

  // Check auto-stop condition
  useEffect(() => {
    if (viewerCount >= config.viewer_threshold && reportCount > 0) {
      const percentage = (reportCount / Math.max(1, viewerCount)) * 100;
      if (percentage >= config.stop_percentage && !warningIssued) {
        setWarningIssued(true);
        toast({
          title: "⚠️ Avertissement",
          description: "Cet événement a reçu trop de signalements. Il sera arrêté dans 5 minutes si les signalements persistent.",
          variant: "destructive",
        });
        setTimeout(() => {
          onAutoStop?.();
        }, 5 * 60 * 1000);
      }
    }
  }, [reportCount, viewerCount, config, warningIssued, onAutoStop, toast]);

  const handleReport = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Connexion requise", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("live_reports").insert({
      live_id: liveId,
      user_id: user.id,
      reason,
    });

    if (error?.code === "23505") {
      toast({ title: "Déjà signalé", description: "Vous avez déjà signalé cet événement." });
    } else if (error) {
      toast({ title: "Erreur", description: "Impossible de signaler", variant: "destructive" });
    } else {
      setHasReported(true);
      toast({ title: "Signalement envoyé", description: "Merci pour votre signalement." });
    }
    setOpen(false);
  };

  // Hide if disabled by admin for this stream type, or current user is the host.
  const enabledForType =
    streamType === "live"
      ? config.enabled_live
      : streamType === "concert"
      ? config.enabled_concert
      : config.enabled_duel;

  if (isArtist || !enabledForType || viewerCount < config.viewer_threshold) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          disabled={hasReported}
          className="text-destructive hover:bg-destructive/10"
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          {hasReported ? "Signalé" : "Signaler"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signaler cet événement</DialogTitle>
          <DialogDescription>
            Indiquez la raison du signalement. Si suffisamment de spectateurs signalent, l'événement sera arrêté.
          </DialogDescription>
        </DialogHeader>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {REPORT_REASONS.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="destructive" onClick={handleReport}>Signaler</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
