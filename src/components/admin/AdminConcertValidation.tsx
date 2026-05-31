import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Music, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { formatTz } from "@/lib/datetime";
import { useUiPreferences } from "@/hooks/useUiPreferences";
import { useLanguage } from "@/contexts/LanguageContext";

interface PendingConcert {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  ticket_price: number;
  cover_image_url: string | null;
  artist_id: string;
  approval_status: string;
  artist_name?: string;
}

const AdminConcertValidation = () => {
  const { toast } = useToast();
  const { prefs } = useUiPreferences();
  const { language, t } = useLanguage();
  const [items, setItems] = useState<PendingConcert[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("artist_concerts")
      .select("*")
      .in("approval_status", ["pending", "rejected"])
      .order("created_at", { ascending: false });
    const list = (data as any[]) || [];
    if (list.length) {
      const ids = Array.from(new Set(list.map((c) => c.artist_id)));
      const { data: profiles } = await supabase.rpc("get_display_profiles", { user_ids: ids });
      const map = new Map((profiles as any[] || []).map((p) => [p.id, p.full_name]));
      list.forEach((c) => (c.artist_name = map.get(c.artist_id) || t("cvalArtistFallback")));
    }
    setItems(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const act = async (id: string, approve: boolean) => {
    setBusy(id);
    const { data, error } = await supabase.rpc("admin_approve_artist_concert", {
      p_concert_id: id,
      p_approve: approve,
      p_reason: approve ? null : (reasons[id] || null),
    });
    setBusy(null);
    const r = data as any;
    if (error || !r?.success) {
      toast({ title: t("commonError"), description: error?.message || r?.error || t("cvalFailure"), variant: "destructive" });
      return;
    }
    toast({ title: approve ? t("cvalApproved") : t("cvalRejectedToast") });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Music className="w-5 h-5 text-primary" /> {t("cvalTitle")}</CardTitle>
        <CardDescription>{t("cvalDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> {t("cvalLoading")}</div>
        ) : items.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground py-10">{t("cvalEmpty")}</p>
        ) : (
          <div className="space-y-3">
            {items.map((c) => (
              <div key={c.id} className="border rounded-lg p-4 flex flex-col sm:flex-row gap-4">
                <div
                  className="w-full sm:w-32 h-24 rounded bg-muted bg-cover bg-center shrink-0"
                  style={c.cover_image_url ? { backgroundImage: `url(${c.cover_image_url})` } : undefined}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{c.title}</h3>
                    <Badge variant={c.approval_status === "rejected" ? "destructive" : "outline"}>
                      {c.approval_status === "rejected" ? t("cvalRejected") : t("cvalPending")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("cvalBy")} <strong>{c.artist_name}</strong> • {formatTz(c.scheduled_date, "dd MMM yyyy HH:mm", { timezone: prefs.timezone, language })}
                    • {Number(c.ticket_price)} {t("cvalCreditsLabel")}
                  </p>
                  {c.description && <p className="text-sm mt-1 line-clamp-2">{c.description}</p>}
                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder={t("cvalReasonPlaceholder")}
                      value={reasons[c.id] || ""}
                      onChange={(e) => setReasons({ ...reasons, [c.id]: e.target.value })}
                      className="h-9 sm:max-w-xs"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-500 hover:bg-green-600" disabled={busy === c.id} onClick={() => act(c.id, true)}>
                        <CheckCircle className="w-4 h-4 mr-1" /> {t("cvalApprove")}
                      </Button>
                      <Button size="sm" variant="destructive" disabled={busy === c.id} onClick={() => act(c.id, false)}>
                        <XCircle className="w-4 h-4 mr-1" /> {t("cvalReject")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminConcertValidation;
