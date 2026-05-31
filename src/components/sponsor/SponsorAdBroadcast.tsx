import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Play, Square, Megaphone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdVideo {
  id: string;
  title: string;
  video_url: string;
  duration_seconds: number;
  play_count: number;
}

interface Props {
  eventType: "duel" | "concert" | "artist_concert";
  eventId: string;
  /** Client-side hint only — server enforces authorization. */
  canTrigger: boolean;
}

/**
 * Sponsor ad broadcast.
 * - Server RPCs (start_sponsor_ad / stop_sponsor_ad) enforce that only the duel manager
 *   (or concert artist) can trigger or stop the ad — even if the client is tampered.
 * - The fullscreen video plays for everyone via Supabase Realtime broadcast.
 * - A slim non-blocking banner stays visible during the ad.
 * - The Top Donor bubble is repositioned above the ad so the donor list stays visible.
 */
export const SponsorAdBroadcast = ({ eventType, eventId, canTrigger }: Props) => {
  const { toast } = useToast();
  const [ads, setAds] = useState<AdVideo[]>([]);
  const [showList, setShowList] = useState(false);
  const [activeAd, setActiveAd] = useState<AdVideo | null>(null);
  const [activePlayId, setActivePlayId] = useState<string | null>(null);
  const [triggererId, setTriggererId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); // anti double-click lock
  const [loadingAds, setLoadingAds] = useState(true);
  const channelRef = useRef<any>(null);
  const userRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { userRef.current = data.user?.id || null; });
  }, []);

  const fetchAds = async () => {
    if (!eventId) return [] as AdVideo[];
    setLoadingAds(true);
    const { data } = await supabase.from("sponsor_ad_videos")
      .select("*")
      .eq("event_type", eventType).eq("event_id", eventId).eq("is_active", true)
      .order("created_at", { ascending: false });
    const list = (data as any) || [];
    setAds(list);
    setLoadingAds(false);
    return list as AdVideo[];
  };

  useEffect(() => {
    if (!canTrigger || !eventId) return;
    fetchAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, eventId, canTrigger]);

  // Late-joiner sync: if an ad started just before mount, the broadcast was missed.
  // Re-broadcast a "ping" so the active triggerer rebroadcasts the current play.
  useEffect(() => {
    if (!eventId || canTrigger) return;
    const t = setTimeout(() => {
      channelRef.current?.send({ type: "broadcast", event: "ping", payload: {} });
    }, 800);
    return () => clearTimeout(t);
  }, [eventId, canTrigger]);

  useEffect(() => {
    if (!eventId) return;
    const ch = supabase.channel(`sponsor-ads-${eventId}`)
      .on("broadcast", { event: "play" }, ({ payload }) => {
        setActiveAd(payload.ad);
        setActivePlayId(payload.play_id || null);
        setTriggererId(payload.triggered_by);
      })
      .on("broadcast", { event: "stop" }, () => {
        setActiveAd(null);
        setActivePlayId(null);
        setTriggererId(null);
      })
      .on("broadcast", { event: "ping" }, () => {
        // Triggerer rebroadcasts current state so late viewers can sync.
        if (activeAd && activePlayId && userRef.current === triggererId) {
          channelRef.current?.send({
            type: "broadcast", event: "play",
            payload: { ad: activeAd, triggered_by: triggererId, play_id: activePlayId },
          });
        }
      })
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
  }, [eventId, activeAd, activePlayId, triggererId]);

  const triggerAd = async (ad: AdVideo) => {
    if (busy) return;
    setBusy(true);
    setShowList(false);
    try {
      const { data, error } = await (supabase as any).rpc("start_sponsor_ad", {
        p_ad_video_id: ad.id, p_event_type: eventType, p_event_id: eventId,
      });
      if (error || !data?.success) {
        toast({
          title: "Impossible de démarrer la pub",
          description: data?.error === "already_playing" ? "Une publicité est déjà en cours."
            : data?.error === "forbidden" ? "Action non autorisée."
            : data?.error || error?.message || "Erreur",
          variant: "destructive",
        });
        return;
      }
      const playId = data.play_id;
      channelRef.current?.send({
        type: "broadcast", event: "play",
        payload: { ad, triggered_by: userRef.current, play_id: playId },
      });
      setActiveAd(ad);
      setActivePlayId(playId);
      setTriggererId(userRef.current);
    } finally {
      setBusy(false);
    }
  };

  const stopAd = async () => {
    if (busy || !activePlayId) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc("stop_sponsor_ad", { p_play_id: activePlayId });
      if (error || !data?.success) {
        toast({
          title: "Impossible d'arrêter",
          description: data?.error || error?.message || "Erreur",
          variant: "destructive",
        });
        return;
      }
      channelRef.current?.send({ type: "broadcast", event: "stop", payload: {} });
      setActiveAd(null);
      setActivePlayId(null);
      setTriggererId(null);
    } finally {
      setBusy(false);
    }
  };

  const isTriggerer = !!triggererId && userRef.current === triggererId;
  const adActive = !!activeAd;

  return (
    <>
      {canTrigger && (
        <div className="relative inline-flex items-center gap-2 flex-wrap">
          {/* Status badge — hidden on mobile to save space */}
          <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border ${
            adActive
              ? "bg-red-500/15 text-red-400 border-red-500/40 animate-pulse"
              : "bg-muted text-muted-foreground border-border"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${adActive ? "bg-red-500" : "bg-muted-foreground"}`} />
            {adActive ? "Pub en cours" : "Pub terminée"}
          </span>

          {!adActive ? (
            <div className="relative">
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  // Always re-fetch on click to avoid showing a stale empty list (e.g. on mobile when the panel just mounted).
                  const fresh = await fetchAds();
                  if (fresh.length === 0) {
                    toast({
                      title: "Aucune publicité disponible",
                      description: "Aucune pub sponsor n'a encore été ajoutée pour cet événement. Demande à un admin d'en ajouter via la console sponsors.",
                    });
                    return;
                  }
                  setShowList((v) => !v);
                }}
                className="gap-1 h-8 px-2.5"
              >
                {(busy || loadingAds) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span className="hidden sm:inline">{loadingAds ? "Chargement…" : (ads.length === 0 ? "Aucune pub" : "Démarrer pub")}</span>
                <span className="sm:hidden">Pub</span>
                {!loadingAds && <span className="text-[10px] opacity-70">({ads.length})</span>}
              </Button>
              {showList && ads.length > 0 && createPortal(
                <>
                  {/* Backdrop to close on outside tap */}
                  <div
                    className="fixed inset-0 z-[10040] bg-black/40 backdrop-blur-sm"
                    onClick={() => setShowList(false)}
                  />
                  <div className="fixed left-1/2 -translate-x-1/2 bottom-[15%] z-[10050] w-[92vw] max-w-sm bg-popover border rounded-xl shadow-2xl p-3 space-y-1 max-h-[70vh] overflow-y-auto">
                    <div className="flex items-center justify-between px-1 pb-2 border-b mb-1">
                      <p className="text-sm font-bold">Choisir une publicité</p>
                      <button
                        onClick={() => setShowList(false)}
                        className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                      >
                        Fermer
                      </button>
                    </div>
                    {ads.map((ad) => (
                      <button
                        key={ad.id}
                        disabled={busy}
                        onClick={() => triggerAd(ad)}
                        className="w-full text-left px-2 py-3 rounded hover:bg-accent flex items-center gap-2 disabled:opacity-50"
                      >
                        <Play className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ad.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {ad.duration_seconds}s • {ad.play_count} diff.
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>,
                document.body
              )}
            </div>
          ) : isTriggerer ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={stopAd}
              className="gap-1 h-8 px-2.5"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              <span className="hidden sm:inline">Arrêter pub</span>
              <span className="sm:hidden">Stop</span>
            </Button>
          ) : null}
        </div>
      )}

      {/* Slim non-blocking banner for everyone (visible above the fullscreen ad too) */}
      {adActive && createPortal(
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[10010] pointer-events-none"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 4px)" }}
        >
          <div className="px-3 py-1.5 rounded-full bg-amber-500/95 text-amber-950 text-[11px] sm:text-xs font-bold shadow-lg flex items-center gap-1.5 backdrop-blur">
            <Megaphone className="w-3.5 h-3.5" />
            Pause pub — Merci à notre sponsor
          </div>
        </div>,
        document.body
      )}

      {/* Fullscreen ad video. Top donor bubble (z-[10020]) sits above so donor list stays visible. */}
      {activeAd && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
          <video
            src={activeAd.video_url}
            autoPlay
            playsInline
            controls={false}
            className="w-full h-full object-contain"
            onEnded={() => { if (isTriggerer) stopAd(); }}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-amber-500 text-amber-950 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow">
            <Megaphone className="w-3.5 h-3.5" /> PUBLICITÉ
          </div>
          {isTriggerer && (
            <Button
              onClick={stopAd}
              variant="destructive"
              size="sm"
              disabled={busy}
              className="absolute top-3 right-3 h-9 px-3 z-[10005]"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Square className="w-4 h-4 mr-1" />}
              Arrêter
            </Button>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export default SponsorAdBroadcast;
