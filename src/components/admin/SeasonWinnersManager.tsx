/**
 * Admin: SeasonWinnersManager — fulfillment des récompenses post-saison.
 *
 * Saisie/édition des podiums Top 3 d'une saison clôturée, attribution des
 * récompenses physiques/virtuelles, marquage comme livrées. Lié à
 * `LeaderboardSeasonsManager`.
 *
 * @access  role=admin
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Trophy, Plus, Gift, Package, Sparkles, Bell, CalendarClock, Check } from "lucide-react";
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
  notified_winner_at: string | null;
  meeting_status: string;
  meeting_when: string | null;
  meeting_location: string | null;
  counter_when: string | null;
  counter_location: string | null;
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
  const [meetingDraft, setMeetingDraft] = useState<Record<string, { when: string; location: string; notes: string }>>({});

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

  const autoComputeWinners = async () => {
    const ranks = rewards.map(r => r.rank_position).sort((a, b) => a - b);
    if (ranks.length === 0) return;
    const maxRank = Math.max(...ranks);
    const { data, error } = await (supabase as any).rpc("get_season_leaderboard", { p_season_id: seasonId, p_limit: maxRank });
    if (error) { toast({ title: t("error"), description: error.message, variant: "destructive" }); return; }
    const rows = (data as any[]) || [];
    if (rows.length === 0) { toast({ title: t("adminWinnersAutoEmpty"), variant: "destructive" }); return; }
    const existingRanks = new Set(winners.map(w => w.rank_position));
    const inserts = ranks
      .filter(rp => !existingRanks.has(rp))
      .map(rp => {
        const row = rows.find((r: any) => r.rank_position === rp) || rows[rp - 1];
        if (!row) return null;
        return { season_id: seasonId, user_id: row.user_id, rank_position: rp, reward_status: "pending" };
      })
      .filter(Boolean);
    if (inserts.length > 0) {
      const { error: insErr } = await supabase.from("season_winners").insert(inserts as any);
      if (insErr) { toast({ title: t("error"), description: insErr.message, variant: "destructive" }); return; }
    }
    await (supabase as any).rpc("notify_season_winners", { p_season_id: seasonId });
    toast({ title: t("adminWinnersAutoDone") });
    loadWinners();
  };

  const notifyAll = async () => {
    const { error } = await (supabase as any).rpc("notify_season_winners", { p_season_id: seasonId });
    if (error) { toast({ title: t("error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("adminWinnersNotified") });
    loadWinners();
  };

  const distributeReward = async (winnerId: string) => {
    const { data, error } = await (supabase as any).rpc("distribute_season_reward", { p_winner_id: winnerId });
    if (error || (data && !data.success)) {
      toast({ title: t("error"), description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    toast({ title: t("adminWinnersDistributed") });
    loadWinners();
  };

  const proposeMeeting = async (winnerId: string) => {
    const d = meetingDraft[winnerId];
    if (!d?.when) return;
    const { data, error } = await (supabase as any).rpc("propose_reward_meeting", {
      p_winner_id: winnerId,
      p_when: new Date(d.when).toISOString(),
      p_location: d.location || null,
      p_notes: d.notes || null,
    });
    if (error || (data && !data.success)) {
      toast({ title: t("error"), description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    toast({ title: t("rewardMeetingProposedToast") });
    setMeetingDraft(p => ({ ...p, [winnerId]: { when: "", location: "", notes: "" } }));
    loadWinners();
  };

  const acceptCounter = async (winnerId: string) => {
    const { data, error } = await (supabase as any).rpc("confirm_counter_meeting", { p_winner_id: winnerId });
    if (error || (data && !data.success)) {
      toast({ title: t("error"), description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    toast({ title: t("rewardMeetingConfirmed") });
    loadWinners();
  };

  const markReceived = async (winnerId: string) => {
    const { data, error } = await (supabase as any).rpc("mark_reward_received", { p_winner_id: winnerId });
    if (error || (data && !data.success)) {
      toast({ title: t("error"), description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    toast({ title: t("adminWinnersReceived") });
    loadWinners();
  };

  const availableRanks = rewards.map(r => r.rank_position).filter(rp => !winners.some(w => w.rank_position === rp));
  const someUnnotified = winners.some(w => !w.notified_winner_at);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="border-yellow-500 text-yellow-500">{t("adminWinnersStatusPending")}</Badge>;
      case "distributed": return <Badge className="bg-blue-500 text-white">{t("adminWinnersStatusDistributed")}</Badge>;
      case "received": return <Badge className="bg-green-500 text-white">{t("adminWinnersStatusReceived")}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleString() : "—";

  if (loading) return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" /> {t("adminWinnersTitle")}
        </h4>
        <div className="flex gap-2 flex-wrap">
          {isPast && availableRanks.length > 0 && (
            <Button size="sm" variant="default" className="text-xs" onClick={autoComputeWinners}>
              <Sparkles className="w-3 h-3 mr-1" />{t("adminWinnersAuto")}
            </Button>
          )}
          {isPast && winners.length > 0 && someUnnotified && (
            <Button size="sm" variant="outline" className="text-xs" onClick={notifyAll}>
              <Bell className="w-3 h-3 mr-1" />{t("adminWinnersNotifyBtn")}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{t("adminWinnersAutoHint")}</p>

      {winners.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-3">{t("adminWinnersNone")}</p>
      ) : (
        <div className="space-y-2 mb-4">
          {winners.map(winner => {
            const reward = rewards.find(r => r.rank_position === winner.rank_position);
            const isPhysical = reward?.reward_type === "physical" || reward?.reward_type === "mystery";
            const draft = meetingDraft[winner.id] || { when: "", location: "", notes: "" };
            return (
              <div key={winner.id} className="p-3 bg-muted/30 rounded-lg space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-sm w-8">#{winner.rank_position}</span>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={winner.avatar_url || ""} />
                    <AvatarFallback>{(winner.user_name || "?")[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium flex-1 min-w-0 truncate">{winner.user_name}</span>
                  {winner.notified_winner_at && <Badge variant="outline" className="text-[10px]"><Bell className="w-2.5 h-2.5 mr-1" />OK</Badge>}
                  {getStatusBadge(winner.reward_status)}
                  {winner.reward_status === "pending" && reward && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => distributeReward(winner.id)}>
                      <Gift className="w-3 h-3 mr-1" />{t("adminWinnersDistribute")}
                    </Button>
                  )}
                </div>

                {winner.reward_status === "distributed" && isPhysical && (
                  <div className="ml-11 p-2 rounded bg-background/50 border border-border space-y-2 text-xs">
                    {winner.meeting_status === "none" && (
                      <>
                        <div className="font-medium flex items-center gap-1"><CalendarClock className="w-3 h-3" />{t("rewardMeetingProposeTitle")}</div>
                        <Input type="datetime-local" value={draft.when}
                          onChange={(e) => setMeetingDraft(p => ({ ...p, [winner.id]: { ...draft, when: e.target.value } }))} />
                        <Input placeholder={t("rewardMeetingLocation")} value={draft.location}
                          onChange={(e) => setMeetingDraft(p => ({ ...p, [winner.id]: { ...draft, location: e.target.value } }))} />
                        <Textarea placeholder={t("rewardMeetingNotes")} value={draft.notes} rows={2}
                          onChange={(e) => setMeetingDraft(p => ({ ...p, [winner.id]: { ...draft, notes: e.target.value } }))} />
                        <Button size="sm" onClick={() => proposeMeeting(winner.id)} disabled={!draft.when}>
                          {t("rewardMeetingProposeBtn")}
                        </Button>
                      </>
                    )}
                    {winner.meeting_status === "proposed" && (
                      <div>⏳ {t("rewardMeetingWaitingUser")} <strong>{fmt(winner.meeting_when)}</strong>{winner.meeting_location ? ` — ${winner.meeting_location}` : ""}</div>
                    )}
                    {winner.meeting_status === "counter_proposed" && (
                      <div className="space-y-2">
                        <div>📩 {t("rewardMeetingCounterReceived")} <strong>{fmt(winner.counter_when)}</strong>{winner.counter_location ? ` — ${winner.counter_location}` : ""}</div>
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" onClick={() => acceptCounter(winner.id)}><Check className="w-3 h-3 mr-1" />{t("rewardMeetingAcceptCounter")}</Button>
                          <Input type="datetime-local" value={draft.when} className="w-auto"
                            onChange={(e) => setMeetingDraft(p => ({ ...p, [winner.id]: { ...draft, when: e.target.value } }))} />
                          <Button size="sm" variant="outline" onClick={() => proposeMeeting(winner.id)} disabled={!draft.when}>
                            {t("rewardMeetingProposeAnother")}
                          </Button>
                        </div>
                      </div>
                    )}
                    {winner.meeting_status === "confirmed" && (
                      <div className="space-y-2">
                        <div>✅ {t("rewardMeetingFinal")} <strong>{fmt(winner.meeting_when)}</strong>{winner.meeting_location ? ` — ${winner.meeting_location}` : ""}</div>
                        <Button size="sm" variant="outline" className="text-xs text-green-600" onClick={() => markReceived(winner.id)}>
                          <Package className="w-3 h-3 mr-1" />{t("adminWinnersMarkReceived")}
                        </Button>
                      </div>
                    )}
                  </div>
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
