/**
 * Admin: AdminSponsorManager — modération des sponsors et de leurs annonces.
 *
 * Validation des demandes sponsor, gestion des tiers de prix (voir
 * `SponsorPriceTiersManager`), diffusion programmée des pubs in-stream
 * (`SponsorAdBroadcast`). Les actions sont journalisées dans `admin_logs`.
 *
 * @access  role=admin
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Upload, CheckCircle2, XCircle, Loader2, DollarSign, Eye, Clock, CreditCard } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SponsorPriceTiersManager } from "./SponsorPriceTiersManager";

export const AdminSponsorManager = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [requests, setRequests] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceDialog, setPriceDialog] = useState<{ id: string } | null>(null);
  const [price, setPrice] = useState("");
  const [uploadDialog, setUploadDialog] = useState<{ event_type: string; event_id: string } | null>(null);
  const [adTitle, setAdTitle] = useState("");
  const [adFile, setAdFile] = useState<File | null>(null);
  const [adDuration, setAdDuration] = useState("30");
  const [working, setWorking] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user)); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: r }, { data: a }] = await Promise.all([
      supabase.from("sponsor_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("sponsor_ad_videos").select("*").order("created_at", { ascending: false }),
    ]);
    setRequests(r || []);
    setAds(a || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openPriceDialog = async (req: any) => {
    setPriceDialog({ id: req.id });
    // Auto-suggest from configured tier (if duration is known on the request).
    let suggested = "";
    if (req.media_duration_seconds) {
      const { data } = await (supabase as any).rpc("get_sponsor_default_price", { p_duration_seconds: req.media_duration_seconds });
      if (data) suggested = String(data);
    }
    setPrice(suggested);
  };

  const setPriceConfirm = async () => {
    if (!priceDialog || !price) return;
    const p = parseFloat(price);
    if (p <= 0) return;
    setWorking(true);
    const { data, error } = await (supabase as any).rpc("admin_set_sponsor_price", { p_request_id: priceDialog.id, p_price_credits: p });
    setWorking(false);
    if (error || !data?.success) {
      toast({ title: "Erreur", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Prix envoyé au demandeur" });
    setPriceDialog(null); setPrice(""); load();
  };

  const approve = async (id: string) => {
    const { data, error } = await (supabase as any).rpc("admin_approve_sponsor", { p_request_id: id });
    if (error || !data?.success) { toast({ title: "Erreur", description: error?.message || data?.error, variant: "destructive" }); return; }
    toast({ title: "Sponsor approuvé" }); load();
  };

  const reject = async (id: string) => {
    const reason = window.prompt("Raison du rejet ?") || "";
    const { data, error } = await (supabase as any).rpc("admin_reject_sponsor", { p_request_id: id, p_reason: reason });
    if (error || !data?.success) { toast({ title: "Erreur", description: error?.message || data?.error, variant: "destructive" }); return; }
    toast({ title: "Sponsor rejeté" }); load();
  };

  const uploadAd = async () => {
    if (!uploadDialog || !adFile || !adTitle || !user) return;
    setWorking(true);
    try {
      const ext = adFile.name.split(".").pop();
      const path = `admin-ads/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("sponsor-media").upload(path, adFile);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("sponsor-media").getPublicUrl(path);
      const { error } = await supabase.from("sponsor_ad_videos").insert({
        event_type: uploadDialog.event_type, event_id: uploadDialog.event_id,
        title: adTitle, video_url: pub.publicUrl, duration_seconds: parseInt(adDuration) || 30,
        uploaded_by: user.id,
      });
      if (error) throw error;
      toast({ title: "Vidéo finale téléversée" });
      setUploadDialog(null); setAdTitle(""); setAdFile(null); load();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setWorking(false); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("sponsor_ad_videos").update({ is_active: active }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <SponsorPriceTiersManager />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5" /> Demandes de sponsoring</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading && <Loader2 className="w-5 h-5 animate-spin mx-auto" />}
          {!loading && requests.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune demande.</p>}
          {requests.map((r) => (
            <div key={r.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="mb-1">{r.event_type}</Badge>
                  {r.media_duration_seconds ? <Badge variant="outline" className="ml-1 mb-1">{r.media_duration_seconds}s</Badge> : null}
                  <p className="text-sm font-medium">{r.description}</p>
                  {(() => {
                    const map: Record<string, { key: string; cls: string; Icon: any }> = {
                      pending: { key: "sponsorStatusPending", cls: "bg-yellow-500/20 text-yellow-700", Icon: Clock },
                      awaiting_payment: { key: "sponsorStatusAwaitingPayment", cls: "bg-orange-500/20 text-orange-700", Icon: CreditCard },
                      paid: { key: "sponsorStatusPaid", cls: "bg-blue-500/20 text-blue-700", Icon: Clock },
                      approved: { key: "sponsorStatusApproved", cls: "bg-green-500/20 text-green-700", Icon: CheckCircle2 },
                      rejected: { key: "sponsorStatusRejected", cls: "bg-red-500/20 text-red-700", Icon: XCircle },
                      cancelled: { key: "sponsorStatusCancelled", cls: "bg-gray-500/20 text-gray-700", Icon: XCircle },
                      active: { key: "sponsorStatusActive", cls: "bg-green-500/20 text-green-700", Icon: CheckCircle2 },
                      expired: { key: "sponsorStatusExpired", cls: "bg-gray-500/20 text-gray-700", Icon: XCircle },
                    };
                    const v = map[r.status] || map.pending;
                    return <Badge className={`mt-1 ${v.cls}`}><v.Icon className="w-3 h-3 mr-1" />{t(v.key)}</Badge>;
                  })()}
                </div>
                <a href={r.media_url} target="_blank" rel="noopener" className="text-xs text-primary underline">Voir le média</a>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => openPriceDialog(r)}>
                      <DollarSign className="w-3 h-3 mr-1" /> Fixer prix
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => reject(r.id)}>Rejeter</Button>
                  </>
                )}
                {r.status === "paid" && (
                  <>
                    <Button size="sm" onClick={() => approve(r.id)}><CheckCircle2 className="w-3 h-3 mr-1" /> Approuver</Button>
                    <Button size="sm" variant="destructive" onClick={() => reject(r.id)}>Rembourser & rejeter</Button>
                  </>
                )}
                {r.status === "approved" && (
                  <Button size="sm" variant="outline" onClick={() => setUploadDialog({ event_type: r.event_type, event_id: r.event_id })}>
                    <Upload className="w-3 h-3 mr-1" /> Téléverser vidéo finale
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Vidéos finales de publicité</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {ads.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune vidéo finale.</p>}
          {ads.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{a.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{a.event_type}</Badge>
                  <span><Eye className="w-3 h-3 inline" /> {a.play_count} diffusions</span>
                  <span>{a.duration_seconds}s</span>
                </div>
              </div>
              <Switch checked={a.is_active} onCheckedChange={(v) => toggleActive(a.id, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!priceDialog} onOpenChange={(o) => !o && setPriceDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fixer le prix du sponsoring</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            Le prix par défaut est calculé automatiquement à partir de la durée de la pub (voir « Tarifs sponsors par durée »). Tu peux le modifier ici pour cet évènement.
          </p>
          <Label>Prix (en crédits)</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="100" />
          <Button onClick={setPriceConfirm} disabled={working}>
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer la demande de paiement"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!uploadDialog} onOpenChange={(o) => !o && setUploadDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Téléverser une vidéo finale</DialogTitle></DialogHeader>
          <Label>Titre</Label>
          <Input value={adTitle} onChange={(e) => setAdTitle(e.target.value)} />
          <Label>Vidéo</Label>
          <Input type="file" accept="video/*" onChange={(e) => setAdFile(e.target.files?.[0] || null)} />
          <Label>Durée (secondes)</Label>
          <Input type="number" value={adDuration} onChange={(e) => setAdDuration(e.target.value)} />
          <Button onClick={uploadAd} disabled={working}>
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : "Téléverser"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSponsorManager;
