import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Lock, Calendar } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatTz } from "@/lib/datetime";
import { useUiPreferences } from "@/hooks/useUiPreferences";
import { toast } from "sonner";
import { purchaseErrorKey } from "@/lib/purchaseErrors";
import { PriceBadge } from "@/components/profile/PriceBadge";
import { useCurrencyFormatter } from "@/hooks/useCurrency";
import { useNavigate } from "react-router-dom";

interface ConcertReplayCardProps {
  concert: {
    id: string;
    title: string;
    artist_name: string;
    description?: string;
    scheduled_date: string;
    ticket_price: number;
    image_url?: string;
    recording_url?: string;
    is_replay_available?: boolean;
    is_artist_concert?: boolean;
  };
  onPlay: (concert: any, hasAccess: boolean) => void;
}

export const ConcertReplayCard = ({ concert, onPlay }: ConcertReplayCardProps) => {
  const { t, language } = useLanguage();
  const { prefs } = useUiPreferences();
  const { formatPrice } = useCurrencyFormatter();
  const tz = prefs.timezone;
  const [isUnlocking, setIsUnlocking] = useState(false);
  const navigate = useNavigate();

  const { data: hasAccess, refetch: refetchAccess } = useQuery({
    queryKey: ["concert-replay-access", concert.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data: ticket } = await supabase
        .from("concert_tickets")
        .select("id")
        .eq("concert_id", concert.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (ticket) return true;
      const { data: access } = await (supabase
        .from("concert_replay_access" as any)
        .select("id")
        .eq("concert_id", concert.id)
        .eq("user_id", user.id)
        .maybeSingle() as any);
      return !!access;
    },
  });

  const isPremium = concert.ticket_price > 0;
  const canWatch = !isPremium || hasAccess;

  const handleUnlock = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(t("mustLoginToUnlock"));
      return;
    }
    setIsUnlocking(true);
    try {
      const { data: replay } = await supabase
        .from("replay_videos")
        .select("id, created_at")
        .eq("concert_id", concert.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!replay?.id) {
        toast.error(t("unlockReplayError"));
        return;
      }
      const { data, error } = await supabase.rpc("purchase_replay_access_from_wallet", {
        p_user_id: user.id,
        p_replay_id: replay.id,
      });
      if (error) throw error;
      const r = data as { success?: boolean; error?: string };
      if (!r?.success) {
        if (r?.error === "already_purchased") toast.success(t("replayUnlockedOk"));
        else toast.error(t(purchaseErrorKey(r?.error)));
        return;
      }
      toast.success(t("replayUnlockedOk"));
      refetchAccess();
    } catch (error: any) {
      toast.error(t("unlockReplayError"));
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleClick = async () => {
    if (!concert.recording_url) return;
    if (!canWatch) {
      handleUnlock();
      return;
    }
    // Navigate to the unified replay detail page (same layout as duel replays)
    const { data: replay } = await supabase
      .from("replay_videos")
      .select("id, created_at")
      .eq("concert_id", concert.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (replay?.id) {
      navigate(`/replay/${replay.id}`);
    } else {
      // Fallback to in-place player if no replay row was created
      onPlay(concert, true);
    }
  };

  return (
    <Card 
      className="group hover:shadow-glow transition-all bg-card border-border overflow-hidden cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative">
        <div 
          className="h-48 bg-cover bg-center relative" 
          style={{ 
            backgroundImage: concert.image_url 
              ? `url(${concert.image_url})` 
              : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))' 
          }}
        >
          <div className="absolute inset-0 bg-background/40 group-hover:bg-background/20 transition-all flex items-center justify-center">
            {isPremium && !canWatch ? (
              <Lock className="w-12 h-12 text-foreground opacity-90" />
            ) : (
              <Play className="w-12 h-12 text-foreground opacity-90" />
            )}
          </div>
          
          {concert.recording_url && (
            <Badge className="absolute top-2 right-2 bg-green-500/90 text-white">
              <Play className="w-3 h-3 mr-1" />
              {t("replayAvailable")}
            </Badge>
          )}

          <PriceBadge credits={Number(concert.ticket_price ?? 0)} variant="overlay" className="absolute top-2 left-2" />

          {hasAccess && isPremium && (
            <Badge className="absolute bottom-2 left-2 bg-green-500 text-white">
              {t("accessUnlocked")}
            </Badge>
          )}
        </div>
      </div>
      <CardContent className="p-6">
        <h3 className="text-xl font-bold mb-2 text-foreground">{concert.title}</h3>
        <p className="text-muted-foreground mb-2">{concert.artist_name}</p>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Calendar className="w-4 h-4" />
          <span>{formatTz(concert.scheduled_date, "dd MMMM yyyy", { timezone: tz, language })}</span>
        </div>
        
        <Button 
          className="w-full bg-gradient-primary hover:shadow-glow transition-all"
          variant={isPremium && !canWatch ? "outline" : "default"}
          disabled={!concert.recording_url || isUnlocking}
        >
          {!concert.recording_url ? (
            t("replayNotAvailable")
          ) : isPremium && !canWatch ? (
            isUnlocking ? t("unlockingReplay") : `${t("unlockReplay")} — ${Number(concert.ticket_price).toLocaleString()} Crédits (≈ ${formatPrice(Number(concert.ticket_price))})`
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              {t("watch")}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
