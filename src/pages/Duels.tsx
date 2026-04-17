import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { Flame, Users, Trophy, Calendar, Play, Eye, Clock, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthRequiredDialog } from "@/components/auth/AuthRequiredDialog";

interface DuelVotes {
  [duelId: string]: { artist1: number; artist2: number };
}

const Duels = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [duels, setDuels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState<DuelVotes>({});
  const [replays, setReplays] = useState<Record<string, string>>({});
  const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [duelReplays, setDuelReplays] = useState<any[]>([]);

  const fetchVotes = async (duelIds: string[], duelsData: any[]) => {
    if (duelIds.length === 0) return;
    const { data } = await supabase
      .from("duel_votes")
      .select("duel_id, artist_id, amount")
      .in("duel_id", duelIds);

    if (data) {
      const voteMap: DuelVotes = {};
      duelsData.forEach((d) => {
        const duelVotes = data.filter((v) => v.duel_id === d.id);
        voteMap[d.id] = {
          artist1: duelVotes
            .filter((v) => v.artist_id === d.artist1_id)
            .reduce((sum, v) => sum + Number(v.amount), 0),
          artist2: duelVotes
            .filter((v) => v.artist_id === d.artist2_id)
            .reduce((sum, v) => sum + Number(v.amount), 0),
        };
      });
      setVotes(voteMap);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    const fetchDuels = async () => {
      const { data: duelsData } = await supabase
        .from("duels")
        .select("*")
        .order("created_at", { ascending: false });

      if (duelsData) {
        const artistIds = [...new Set(duelsData.flatMap(d => [d.artist1_id, d.artist2_id]))];
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", artistIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const enrichedDuels = duelsData.map(duel => ({
          ...duel,
          artist1: profilesMap.get(duel.artist1_id) || null,
          artist2: profilesMap.get(duel.artist2_id) || null,
        }));

        setDuels(enrichedDuels);
        await fetchVotes(duelsData.map(d => d.id), duelsData);

        const endedIds = duelsData.filter(d => d.status === "ended").map(d => d.id);
        if (endedIds.length > 0) {
          const { data: replayData } = await supabase
            .from("replay_videos")
            .select("id, duel_id")
            .in("duel_id", endedIds);
          if (replayData) {
            const replayMap: Record<string, string> = {};
            replayData.forEach(r => { if (r.duel_id) replayMap[r.duel_id] = r.id; });
            setReplays(replayMap);
          }
        }
      }
      
      // Fetch public duel replays
      const { data: replayData } = await supabase
        .from("replay_videos")
        .select("*")
        .eq("source_type", "duel")
        .eq("is_public", true)
        .order("recorded_date", { ascending: false });
      setDuelReplays(replayData || []);

      setLoading(false);
    };

    fetchDuels();

    const channel = supabase
      .channel("duels-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "duels" }, () => { fetchDuels(); })
      .subscribe();

    const votesChannel = supabase
      .channel("duels-votes-global")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "duel_votes" }, () => { fetchDuels(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(votesChannel);
    };
  }, []);

  // Presence-based viewer count for live duels
  useEffect(() => {
    const liveIds = duels.filter(d => d.status === "live").map(d => d.id);
    if (liveIds.length === 0) return;

    const channels = liveIds.map(duelId => {
      const channel = supabase.channel(`duel-presence-list-${duelId}`, {
        config: { presence: { key: crypto.randomUUID() } }
      });
      channel
        .on("presence", { event: "sync" }, () => {
          setViewerCounts(prev => ({
            ...prev,
            [duelId]: Object.keys(channel.presenceState()).length
          }));
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ online_at: new Date().toISOString() });
          }
        });
      return channel;
    });

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [duels]);

  const liveDuels = duels.filter(d => d.status === "live");
  const upcomingDuels = duels.filter(d => d.status === "upcoming");
  const endedDuels = duels.filter(d => d.status === "ended");

  const dateLocaleStr = language === "fr" ? "fr-FR" : "en-US";

  const renderDuelCard = (duel: any) => {
    const duelVotes = votes[duel.id] || { artist1: 0, artist2: 0 };
    const totalVotes = duelVotes.artist1 + duelVotes.artist2;

    return (
      <Card key={duel.id} className="group hover:shadow-glow transition-all bg-card border-border">
        <CardContent className="p-6">
          {duel.status === "live" && (
            <Badge className="mb-4 bg-destructive text-destructive-foreground animate-pulse">
              <Flame className="w-3 h-3 mr-1" />
              {t("live")}
            </Badge>
          )}
          {duel.status === "upcoming" && (
            <Badge className="mb-4 bg-secondary text-secondary-foreground">
              {t("upcoming")}
            </Badge>
          )}
          {duel.status === "ended" && (
            <Badge className="mb-4" variant="outline">
              {t("ended")}
            </Badge>
          )}

          {duel.scheduled_time && (
            <div className="flex items-center gap-1 mb-4 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(duel.scheduled_time).toLocaleDateString(dateLocaleStr, {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div className="text-center flex-1">
              {duel.artist1?.avatar_url ? (
                <img src={duel.artist1.avatar_url} alt={duel.artist1.full_name} className="w-16 h-16 mx-auto mb-2 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-primary" />
              )}
              <h3 className="font-bold text-foreground">{duel.artist1?.full_name || t("artist1Default")}</h3>
              <p className="text-sm font-semibold text-primary">{duelVotes.artist1} {t("votes")}</p>
            </div>

            <div className="px-4">
              <Trophy className="w-8 h-8 text-accent" />
            </div>

            <div className="text-center flex-1">
              {duel.artist2?.avatar_url ? (
                <img src={duel.artist2.avatar_url} alt={duel.artist2.full_name} className="w-16 h-16 mx-auto mb-2 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-electric" />
              )}
              <h3 className="font-bold text-foreground">{duel.artist2?.full_name || t("artist2Default")}</h3>
              <p className="text-sm font-semibold text-primary">{duelVotes.artist2} {t("votes")}</p>
            </div>
          </div>

          {totalVotes > 0 && (
            <div className="mb-4 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-primary transition-all"
                style={{ width: `${(duelVotes.artist1 / totalVotes) * 100}%` }}
              />
            </div>
          )}

          {duel.status === "live" && (
            <div className="flex items-center justify-center gap-2 mb-4 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm">{(viewerCounts[duel.id] || 0).toLocaleString()} {t("viewers")}</span>
            </div>
          )}

          <Button
            onClick={() => {
              if (!currentUserId) {
                setShowAuthDialog(true);
                return;
              }
              if (duel.status === "ended" && replays[duel.id]) {
                navigate(`/replay/${replays[duel.id]}`);
              } else if (duel.status === "ended") {
                navigate(`/replays`);
              } else {
                navigate(`/duel/${duel.id}`);
              }
            }}
            className="w-full bg-gradient-primary hover:shadow-glow transition-all"
          >
            {duel.status === "live" ? t("vote") : duel.status === "ended" ? t("viewReplay") : t("viewDuel")}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderDuelList = (duelsList: any[], emptyMessage: string) => {
    if (duelsList.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {duelsList.map(renderDuelCard)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            {t("duelsPageTitle")}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t("duelsPageSubtitle")}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t("loadingDuels")}</p>
          </div>
        ) : (
          <Tabs defaultValue="live" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="live" className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                {t("tabLive")} ({liveDuels.length})
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t("tabUpcoming")} ({upcomingDuels.length})
              </TabsTrigger>
              <TabsTrigger value="replays" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                {t("tabReplays")} ({duelReplays.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="live">
              {renderDuelList(liveDuels, t("noDuelsLive"))}
            </TabsContent>
            <TabsContent value="upcoming">
              {renderDuelList(upcomingDuels, t("noDuelsUpcoming"))}
            </TabsContent>
            <TabsContent value="replays">
              {duelReplays.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("noDuelReplays")}</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {duelReplays.map((replay) => (
                    <Card
                      key={replay.id}
                      className="group hover:shadow-glow transition-all bg-card border-border overflow-hidden cursor-pointer"
                      onClick={() => {
                        if (!currentUserId) { setShowAuthDialog(true); return; }
                        navigate(`/replay/${replay.id}`);
                      }}
                    >
                      <div
                        className="h-48 bg-cover bg-center relative"
                        style={{
                          backgroundImage: replay.thumbnail_url ? `url(${replay.thumbnail_url})` : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))'
                        }}
                      >
                        <div className="absolute inset-0 bg-background/40 group-hover:bg-background/20 transition-all flex items-center justify-center">
                          <Play className="w-12 h-12 text-foreground opacity-90" />
                        </div>
                        <Badge className="absolute bottom-2 right-2 bg-background/80 text-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          {replay.duration}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-bold text-lg mb-2 text-foreground">{replay.title}</h3>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{replay.views_count || 0} {t("views")}</span>
                          </div>
                          <span>{new Date(replay.recorded_date).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      <AuthRequiredDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
      <Footer />
    </div>
  );
};

export default Duels;
