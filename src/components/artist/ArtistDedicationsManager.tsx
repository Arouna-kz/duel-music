import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Heart, Loader2, Check } from "lucide-react";
import { formatTz } from "@/lib/datetime";
import { useUiPreferences } from "@/hooks/useUiPreferences";
import { useLanguage } from "@/contexts/LanguageContext";

interface Dedication {
  id: string;
  message: string;
  price_credits: number;
  status: string;
  paid_at: string;
  delivered_at: string | null;
  fan_id: string;
  concert_id: string;
  fan_name?: string;
  concert_title?: string;
}

interface Props { artistId: string }

export const ArtistDedicationsManager = ({ artistId }: Props) => {
  const { prefs } = useUiPreferences();
  const { language, t } = useLanguage();
  const [items, setItems] = useState<Dedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("concert_dedications" as any)
      .select("*")
      .eq("artist_id", artistId)
      .order("paid_at", { ascending: false });
    const list = (data as any[]) || [];
    if (list.length) {
      const fanIds = Array.from(new Set(list.map((d) => d.fan_id)));
      const concertIds = Array.from(new Set(list.filter((d) => d.concert_type !== "artist_live").map((d) => d.concert_id)));
      const liveIds = Array.from(new Set(list.filter((d) => d.concert_type === "artist_live").map((d) => d.concert_id)));
      const [{ data: profiles }, { data: concerts }, { data: lives }] = await Promise.all([
        supabase.rpc("get_display_profiles", { user_ids: fanIds }),
        concertIds.length ? supabase.from("artist_concerts").select("id,title").in("id", concertIds) : Promise.resolve({ data: [] as any[] }),
        liveIds.length ? supabase.from("artist_lives").select("id,title").in("id", liveIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const pmap = new Map((profiles as any[] || []).map((p) => [p.id, p.full_name]));
      const cmap = new Map<string, string>([
        ...((concerts as any[] || []).map((c) => [c.id, c.title] as [string, string])),
        ...((lives as any[] || []).map((c) => [c.id, c.title || "Live"] as [string, string])),
      ]);
      list.forEach((d) => { d.fan_name = pmap.get(d.fan_id) || "Fan"; d.concert_title = cmap.get(d.concert_id) || (d.concert_type === "artist_live" ? "Live" : "—"); });
    }
    setItems(list);
    setLoading(false);
  };
  useEffect(() => { if (artistId) load(); }, [artistId]);

  const deliver = async (id: string) => {
    setDelivering(id);
    const { data, error } = await supabase.rpc("deliver_concert_dedication" as any, { p_dedication_id: id });
    if (error || !(data as any)?.success) {
      toast.error((data as any)?.error || error?.message || t("artDedicError"));
    } else {
      toast.success(t("artDedicMarkedDelivered"));
      load();
    }
    setDelivering(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Heart className="w-5 h-5 text-pink-500" /> {t("artDedicTitle")}</CardTitle>
        <CardDescription>{t("artDedicDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> {t("artDedicLoading")}</div>
        ) : items.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground py-8">{t("artDedicEmpty")}</p>
        ) : (
          <div className="border rounded-lg divide-y max-h-[600px] overflow-y-auto">
            {items.map((d) => (
              <div key={d.id} className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <strong>{d.fan_name}</strong>
                    <span className="text-muted-foreground">• {d.concert_title}</span>
                    {d.status === "delivered" ? (
                      <Badge className="bg-green-500">{t("artDedicDelivered")}</Badge>
                    ) : (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-500">{t("artDedicToDeliver")}</Badge>
                    )}
                  </div>
                  <Badge variant="outline">{Number(d.price_credits)} {t("artDedicCredits")}</Badge>
                </div>
                <p className="text-sm italic">"{d.message}"</p>
                <p className="text-xs text-muted-foreground">
                  {t("artDedicReceivedOn")} {formatTz(d.paid_at, "dd MMM yyyy HH:mm", { timezone: prefs.timezone, language })}
                  {d.delivered_at && ` • ${t("artDedicDeliveredOn")} ${formatTz(d.delivered_at, "dd MMM HH:mm", { timezone: prefs.timezone, language })}`}
                </p>
                {d.status !== "delivered" && (
                  <Button size="sm" onClick={() => deliver(d.id)} disabled={delivering === d.id}>
                    {delivering === d.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                    {t("artDedicMarkDelivered")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ArtistDedicationsManager;
