import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Trophy, Plus, CheckCircle, Gift, Package } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Winner {
  id: string;
  season_id: string;
  user_id: string;
  rank_position: number;
  reward_status: string;
  distributed_at: string | null;
  received_at: string | null;
  notes: string | null;
  user_name?: string;
  avatar_url?: string;
}

interface Reward {
  id: string;
  season_id: string;
  rank_position: number;
  reward_type: string;
  credits_amount: number | null;
  virtual_gift_id: string | null;
  physical_description: string | null;
}

interface Props {
  seasonId: string;
  seasonType: string;
  rewards: Reward[];
  isPast: boolean;
}

const SeasonWinnersManager = ({ seasonId, seasonType, rewards, isPast }: Props) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [winners, setWinners] = useState<Winner[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; avatar: string | null }[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRank, setSelectedRank] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWinners(); }, [seasonId]);

  const loadWinners = async () => {
    const { data } = await supabase.from("season_winners").select("*").eq("season_id", seasonId).order("rank_position");
    const winnersList = (data || []) as Winner[];
    
    if (winnersList.length > 0) {
      const userIds = winnersList.map(w => w.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      winnersList.forEach(w => {
        const p = profileMap.get(w.user_id);
        w.user_name = p?.full_name || "Inconnu";
        w.avatar_url = p?.avatar_url || null;
      });
    }
    setWinners(winnersList);

    // Load potential users based on season type
    if (seasonType === "artist") {
      const { data: artistProfiles } = await supabase.from("artist_profiles").select("user_id, stage_name, avatar_url");
      const ids = artistProfiles?.map(a => a.user_id) || [];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      setUsers((artistProfiles || []).map(a => ({
        id: a.user_id,
        name: a.stage_name || profileMap.get(a.user_id) || "Artiste",
        avatar: a.avatar_url,
      })));
    } else {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").limit(100);
      setUsers((profiles || []).map(p => ({ id: p.id, name: p.full_name || "Utilisateur", avatar: p.avatar_url })));
    }
    setLoading(false);
  };

  const addWinner = async () => {
    if (!selectedUser || !selectedRank) return;
    const { error } = await supabase.from("season_winners").insert({
      season_id: seasonId,
      user_id: selectedUser,
      rank_position: parseInt(selectedRank),
      reward_status: "pending",
    });
    if (error) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("adminWinnersAdd") });
    setSelectedUser("");
    setSelectedRank("");
    loadWinners();
  };

  const distributeReward = async (winnerId: string, userId: string, rankPosition: number) => {
    const reward = rewards.find(r => r.rank_position === rankPosition);
    
    // If reward is credits, add to user wallet
    if (reward?.reward_type === "credits" && reward.credits_amount) {
      const { data: wallet } = await supabase.from("user_wallets").select("balance").eq("user_id", userId).single();
      const newBalance = (wallet?.balance || 0) + reward.credits_amount;
      await supabase.from("user_wallets").upsert({ user_id: userId, balance: newBalance });
    }

    // If reward is virtual gift, add to user gifts
    if (reward?.reward_type === "virtual_gift" && reward.virtual_gift_id) {
      await supabase.from("user_gifts").insert({ user_id: userId, gift_id: reward.virtual_gift_id, quantity: 1 });
    }

    await supabase.from("season_winners").update({
      reward_status: reward?.reward_type === "physical" ? "distributed" : "received",
      distributed_at: new Date().toISOString(),
      received_at: reward?.reward_type !== "physical" ? new Date().toISOString() : null,
    }).eq("id", winnerId);

    toast({ title: t("adminWinnersDistributed") });
    loadWinners();
  };

  const markReceived = async (winnerId: string) => {
    await supabase.from("season_winners").update({
      reward_status: "received",
      received_at: new Date().toISOString(),
    }).eq("id", winnerId);
    toast({ title: t("adminWinnersReceived") });
    loadWinners();
  };

  const availableRanks = rewards.map(r => r.rank_position).filter(rp => !winners.some(w => w.rank_position === rp));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="border-yellow-500 text-yellow-500">{t("adminWinnersStatusPending")}</Badge>;
      case "distributed": return <Badge className="bg-blue-500 text-white">{t("adminWinnersStatusDistributed")}</Badge>;
      case "received": return <Badge className="bg-green-500 text-white">{t("adminWinnersStatusReceived")}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" /> {t("adminWinnersTitle")}
      </h4>

      {winners.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-3">{t("adminWinnersNone")}</p>
      ) : (
        <div className="space-y-2 mb-4">
          {winners.map(winner => {
            const reward = rewards.find(r => r.rank_position === winner.rank_position);
            return (
              <div key={winner.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg flex-wrap">
                <span className="font-bold text-sm w-8">#{winner.rank_position}</span>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={winner.avatar_url || ""} />
                  <AvatarFallback>{(winner.user_name || "?")[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium flex-1 min-w-0 truncate">{winner.user_name}</span>
                {getStatusBadge(winner.reward_status)}
                {winner.reward_status === "pending" && reward && (
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => distributeReward(winner.id, winner.user_id, winner.rank_position)}>
                    <Gift className="w-3 h-3 mr-1" />{t("adminWinnersDistribute")}
                  </Button>
                )}
                {winner.reward_status === "distributed" && (
                  <Button size="sm" variant="outline" className="text-xs text-green-600" onClick={() => markReceived(winner.id)}>
                    <Package className="w-3 h-3 mr-1" />{t("adminWinnersMarkReceived")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isPast && availableRanks.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedRank} onValueChange={setSelectedRank}>
            <SelectTrigger className="w-[100px]"><SelectValue placeholder={t("adminWinnersRank")} /></SelectTrigger>
            <SelectContent>
              {availableRanks.map(rp => <SelectItem key={rp} value={String(rp)}>#{rp}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder={t("adminWinnersSelectUser")} /></SelectTrigger>
            <SelectContent>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={addWinner} disabled={!selectedUser || !selectedRank}>
            <Plus className="w-3 h-3 mr-1" />{t("adminWinnersAdd")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SeasonWinnersManager;
