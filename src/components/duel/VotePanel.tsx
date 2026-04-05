import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { VoteAnimation } from "@/components/animations/VoteAnimation";
import { useUserSubscription } from "@/hooks/useSubscription";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VotePanelProps {
  duelId: string;
  artist1Id: string;
  artist2Id: string;
}

const VotePanel = ({ duelId, artist1Id, artist2Id }: VotePanelProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("1");
  const [loading, setLoading] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [animationData, setAnimationData] = useState<{
    amount: number;
    artistName: string;
    color: string;
  } | null>(null);

  const { rules, currentPlanId, userId } = useUserSubscription();
  const maxVotes = rules.max_votes_per_duel;
  const isUnlimited = maxVotes === -1;
  const votesRemaining = isUnlimited ? Infinity : Math.max(0, maxVotes - voteCount);

  // Count user's votes in this duel
  useEffect(() => {
    if (!userId || isUnlimited) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("duel_votes")
        .select("*", { count: "exact", head: true })
        .eq("duel_id", duelId)
        .eq("user_id", userId);
      setVoteCount(count || 0);
    };
    fetchCount();
  }, [userId, duelId, isUnlimited]);

  const handleVote = async (artistId: string) => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: t("loginRequired"),
        description: t("mustBeLoggedToVote"),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check vote limit
    if (!isUnlimited && votesRemaining <= 0) {
      toast({
        title: t("voteLimitReached"),
        description: t("upgradePlanForMoreVotes"),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const voteAmount = parseFloat(amount);
    if (isNaN(voteAmount) || voteAmount <= 0 || voteAmount > 10000) {
      toast({
        title: t("invalidAmountTitle"),
        description: t("invalidAmountDesc"),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: success, error } = await supabase.rpc("deduct_wallet_and_vote", {
      p_user_id: user.id,
      p_amount: voteAmount,
      p_duel_id: duelId,
      p_artist_id: artistId,
    });

    if (error || !success) {
      toast({
        title: t("errorTitle"),
        description: error ? t("cannotRecordVote") : t("insufficientBalanceShort"),
        variant: "destructive",
      });
    } else {
      setVoteCount((c) => c + 1);
      const color = artistId === artist1Id ? "hsl(var(--primary))" : "hsl(var(--accent))";
      setAnimationData({
        amount: voteAmount,
        artistName: artistId === artist1Id ? t("artist1Default") : t("artist2Default"),
        color,
      });
      setShowAnimation(true);
      setTimeout(() => setShowAnimation(false), 2000);

      toast({
        title: t("voteRecorded"),
        description: `${t("youVoted")} ${voteAmount}€`,
      });
      setAmount("1");
    }

    setLoading(false);
  };

  return (
    <>
      {showAnimation && animationData && (
        <VoteAnimation
          amount={animationData.amount}
          artistName={animationData.artistName}
          color={animationData.color}
        />
      )}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl flex items-center justify-between">
            {t("voteLabel")}
            {!isUnlimited && (
              <Badge variant={votesRemaining > 0 ? "secondary" : "destructive"} className="text-xs">
                {votesRemaining} {t("votesRemainingLabel")}
              </Badge>
            )}
            {isUnlimited && (
              <Badge variant="outline" className="text-xs border-primary text-primary">
                ∞ {t("unlimitedLabel")}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isUnlimited && votesRemaining <= 0 ? (
            <div className="text-center space-y-3 py-4">
              <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("voteLimitReachedDesc")}</p>
              <Button variant="outline" size="sm" onClick={() => navigate("/pricing")}>
                {t("upgradeNow")}
              </Button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  {t("voteAmountLabel")}
                </label>
                <Input
                  type="number"
                  min="1"
                  step="0.5"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mb-4"
                />
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => handleVote(artist1Id)}
                  disabled={loading}
                  className="w-full bg-gradient-primary hover:shadow-glow"
                >
                  {t("voteArtist1")}
                </Button>
                <Button
                  onClick={() => handleVote(artist2Id)}
                  disabled={loading}
                  className="w-full bg-gradient-electric hover:shadow-glow"
                >
                  {t("voteArtist2")}
                </Button>
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">{t("quickVotes")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {["1", "5", "10"].map((val) => (
                    <Button
                      key={val}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(val)}
                    >
                      {val}€
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default VotePanel;
