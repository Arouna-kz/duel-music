import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Upload, Clock, CheckCircle2, XCircle, Loader2, CreditCard } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUiPreferences } from "@/hooks/useUiPreferences";
import { formatTz } from "@/lib/datetime";

interface UpcomingEvent {
  id: string;
  type: "duel" | "concert" | "artist_concert";
  label: string;
  date: string;
}

export const SponsorRequestSection = () => {
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const { prefs } = useUiPreferences();
  const tz = prefs.timezone;
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [eventKey, setEventKey] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const [tiers, setTiers] = useState<{ label: string; min_seconds: number; max_seconds: number; price_credits: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    (supabase as any).from("sponsor_price_tiers").select("label,min_seconds,max_seconds,price_credits")
      .eq("is_active", true).order("min_seconds", { ascending: true })
      .then(({ data }: any) => setTiers(data || []));
  }, []);

  // Probe video duration when the user selects a video file (so the admin can apply tier-based pricing).
  const handleFile = (f: File | null) => {
    setFile(f);
    setMediaDuration(null);
    if (f && f.type.startsWith("video")) {
      const url = URL.createObjectURL(f);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = url;
      v.onloadedmetadata = () => {
        setMediaDuration(Math.round(v.duration || 0));
        URL.revokeObjectURL(url);
      };
    }
  };

  const expectedTier = tiers.find((t) => mediaDuration != null && mediaDuration >= t.min_seconds && mediaDuration <= t.max_seconds);

  const loadEvents = async () => {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);
    const cutoff = tomorrow.toISOString();

    const [duels, concerts, aConcerts] = await Promise.all([
      supabase.from("duels").select("id, scheduled_time").gt("scheduled_time", cutoff).in("status", ["upcoming"]),
      supabase.from("concerts").select("id, title, scheduled_date").gt("scheduled_date", cutoff).eq("status", "upcoming"),
      supabase.from("artist_concerts").select("id, title, scheduled_date").gt("scheduled_date", cutoff).eq("status", "upcoming"),
    ]);

    const list: UpcomingEvent[] = [];
    duels.data?.forEach((d: any) => list.push({ id: d.id, type: "duel", label: `${t("sponsorReqDuelLabel")} — ${formatTz(d.scheduled_time, "dd MMM yyyy", { timezone: tz, language })}`, date: d.scheduled_time }));
    concerts.data?.forEach((c: any) => list.push({ id: c.id, type: "concert", label: `${t("sponsorReqConcertLabel")} : ${c.title}`, date: c.scheduled_date }));
    aConcerts.data?.forEach((c: any) => list.push({ id: c.id, type: "artist_concert", label: `${t("sponsorReqConcertLabel")} : ${c.title}`, date: c.scheduled_date }));
    list.sort((a, b) => a.date.localeCompare(b.date));
    setEvents(list);
  };

  const loadRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("sponsor_requests")
      .select("*")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false });
    setRequests(data || []);
  };

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => { loadRequests(); }, [user]);

  const submit = async () => {
    if (!user || !eventKey || !description || !file) {
      toast({ title: t("sponsorReqRequiredTitle"), description: t("sponsorReqRequiredDesc"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const [eventType, eventId] = eventKey.split("|") as [UpcomingEvent["type"], string];
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("sponsor-media").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("sponsor-media").getPublicUrl(path);
      const mediaType = file.type.startsWith("video") ? "video" : "image";

      const { error } = await supabase.from("sponsor_requests").insert({
        requester_id: user.id,
        event_type: eventType,
        event_id: eventId,
        description,
        media_url: pub.publicUrl,
        media_type: mediaType,
        media_duration_seconds: mediaDuration,
      } as any);
      if (error) throw error;

      toast({ title: t("sponsorReqSentTitle"), description: t("sponsorReqSentDesc") });
      setDescription(""); setFile(null); setEventKey(""); setMediaDuration(null);
      loadRequests();
    } catch (e: any) {
      toast({ title: t("sponsorReqErrorTitle"), description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const pay = async (id: string) => {
    setPaying(id);
    try {
      const { data, error } = await (supabase as any).rpc("pay_sponsor_request", { p_request_id: id });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || t("sponsorReqPaidFail"));
      toast({ title: t("sponsorReqPaidTitle"), description: t("sponsorReqPaidDesc") });
      loadRequests();
    } catch (e: any) {
      toast({ title: t("sponsorReqErrorTitle"), description: e.message, variant: "destructive" });
    } finally {
      setPaying(null);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { labelKey: string; cls: string; icon: any }> = {
      pending: { labelKey: "sponsorStatusPending", cls: "bg-yellow-500/20 text-yellow-700", icon: Clock },
      awaiting_payment: { labelKey: "sponsorStatusAwaitingPayment", cls: "bg-orange-500/20 text-orange-700", icon: CreditCard },
      paid: { labelKey: "sponsorStatusPaid", cls: "bg-blue-500/20 text-blue-700", icon: Clock },
      approved: { labelKey: "sponsorStatusApproved", cls: "bg-green-500/20 text-green-700", icon: CheckCircle2 },
      rejected: { labelKey: "sponsorStatusRejected", cls: "bg-red-500/20 text-red-700", icon: XCircle },
      cancelled: { labelKey: "sponsorStatusCancelled", cls: "bg-gray-500/20 text-gray-700", icon: XCircle },
      active: { labelKey: "sponsorStatusActive", cls: "bg-green-500/20 text-green-700", icon: CheckCircle2 },
      expired: { labelKey: "sponsorStatusExpired", cls: "bg-gray-500/20 text-gray-700", icon: XCircle },
    };
    const v = map[s] || map.pending;
    const Icon = v.icon;
    return <Badge className={v.cls}><Icon className="w-3 h-3 mr-1" />{t(v.labelKey)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" /> {t("sponsorReqTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t("sponsorReqEventLabel")}</Label>
            <Select value={eventKey} onValueChange={setEventKey}>
              <SelectTrigger><SelectValue placeholder={t("sponsorReqEventPh")} /></SelectTrigger>
              <SelectContent>
                {events.length === 0 && <div className="px-2 py-3 text-sm text-muted-foreground">{t("sponsorReqNoEvents")}</div>}
                {events.map((e) => (
                  <SelectItem key={`${e.type}|${e.id}`} value={`${e.type}|${e.id}`}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("sponsorReqDescLabel")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("sponsorReqDescPh")} maxLength={500} />
          </div>
          <div>
            <Label>{t("sponsorReqMediaLabel")}</Label>
            <label className="mt-1 flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2 cursor-pointer hover:bg-accent/30 transition-colors">
              <span className="inline-flex items-center px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium">
                {t("sponsorReqChooseFile")}
              </span>
              <span className="text-sm text-muted-foreground truncate flex-1">
                {file ? file.name : t("sponsorReqNoFile")}
              </span>
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
              />
            </label>
            {mediaDuration != null && <p className="text-xs text-muted-foreground mt-1">{t("sponsorReqDetectedDuration")} : {mediaDuration}s</p>}
          </div>
          {tiers.length > 0 && (
            <div className="rounded-lg border p-3 bg-muted/30 space-y-1">
              <p className="text-xs font-semibold">{t("sponsorReqTiersTitle")}</p>
              {tiers.map((tier, i) => (
                <p key={i} className={`text-xs ${expectedTier === tier ? "font-bold text-primary" : "text-muted-foreground"}`}>
                  {tier.label} — {tier.price_credits} {t("sponsorReqTiersCredits")}
                  {expectedTier === tier ? ` ${t("sponsorReqTiersYourVideo")}` : ""}
                </p>
              ))}
              <p className="text-[10px] text-muted-foreground italic">{t("sponsorReqTiersFinalNote")}</p>
            </div>
          )}
          <Button onClick={submit} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {t("sponsorReqSubmit")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("sponsorReqMyTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {requests.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t("sponsorReqMyEmpty")}</p>}
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.description}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {statusBadge(r.status)}
                  {r.price_credits > 0 && <Badge variant="outline">{r.price_credits} {t("sponsorReqCreditsBadge")}</Badge>}
                </div>
              </div>
              {r.status === "awaiting_payment" && (
                <Button size="sm" onClick={() => pay(r.id)} disabled={paying === r.id}>
                  {paying === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CreditCard className="w-4 h-4 mr-1" /> {t("sponsorReqPayBtn")}</>}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SponsorRequestSection;
