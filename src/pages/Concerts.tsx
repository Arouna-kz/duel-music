import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar, MapPin, Ticket, Radio, Play, Video, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConcertReplayCard } from "@/components/concert/ConcertReplayCard";
import { ConcertReplayPlayer } from "@/components/concert/ConcertReplayPlayer";
import { AuthRequiredDialog } from "@/components/auth/AuthRequiredDialog";

const Concerts = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const dateLocale = language === "fr" ? fr : enUS;
  const [selectedReplay, setSelectedReplay] = useState<any | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id || null));
  }, []);

  const { data: concerts = [], isLoading: isConcertsLoading } = useQuery({
    queryKey: ["all-concerts", language],
    queryFn: async () => {
      const { data: regularConcerts, error: regularError } = await supabase
        .from("concerts")
        .select("*")
        .order("scheduled_date", { ascending: true });
      if (regularError) throw regularError;

      const { data: artistConcerts, error: artistError } = await supabase
        .from("artist_concerts")
        .select("*")
        .order("scheduled_date", { ascending: true });
      if (artistError) throw artistError;

      const artistIds = artistConcerts?.map(c => c.artist_id) || [];
      let artistNames: Record<string, string> = {};
      if (artistIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", artistIds);
        const { data: artistProfiles } = await supabase.from("artist_profiles").select("user_id, stage_name").in("user_id", artistIds);
        profiles?.forEach(p => {
          const ap = artistProfiles?.find(a => a.user_id === p.id);
          artistNames[p.id] = ap?.stage_name || p.full_name || t("artistDefault");
        });
      }

      const mappedArtistConcerts = artistConcerts?.map(c => ({
        id: c.id, title: c.title, artist_name: artistNames[c.artist_id] || t("artistDefault"),
        description: c.description, scheduled_date: c.scheduled_date,
        scheduled_time: new Date(c.scheduled_date).toLocaleTimeString(language === "fr" ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        location: t("online"), ticket_price: c.ticket_price, max_tickets: c.max_tickets,
        stream_url: c.stream_url, status: c.status, image_url: c.cover_image_url,
        is_artist_concert: true, recording_url: c.recording_url, is_replay_available: c.is_replay_available,
      })) || [];

      return [
        ...(regularConcerts?.map(c => ({ ...c, is_artist_concert: false, recording_url: c.recording_url, is_replay_available: c.is_replay_available })) || []),
        ...mappedArtistConcerts
      ].sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
    },
  });

  const { data: publicReplayRows = [], isLoading: isReplayLoading } = useQuery({
    queryKey: ["public-concert-replays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("replay_videos")
        .select("id, concert_id, title, thumbnail_url, video_url, recorded_date, replay_price")
        .eq("source_type", "concert")
        .eq("is_public", true)
        .order("recorded_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = isConcertsLoading || isReplayLoading;

  const liveConcerts = concerts.filter(c => c.status === "live");

  // Presence-based viewer counts for live concerts
  useEffect(() => {
    const liveIds = liveConcerts.map(c => c.id);
    if (liveIds.length === 0) return;

    const channels = liveIds.map(concertId => {
      const channel = supabase.channel(`concert-presence-list-${concertId}`, {
        config: { presence: { key: crypto.randomUUID() } }
      });
      channel
        .on("presence", { event: "sync" }, () => {
          setViewerCounts(prev => ({
            ...prev,
            [concertId]: Object.keys(channel.presenceState()).length
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
  }, [liveConcerts.map(c => c.id).join(",")]);
  const upcomingConcerts = concerts.filter(c => c.status === "upcoming" || c.status === "scheduled");
  const concertById = new Map(concerts.map((concert) => [concert.id, concert]));
  const replayConcerts = publicReplayRows
    .map((replay) => {
      if (!replay.video_url) return null;
      const sourceConcert = replay.concert_id ? concertById.get(replay.concert_id) : undefined;

      return {
        ...(sourceConcert || {}),
        id: replay.concert_id || replay.id,
        replay_id: replay.id,
        title: replay.title || sourceConcert?.title || "Concert",
        artist_name: sourceConcert?.artist_name || t("artistDefault"),
        scheduled_date: sourceConcert?.scheduled_date || replay.recorded_date,
        ticket_price: replay.replay_price ?? sourceConcert?.ticket_price ?? 0,
        image_url: replay.thumbnail_url || sourceConcert?.image_url,
        recording_url: replay.video_url,
        is_replay_available: true,
      };
    })
    .filter(Boolean) as any[];

  const getStatusBadge = (concert: any) => {
    if (concert.status === "live") {
      return <Badge className="bg-red-500 text-white animate-pulse"><Radio className="w-3 h-3 mr-1" />{t("live")}</Badge>;
    }
    return <Badge className="bg-accent text-accent-foreground"><Ticket className="w-3 h-3 mr-1" />{concert.ticket_price} FCFA</Badge>;
  };

  const ConcertCard = ({ concert }: { concert: any }) => (
    <Card
      className={`group hover:shadow-glow transition-all bg-card border-border overflow-hidden cursor-pointer ${concert.status === "live" ? "ring-2 ring-red-500" : ""}`}
      onClick={() => {
        if (!currentUserId) { setShowAuthDialog(true); return; }
        navigate(concert.status === "live" ? `/concert/${concert.id}/live` : `/concert/${concert.id}`);
      }}
    >
      <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: concert.image_url ? `url(${concert.image_url})` : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))' }}>
        {concert.status === "live" && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Play className="w-12 h-12 fill-white text-white" />
          </div>
        )}
      </div>
      <CardContent className="p-6">
        {getStatusBadge(concert)}
        <h3 className="text-2xl font-bold mb-2 text-foreground mt-4">{concert.artist_name}</h3>
        <p className="text-lg text-muted-foreground mb-4">{concert.title}</p>
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{format(new Date(concert.scheduled_date), "dd MMMM yyyy", { locale: dateLocale })} • {concert.scheduled_time}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{concert.location}</span>
          </div>
          {concert.status === "live" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm">{viewerCounts[concert.id] || 0} {t("viewers")}</span>
            </div>
          )}
        </div>
        <Button className={`w-full ${concert.status === "live" ? "bg-red-500 hover:bg-red-600" : "bg-gradient-primary hover:shadow-glow"} transition-all`}>
          {concert.status === "live" ? t("watchLiveConcert") : t("buyTicket")}
        </Button>
      </CardContent>
    </Card>
  );

  const handlePlayReplay = (concert: any, hasAccess: boolean) => {
    if (hasAccess && concert.recording_url) { setSelectedReplay(concert); setShowPlayer(true); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">{t("concertsPageTitle")}</h1>
          <p className="text-xl text-muted-foreground">{t("concertsPageSubtitle")}</p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="overflow-hidden"><Skeleton className="h-48 w-full" /><CardContent className="p-6"><Skeleton className="h-6 w-20 mb-4" /><Skeleton className="h-8 w-3/4 mb-2" /><Skeleton className="h-10 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <Tabs defaultValue={liveConcerts.length > 0 ? "live" : "upcoming"} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="live" className="relative">
                {t("tabLive")} ({liveConcerts.length})
                {liveConcerts.length > 0 && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
              </TabsTrigger>
              <TabsTrigger value="upcoming">{t("tabUpcoming")} ({upcomingConcerts.length})</TabsTrigger>
              <TabsTrigger value="replays" className="flex items-center gap-1"><Video className="w-4 h-4" />{t("tabReplays")} ({replayConcerts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="live">
              {liveConcerts.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{liveConcerts.map(c => <ConcertCard key={c.id} concert={c} />)}</div>
              ) : (
                <div className="text-center py-16"><Radio className="w-16 h-16 mx-auto text-muted-foreground mb-4" /><h3 className="text-xl font-semibold mb-2">{t("noConcertsLive")}</h3></div>
              )}
            </TabsContent>

            <TabsContent value="upcoming">
              {upcomingConcerts.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{upcomingConcerts.map(c => <ConcertCard key={c.id} concert={c} />)}</div>
              ) : (
                <div className="text-center py-16"><Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" /><h3 className="text-xl font-semibold mb-2">{t("noConcertsUpcoming")}</h3></div>
              )}
            </TabsContent>


            <TabsContent value="replays">
              {replayConcerts.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {replayConcerts.map(c => <ConcertReplayCard key={c.id} concert={c} onPlay={handlePlayReplay} />)}
                </div>
              ) : (
                <div className="text-center py-16"><Video className="w-16 h-16 mx-auto text-muted-foreground mb-4" /><h3 className="text-xl font-semibold mb-2">{t("noConcertReplays")}</h3></div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <AuthRequiredDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
      <Footer />
      <ConcertReplayPlayer concert={selectedReplay} open={showPlayer} onClose={() => { setShowPlayer(false); setSelectedReplay(null); }} />
    </div>
  );
};

export default Concerts;
