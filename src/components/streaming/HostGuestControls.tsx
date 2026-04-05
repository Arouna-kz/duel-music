import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { MicOff, UserX, Timer, Check, X, UserPlus } from "lucide-react";

interface Guest {
  id: string;
  user_id: string;
  user_name: string;
  avatar_url?: string;
  status: string;
  isMuted?: boolean;
  isCamOff?: boolean;
  speakingTimer?: number;
  timerRemaining?: number;
}

interface HostGuestControlsProps {
  liveId: string;
  isHost: boolean;
  currentUserId: string;
  onKickGuest?: (requestId: string) => void;
}

export const HostGuestControls = ({ liveId, isHost, currentUserId, onKickGuest }: HostGuestControlsProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Guest[]>([]);
  const [speakingTime, setSpeakingTime] = useState<number>(120);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const controlsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!isHost) return;
    loadGuests();

    const broadcastChannel = supabase
      .channel(`live-controls-${liveId}`, { config: { broadcast: { self: true } } })
      .subscribe();
    controlsChannelRef.current = broadcastChannel;

    const dbChannel = supabase
      .channel(`host-db-${liveId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_join_requests", filter: `live_id=eq.${liveId}` }, () => loadGuests())
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
      if (controlsChannelRef.current) supabase.removeChannel(controlsChannelRef.current);
      controlsChannelRef.current = null;
      timersRef.current.forEach(t => clearInterval(t));
    };
  }, [liveId, isHost]);

  const loadGuests = async () => {
    const { data } = await supabase
      .from("live_join_requests")
      .select("*")
      .eq("live_id", liveId)
      .in("status", ["pending", "accepted"]);

    if (!data) return;

    const userIds = data.map(r => r.user_id);
    const { data: profiles } = await supabase.rpc("get_display_profiles", { user_ids: userIds });

    const profileMap = new Map((profiles as any[])?.map((p: any) => [p.id, p]) || []);

    const pending: Guest[] = [];
    const accepted: Guest[] = [];

    data.forEach(r => {
      const profile = profileMap.get(r.user_id);
      const g: Guest = {
        id: r.id,
        user_id: r.user_id,
        user_name: profile?.full_name || t("userDefault"),
        avatar_url: profile?.avatar_url,
        status: r.status,
      };
      if (r.status === "pending") pending.push(g);
      else accepted.push(g);
    });

    setPendingRequests(pending);
    setGuests(prev => {
      return accepted.map(g => {
        const existing = prev.find(p => p.id === g.id);
        return existing ? { ...g, isMuted: existing.isMuted, isCamOff: existing.isCamOff, timerRemaining: existing.timerRemaining } : g;
      });
    });
  };

  const acceptRequest = async (requestId: string) => {
    await supabase.from("live_join_requests").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", requestId);
  };

  const rejectRequest = async (requestId: string) => {
    await supabase.from("live_join_requests").update({ status: "rejected" }).eq("id", requestId);
  };

  const kickGuest = async (guest: Guest) => {
    await supabase.from("live_join_requests").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", guest.id);
    controlsChannelRef.current?.send({ type: "broadcast", event: "guest_action", payload: { action: "kick", targetUserId: guest.user_id } });
    onKickGuest?.(guest.id);
    toast({ title: `${guest.user_name} ${t("removedFromLive")}` });
  };

  const toggleMuteGuest = (guest: Guest) => {
    setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, isMuted: !g.isMuted } : g));
    controlsChannelRef.current?.send({ type: "broadcast", event: "guest_action", payload: { action: "toggle_mic", targetUserId: guest.user_id, value: !guest.isMuted } });
  };

  const startTimer = (guest: Guest) => {
    const existing = timersRef.current.get(guest.id);
    if (existing) clearInterval(existing);

    setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, timerRemaining: speakingTime } : g));

    controlsChannelRef.current?.send({ type: "broadcast", event: "guest_action", payload: { action: "start_timer", targetUserId: guest.user_id, targetUserName: guest.user_name, value: speakingTime } });

    const interval = setInterval(() => {
      setGuests(prev => {
        const updated = prev.map(g => {
          if (g.id !== guest.id) return g;
          const remaining = (g.timerRemaining || 0) - 1;
          if (remaining <= 0) {
            clearInterval(interval);
            timersRef.current.delete(guest.id);
            toast({ title: `${t("speakingTimeEnded")} ${g.user_name}` });
            controlsChannelRef.current?.send({ type: "broadcast", event: "guest_action", payload: { action: "timer_ended", targetUserId: g.user_id } });
            return { ...g, timerRemaining: 0 };
          }
          return { ...g, timerRemaining: remaining };
        });
        return updated;
      });
    }, 1000);

    timersRef.current.set(guest.id, interval);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  if (!isHost) return null;

  return (
    <Card className="border-accent/30">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-accent" />
          {t("guestControls")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingRequests.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t("pendingRequests")} ({pendingRequests.length})
            </p>
            <div className="space-y-1">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between bg-muted/50 rounded-md p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="w-6 h-6 shrink-0">
                      <AvatarImage src={req.avatar_url} />
                      <AvatarFallback className="text-[10px]">{req.user_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate max-w-[120px]">{req.user_name}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="w-7 h-7 text-green-500" onClick={() => acceptRequest(req.id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" onClick={() => rejectRequest(req.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground mb-1">
            {t("speakingTimeSetting")} : {speakingTime >= 60 ? `${Math.floor(speakingTime / 60)}min${speakingTime % 60 > 0 ? ` ${speakingTime % 60}s` : ""}` : `${speakingTime}s`}
          </p>
          <Slider value={[speakingTime]} onValueChange={(v) => setSpeakingTime(v[0])} min={15} max={3600} step={15} />
        </div>

        {guests.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t("activeGuests")} ({guests.length})
            </p>
            <div className="space-y-2">
              {guests.map(guest => (
                <div key={guest.id} className="bg-muted/30 rounded-lg p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarImage src={guest.avatar_url} />
                        <AvatarFallback className="text-[10px]">{guest.user_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate max-w-[100px]">{guest.user_name}</span>
                    </div>
                    <div className="flex gap-0.5 items-center flex-wrap justify-end shrink-0">
                      <Button size="icon" variant={guest.isMuted ? "destructive" : "ghost"} className="w-7 h-7" onClick={() => toggleMuteGuest(guest)} title={guest.isMuted ? t("reactivateMic") : t("muteMicLabel")}>
                        <MicOff className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => startTimer(guest)} title={t("startTimerLabel")}>
                        <Timer className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" onClick={() => kickGuest(guest)} title={t("kickGuestLabel")}>
                        <UserX className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {guest.timerRemaining && guest.timerRemaining > 0 && (
                    <div className="bg-accent/20 rounded px-2 py-1 text-center">
                      <span className="text-xs text-muted-foreground">{t("timeRemaining")} : </span>
                      <span className="text-sm font-bold text-accent">{formatTimer(guest.timerRemaining)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">{t("noActiveGuests")}</p>
        )}
      </CardContent>
    </Card>
  );
};
