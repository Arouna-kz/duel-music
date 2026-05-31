import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type StreamType = "live" | "concert" | "duel";

interface UseStreamBanOptions {
  streamType: StreamType;
  streamId: string;
  /** Current user id (used to know if the *current* user is banned). */
  currentUserId?: string | null;
}

/**
 * Manages per-stream bans for lives, concerts and duels.
 *
 * - Returns the live set of banned user ids (used to filter chat messages).
 * - Returns whether the current user is banned (used to block chat / access).
 * - Exposes a `banUser` helper for hosts/managers.
 */
export const useStreamBan = ({ streamType, streamId, currentUserId }: UseStreamBanOptions) => {
  const [bannedIds, setBannedIds] = useState<Set<string>>(new Set());
  const [isCurrentUserBanned, setIsCurrentUserBanned] = useState(false);

  const fetchBans = useCallback(async () => {
    if (!streamId) return;
    const { data, error } = await supabase
      .from("stream_bans")
      .select("banned_user_id")
      .eq("stream_type", streamType)
      .eq("stream_id", streamId);

    if (error) {
      console.error("Failed to load stream bans", error);
      return;
    }

    const ids = new Set((data || []).map((r: any) => r.banned_user_id as string));
    setBannedIds(ids);
    setIsCurrentUserBanned(currentUserId ? ids.has(currentUserId) : false);
  }, [streamType, streamId, currentUserId]);

  useEffect(() => {
    fetchBans();
    if (!streamId) return;

    const channel = supabase
      .channel(`stream-bans-${streamType}-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stream_bans",
          filter: `stream_id=eq.${streamId}`,
        },
        () => fetchBans()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamType, streamId, fetchBans]);

  const banUser = useCallback(
    async (targetUserId: string, reason?: string) => {
      if (!currentUserId) return false;
      const { error } = await supabase.from("stream_bans").insert({
        stream_type: streamType,
        stream_id: streamId,
        banned_user_id: targetUserId,
        banned_by: currentUserId,
        reason: reason || null,
      });
      if (error) {
        console.error("Failed to ban user", error);
        toast.error(error.message);
        return false;
      }
      return true;
    },
    [streamType, streamId, currentUserId]
  );

  return { bannedIds, isCurrentUserBanned, banUser, refetch: fetchBans };
};
