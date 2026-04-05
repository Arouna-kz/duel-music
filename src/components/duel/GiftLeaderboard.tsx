import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { Trophy, Crown, Medal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Donor {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_gifts: number;
}

interface GiftLeaderboardProps {
  duelId?: string;
  concertId?: string;
  liveId?: string;
}

const RANK_STYLES = [
  { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  { icon: Medal, color: "text-gray-400", bg: "bg-gray-400/10", border: "border-gray-400/30" },
  { icon: Medal, color: "text-amber-700", bg: "bg-amber-700/10", border: "border-amber-700/30" },
];

export const GiftLeaderboard = ({ duelId, concertId, liveId }: GiftLeaderboardProps) => {
  const { t } = useLanguage();
  const [donors, setDonors] = useState<Donor[]>([]);

  const contextId = duelId || concertId || liveId;

  const fetchLeaderboard = async () => {
    if (!contextId) return;

    let query = supabase
      .from("gift_transactions")
      .select("from_user_id, gift_id") as any;

    if (duelId) {
      query = query.eq("duel_id", duelId);
    } else if (concertId || liveId) {
      query = query.eq("live_id", concertId || liveId);
    }

    const { data: transactions } = await query;
    if (!transactions || transactions.length === 0) {
      setDonors([]);
      return;
    }

    const counts: Record<string, number> = {};
    transactions.forEach((t: any) => {
      counts[t.from_user_id] = (counts[t.from_user_id] || 0) + 1;
    });

    const userIds = Object.keys(counts);
    const { data: profiles } = await supabase.rpc("get_display_profiles", {
      user_ids: userIds,
    });

    const profileMap = new Map((profiles as any[])?.map((p: any) => [p.id, p]) || []);

    const leaderboard: Donor[] = userIds
      .map((uid) => ({
        user_id: uid,
        full_name: profileMap.get(uid)?.full_name || t("userDefault"),
        avatar_url: profileMap.get(uid)?.avatar_url || null,
        total_gifts: counts[uid],
      }))
      .sort((a, b) => b.total_gifts - a.total_gifts)
      .slice(0, 10);

    setDonors(leaderboard);
  };

  useEffect(() => {
    fetchLeaderboard();

    if (!contextId) return;

    const channel = supabase
      .channel(`leaderboard-${contextId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gift_transactions" },
        () => { fetchLeaderboard(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [duelId, concertId, liveId]);

  if (donors.length === 0) return null;

  return (
    <Card className="border-border">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          {t("topDonors")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <AnimatePresence>
          {donors.map((donor, idx) => {
            const style = RANK_STYLES[idx] || { icon: null, color: "text-muted-foreground", bg: "", border: "" };
            const RankIcon = style.icon;

            return (
              <motion.div
                key={donor.user_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-center gap-2 px-4 py-2 ${idx < 3 ? style.bg : ""} ${idx === 0 ? "border-l-2 " + style.border : ""}`}
              >
                <span className={`w-5 text-center text-xs font-bold ${style.color}`}>
                  {idx < 3 && RankIcon ? (
                    <RankIcon className="w-4 h-4 inline" />
                  ) : (
                    `#${idx + 1}`
                  )}
                </span>
                <Avatar className="w-6 h-6">
                  <AvatarImage src={donor.avatar_url || ""} />
                  <AvatarFallback className="text-[10px]">
                    {donor.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium truncate flex-1">
                  {donor.full_name}
                </span>
                <span className="text-xs font-bold text-primary">
                  🎁 {donor.total_gifts}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
