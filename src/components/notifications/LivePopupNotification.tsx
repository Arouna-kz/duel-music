import { useEffect, useState, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LanguageContext } from "@/contexts/LanguageContext";
import { X, Radio, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LiveArtist {
  id: string;
  artist_id: string;
  title: string | null;
  status: string;
  started_at: string;
  artist_name?: string;
  avatar_url?: string;
}

export const LivePopupNotification = () => {
  const langContext = useContext(LanguageContext) as { t: (key: string) => string } | undefined;
  const t = langContext?.t || ((key: string) => key);
  const [lives, setLives] = useState<LiveArtist[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissedAt = sessionStorage.getItem("live_popup_dismissed");
    if (dismissedAt) { setDismissed(true); return; }

    const fetchLives = async () => {
      const { data: livesData } = await supabase
        .from("artist_lives")
        .select("id, artist_id, title, status, started_at")
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(3);

      if (!livesData || livesData.length === 0) return;

      const artistIds = [...new Set(livesData.map(l => l.artist_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", artistIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enriched: LiveArtist[] = livesData.map(live => ({
        ...live,
        artist_name: profileMap.get(live.artist_id)?.full_name || t("artistDefault"),
        avatar_url: profileMap.get(live.artist_id)?.avatar_url || undefined,
      }));

      if (enriched.length > 0) {
        setLives(enriched);
        setTimeout(() => setVisible(true), 1500);
      }
    };

    fetchLives();
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("live_popup_dismissed", Date.now().toString());
    setVisible(false);
    setTimeout(() => setDismissed(true), 300);
  };

  if (dismissed || lives.length === 0) return null;

  return (
    <div className={`fixed bottom-6 left-6 z-50 max-w-sm transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"}`}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-destructive px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-destructive-foreground animate-pulse" />
            <span className="text-destructive-foreground font-bold text-sm">
              {lives.length === 1 ? `1 ${t("artistsLiveCount")}` : `${lives.length} ${t("artistsLiveCountPlural")}`}
            </span>
          </div>
          <button onClick={handleDismiss} className="text-destructive-foreground/70 hover:text-destructive-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-2">
          {lives.map((live) => (
            <div
              key={live.id}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => { navigate("/lives"); handleDismiss(); }}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
                  {live.avatar_url ? (
                    <img src={live.avatar_url} alt={live.artist_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary-foreground font-bold text-sm">{live.artist_name?.charAt(0) || "A"}</span>
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-destructive rounded-full border-2 border-card animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{live.artist_name}</p>
                <p className="text-xs text-muted-foreground truncate">{live.title || t("liveOngoing")}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          ))}
        </div>

        <div className="px-3 pb-3">
          <Button size="sm" className="w-full" variant="destructive" onClick={() => { navigate("/lives"); handleDismiss(); }}>
            <Radio className="w-4 h-4 mr-2 animate-pulse" />
            {t("joinALive")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LivePopupNotification;
