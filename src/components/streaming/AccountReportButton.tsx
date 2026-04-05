import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

interface AccountReportButtonProps {
  reportedUserId: string;
  reportedUserName: string;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default" | "icon";
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harcèlement" },
  { value: "fake_profile", label: "Faux profil" },
  { value: "inappropriate", label: "Contenu inapproprié" },
  { value: "other", label: "Autre" },
];

export const AccountReportButton = ({
  reportedUserId,
  reportedUserName,
  variant = "ghost",
  size = "sm",
}: AccountReportButtonProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("inappropriate");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReport = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Connexion requise", variant: "destructive" });
      return;
    }

    if (user.id === reportedUserId) {
      toast({ title: "Vous ne pouvez pas vous signaler vous-même", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("account_reports").insert({
      reported_user_id: reportedUserId,
      reporter_id: user.id,
      reason,
      details: details.trim() || null,
    });

    if (error?.code === "23505") {
      toast({ title: "Déjà signalé", description: "Vous avez déjà signalé ce compte." });
    } else if (error) {
      toast({ title: "Erreur", description: "Impossible de signaler", variant: "destructive" });
    } else {
      toast({ title: "Signalement envoyé", description: `${reportedUserName} a été signalé.` });

      // Check if auto-warning threshold is reached
      const { count } = await supabase
        .from("account_reports")
        .select("id", { count: "exact", head: true })
        .eq("reported_user_id", reportedUserId);

      const { data: settings } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "account_report_auto_warning_threshold")
        .single();

      const autoThreshold = (settings?.value as any)?.value || 100;
      if (count && count >= autoThreshold) {
        // Auto-create warning
        await supabase.from("account_warnings").insert({
          user_id: reportedUserId,
          warning_message: `Votre compte a reçu ${count} signalements. Veuillez respecter les règles de la communauté sous peine de bannissement.`,
          is_automatic: true,
        });
      }
    }

    setLoading(false);
    setOpen(false);
    setDetails("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant} className="text-destructive hover:bg-destructive/10">
          <Flag className="w-4 h-4 mr-1" />
          Signaler
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signaler {reportedUserName}</DialogTitle>
          <DialogDescription>
            Ce signalement sera examiné par notre équipe de modération.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REPORT_REASONS.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Détails supplémentaires (optionnel)..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="destructive" onClick={handleReport} disabled={loading}>
            {loading ? "Envoi..." : "Signaler"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
