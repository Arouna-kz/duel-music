import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface SpeakingTimerOverlayProps {
  channelName: string;
  className?: string;
}

/**
 * Listens for broadcast timer events and displays a visible countdown
 * to ALL viewers (not just the host).
 */
export const SpeakingTimerOverlay = ({ channelName, className = "" }: SpeakingTimerOverlayProps) => {
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel(`${channelName}-timer-overlay`, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "guest_action" }, (payload) => {
        const { action, value } = payload.payload;
        if (action === "start_timer") {
          setActiveUser(payload.payload.targetUserName || "Invité");
          setRemaining(value);
          setTotal(value);
        }
        if (action === "timer_ended") {
          setActiveUser(null);
          setRemaining(0);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [channelName]);

  // Countdown
  useEffect(() => {
    if (!activeUser || remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setActiveUser(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeUser, remaining]);

  if (!activeUser || remaining <= 0) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const pct = total > 0 ? (remaining / total) * 100 : 0;

  return (
    <div className={`flex items-center gap-3 bg-background/70 backdrop-blur-md rounded-full px-4 py-2 border border-accent/40 shadow-lg animate-in fade-in slide-in-from-top-2 ${className}`}>
      <Timer className="w-4 h-4 text-accent animate-pulse" />
      <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">
        {activeUser}
      </span>
      <Progress value={pct} className="w-20 h-2" />
      <span className="text-sm font-bold text-accent tabular-nums min-w-[48px] text-right">
        {minutes}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
};
