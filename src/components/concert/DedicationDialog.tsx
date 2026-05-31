import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, Wallet } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useNavigate } from "react-router-dom";

interface Props {
  concertId: string;
  artistName: string;
  concertType?: "artist_concert" | "artist_live";
  disabled?: boolean;
}

const DEFAULT_MIN = 10;

export const DedicationDialog = ({ concertId, artistName, concertType = "artist_concert", disabled }: Props) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { balance, isAuthenticated } = useWallet();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState<number>(DEFAULT_MIN);
  const [min, setMin] = useState<number>(DEFAULT_MIN);
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState<{ paid: number; delivered: number } | null>(null);
  const eventLabel = concertType === "artist_live" ? "live" : "concert";

  const loadExisting = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setExisting(null); return; }
    const { data } = await supabase
      .from("concert_dedications" as any)
      .select("status")
      .eq("fan_id", u.user.id)
      .eq("concert_id", concertId)
      .eq("concert_type", concertType);
    const list = (data as any[]) || [];
    setExisting({
      paid: list.filter((d) => d.status === "paid").length,
      delivered: list.filter((d) => d.status === "delivered").length,
    });
  };

  useEffect(() => {
    if (!open) return;
    supabase.from("platform_settings").select("value").eq("key", "economic_config").maybeSingle().then(({ data }) => {
      const m = Number((data?.value as any)?.dedication?.min_price_credits ?? DEFAULT_MIN);
      setMin(m);
      setPrice((p) => (p < m ? m : p));
    });
    loadExisting();
  }, [open]);

  const submit = async () => {
    if (!isAuthenticated) {
      toast({ title: "Connexion requise", description: "Connecte-toi pour envoyer une dédicace.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (message.trim().length < 3) {
      toast({ title: "Message trop court", description: "Écris au moins quelques mots.", variant: "destructive" });
      return;
    }
    if (price < min) {
      toast({ title: "Prix trop bas", description: `Minimum ${min} crédits.`, variant: "destructive" });
      return;
    }
    if (balance < price) {
      toast({ title: "Solde insuffisant", description: "Recharge ton portefeuille.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("purchase_concert_dedication", {
      p_concert_id: concertId,
      p_concert_type: concertType,
      p_message: message.trim(),
      p_price_credits: price,
    });
    setBusy(false);
    const r = data as any;
    if (error || !r?.success) {
      const code = r?.error || error?.message;
      const desc =
        code === "insufficient_balance" ? "Solde insuffisant." :
        code === "dedications_disabled" ? `Ce ${eventLabel} n'accepte pas les dédicaces.` :
        code === "concert_not_found" ? "Concert introuvable." :
        code === "live_not_found" ? "Live introuvable." :
        code || "Erreur";
      toast({ title: "Échec", description: desc, variant: "destructive" });
      return;
    }
    const total = Number(r?.total_for_event || 1);
    toast({
      title: "Dédicace envoyée !",
      description: total > 1
        ? `L'artiste sera notifié. Vous avez désormais ${total} demandes pour ce ${eventLabel}.`
        : `L'artiste sera notifié et l'interprétera pendant le ${eventLabel}.`,
    });
    setOpen(false);
    setMessage("");
    loadExisting();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2" disabled={disabled}>
          <Heart className="w-4 h-4 text-pink-500" /> Demander une dédicace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dédicace pour {artistName}</DialogTitle>
          <DialogDescription>
            Écris un message personnalisé. Le prix est libre (minimum {min} crédits) et sera débité de ton portefeuille.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {existing && (existing.paid + existing.delivered) > 0 && (
            <div className="rounded-md border border-pink-500/40 bg-pink-500/10 p-2.5 text-xs text-foreground/90">
              Vous avez déjà <strong>{existing.paid + existing.delivered}</strong> demande{(existing.paid + existing.delivered) > 1 ? "s" : ""} pour ce {eventLabel}
              {existing.delivered > 0 && ` (${existing.delivered} acceptée${existing.delivered > 1 ? "s" : ""} par l'artiste)`}
              {existing.paid > 0 && ` (${existing.paid} en attente)`}.
              Vous pouvez en envoyer autant que vous voulez — chaque dédicace sera interprétée pendant le {eventLabel}.
            </div>
          )}
          <div>
            <Label>Ton message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={400} placeholder="Salut, j'adore ta musique ! Peux-tu dire bonjour à..." />
            <p className="text-[10px] text-muted-foreground mt-1">{message.length}/400</p>
          </div>
          <div>
            <Label>Prix (crédits)</Label>
            <Input type="number" min={min} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="w-3.5 h-3.5" /> Solde actuel : <strong>{balance} crédits</strong>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Annuler</Button>
          <Button onClick={submit} disabled={busy} className="bg-gradient-primary">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Envoyer (${price} crédits)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DedicationDialog;
