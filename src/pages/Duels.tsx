import { useEffect, useState } from "react";
import SEO from "@/components/seo/SEO";
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
import { useUiPreferences } from "@/hooks/useUiPreferences";
import { formatTz } from "@/lib/datetime";
import { SimplePagination } from "@/components/ui/simple-pagination";
import { usePagination } from "@/hooks/usePagination";
import { SearchBar } from "@/components/ui/search-bar";

interface DuelVotes {
  [duelId: string]: { artist1: number; artist2: number };
}

const Duels = () => {
  const { t, language } = useLanguage();
  const { prefs } = useUiPreferences();
  const tz = prefs.timezone;
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
  const [search, setSearch] = useState("");

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
      
      // Fetch public duel replays + enrich with both artists info
      const { data: replayData } = await supabase
        .from("replay_videos")
        .select("*")
        .eq("source_type", "duel")
        .eq("is_public", true)
        .order("recorded_date", { ascending: false });

      if (replayData && replayData.length > 0) {
        const duelIds = replayData.map(r => r.duel_id).filter(Boolean) as string[];
        let duelMap = new Map<string, any>();
        if (duelIds.length > 0) {
          const { data: dRows } = await supabase
            .from("duels")
            .select("id, artist1_id, artist2_id, winner_id")
            .in("id", duelIds);
          const allArtistIds = [...new Set((dRows || []).flatMap(d => [d.artist1_id, d.artist2_id]))];
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", allArtistIds);
          const pMap = new Map((profs || []).map(p => [p.id, p]));
          duelMap = new Map((dRows || []).map(d => [d.id, {
            ...d,
            artist1: pMap.get(d.artist1_id) || null,
            artist2: pMap.get(d.artist2_id) || null,
          }]));
        }
        const enriched = replayData.map(r => ({
          ...r,
          duel: r.duel_id ? duelMap.get(r.duel_id) : null,
        }));
        setDuelReplays(enriched);
      } else {
        setDuelReplays([]);
      }

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

  const matchesDuelSearch = (d: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return d.artist1?.full_name?.toLowerCase().includes(q) || d.artist2?.full_name?.toLowerCase().includes(q);
  };
  const liveDuels = duels.filter(d => d.status === "live").filter(matchesDuelSearch);
  const upcomingDuels = duels.filter(d => d.status === "upcoming").filter(matchesDuelSearch);
  const endedDuels = duels.filter(d => d.status === "ended").filter(matchesDuelSearch);
  const filteredDuelReplays = duelReplays.filter((r: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.title?.toLowerCase().includes(q) || r.duel?.artist1?.full_name?.toLowerCase().includes(q) || r.duel?.artist2?.full_name?.toLowerCase().includes(q);
  });

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
            <div className="flex items-center gap-1 mb-2 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              {formatTz(duel.scheduled_time, "dd MMM yyyy HH:mm", { timezone: tz, language })}
            </div>
          )}

          <div className="mb-4">
            {Number(duel.ticket_price) > 0 ? (
              <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/40 border">
                {t("duelPaid")} • {Number(duel.ticket_price).toLocaleString()} {t("creditUnit")}
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/40 border">
                {t("duelFree")}
              </Badge>
            )}
          </div>

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

  const PaginatedDuelList = ({ list, emptyMessage }: { list: any[]; emptyMessage: string }) => {
    const { page, setPage, pageCount, paginated } = usePagination(list, 9);
    if (list.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }
    return (
      <>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paginated.map(renderDuelCard)}
        </div>
        <SimplePagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Duels en direct — Duel Music" description="Découvrez tous les duels musicaux en cours et à venir. Votez en direct pour votre artiste favori et faites-le gagner." path="/duels" />
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

          <SearchBar value={search} onChange={setSearch} placeholder={`${t("search") || "Rechercher"}...`} />

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
                {t("tabReplays")} ({filteredDuelReplays.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="live">
              <PaginatedDuelList list={liveDuels} emptyMessage={t("noDuelsLive")} />
            </TabsContent>
            <TabsContent value="upcoming">
              <PaginatedDuelList list={upcomingDuels} emptyMessage={t("noDuelsUpcoming")} />
            </TabsContent>
            <TabsContent value="replays">
              <PaginatedDuelReplays
                replays={filteredDuelReplays}
                navigate={navigate}
                currentUserId={currentUserId}
                setShowAuthDialog={setShowAuthDialog}
                tz={tz}
                language={language}
                t={t}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <AuthRequiredDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
      <Footer />
    </div>
  );
};

const PaginatedDuelReplays = ({ replays, navigate, currentUserId, setShowAuthDialog, tz, language, t }: any) => {
  const { page, setPage, pageCount, paginated } = usePagination(replays, 9);
  if (replays.length === 0) {
    return (
      <div className="text-center py-12">
        <Video className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t("noDuelReplays")}</p>
      </div>
    );
  }
  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {paginated.map((replay: any) => (
          <Card
            key={replay.id}
            className="group hover:shadow-glow transition-all bg-card border-border overflow-hidden cursor-pointer"
            onClick={() => {
              if (!currentUserId) { setShowAuthDialog(true); return; }
              navigate(`/replay/${replay.id}`);
            }}
          >
            <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/20 via-background to-accent/20">
              {replay.duel?.artist1 || replay.duel?.artist2 ? (
                <div className="absolute inset-0 flex">
                  <div className="flex-1 relative overflow-hidden">
                    {replay.duel?.artist1?.avatar_url ? (
                      <img
                        src={replay.duel.artist1.avatar_url}
                        alt={replay.duel.artist1.full_name}
                        className="w-full h-full object-cover"
                        style={{ clipPath: "polygon(0 0, 100% 0, 85% 100%, 0 100%)" }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-primary" style={{ clipPath: "polygon(0 0, 100% 0, 85% 100%, 0 100%)" }} />
                    )}
                  </div>
                  <div className="flex-1 relative overflow-hidden -ml-6">
                    {replay.duel?.artist2?.avatar_url ? (
                      <img
                        src={replay.duel.artist2.avatar_url}
                        alt={replay.duel.artist2.full_name}
                        className="w-full h-full object-cover"
                        style={{ clipPath: "polygon(15% 0, 100% 0, 100% 100%, 0 100%)" }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-electric" style={{ clipPath: "polygon(15% 0, 100% 0, 100% 100%, 0 100%)" }} />
                    )}
                  </div>
                </div>
              ) : replay.thumbnail_url ? (
                <img src={replay.thumbnail_url} alt={replay.title} className="w-full h-full object-cover" />
              ) : null}

              <div className="absolute inset-0 bg-background/30 group-hover:bg-background/10 transition-all flex items-center justify-center">
                <div className="rounded-full bg-background/70 backdrop-blur-sm p-4 group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-foreground" fill="currentColor" />
                </div>
              </div>

              <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground shadow-lg">
                <Trophy className="w-3 h-3 mr-1" />
                VS
              </Badge>

              <Badge className="absolute bottom-2 right-2 bg-background/80 text-foreground">
                <Clock className="w-3 h-3 mr-1" />
                {replay.duration}
              </Badge>

              {replay.duel?.artist1 && replay.duel?.artist2 && (
                <div className="absolute bottom-2 left-2 right-16 flex items-center gap-1 text-xs text-foreground font-semibold drop-shadow-lg truncate">
                  <span className="truncate max-w-[40%]">{replay.duel.artist1.full_name}</span>
                  <span className="text-accent">⚔</span>
                  <span className="truncate max-w-[40%]">{replay.duel.artist2.full_name}</span>
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-2 text-foreground line-clamp-1">{replay.title}</h3>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{replay.views_count || 0} {t("views")}</span>
                </div>
                <span>{formatTz(replay.recorded_date, "d MMM yyyy", { timezone: tz, language })}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <SimplePagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </>
  );
};

export default Duels;
