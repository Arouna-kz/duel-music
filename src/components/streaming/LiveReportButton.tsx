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

interface LiveReportButtonProps {
  liveId: string;
  viewerCount: number;
  isArtist: boolean;
  onAutoStop?: () => void;
}

const REPORT_REASONS = [
  { value: "inappropriate", label: "Contenu inapproprié" },
  { value: "violence", label: "Violence" },
  { value: "harassment", label: "Harcèlement" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Autre" },
];

export const LiveReportButton = ({ liveId, viewerCount, isArtist, onAutoStop }: LiveReportButtonProps) => {
  const { toast } = useToast();
  const [hasReported, setHasReported] = useState(false);
  const [reportCount, setReportCount] = useState(0);
  const [reason, setReason] = useState("inappropriate");
  const [open, setOpen] = useState(false);
  const [threshold, setThreshold] = useState(100);
  const [stopPercentage, setStopPercentage] = useState(75);
  const [warningIssued, setWarningIssued] = useState(false);

  // Load settings and report count
  useEffect(() => {
    const loadSettings = async () => {
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["live_report_viewer_threshold", "live_report_stop_percentage"]);

      settings?.forEach((s: any) => {
        if (s.key === "live_report_viewer_threshold") setThreshold(s.value.value);
        if (s.key === "live_report_stop_percentage") setStopPercentage(s.value.value);
      });
    };

    const loadReports = async () => {
      const { count } = await supabase
        .from("live_reports")
        .select("id", { count: "exact", head: true })
        .eq("live_id", liveId);
      setReportCount(count || 0);

      // Check if current user already reported
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

    // Realtime report count
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
    if (viewerCount >= threshold && reportCount > 0) {
      const percentage = (reportCount / viewerCount) * 100;
      if (percentage >= stopPercentage && !warningIssued) {
        setWarningIssued(true);
        // Send warning, auto-stop after 5 minutes
        toast({
          title: "⚠️ Avertissement",
          description: `Ce live a reçu trop de signalements. Il sera arrêté dans 5 minutes si les signalements persistent.`,
          variant: "destructive",
        });
        setTimeout(() => {
          onAutoStop?.();
        }, 5 * 60 * 1000); // 5 minutes
      }
    }
  }, [reportCount, viewerCount, threshold, stopPercentage, warningIssued, onAutoStop, toast]);

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
      toast({ title: "Déjà signalé", description: "Vous avez déjà signalé ce live." });
    } else if (error) {
      toast({ title: "Erreur", description: "Impossible de signaler", variant: "destructive" });
    } else {
      setHasReported(true);
      toast({ title: "Signalement envoyé", description: "Merci pour votre signalement." });
    }
    setOpen(false);
  };

  // Only show if viewer threshold met and not the artist
  if (isArtist || viewerCount < threshold) return null;

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
          <DialogTitle>Signaler ce live</DialogTitle>
          <DialogDescription>
            Indiquez la raison du signalement. Si suffisamment de spectateurs signalent, le live sera arrêté.
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
