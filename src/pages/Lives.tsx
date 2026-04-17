import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { Radio, Users, Video as VideoIcon, Plus, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { AuthRequiredDialog } from "@/components/auth/AuthRequiredDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Lives = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isArtist, setIsArtist] = useState(false);
  const [liveTitle, setLiveTitle] = useState("");
  const [startingLive, setStartingLive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        setIsArtist(roles?.some(r => r.role === "artist") || false);
      }
    };
    checkUser();
  }, []);

  const { data: lives, isLoading } = useQuery({
    queryKey: ["artist-lives"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_lives")
        .select("*")
        .order("started_at", { ascending: false });
      if (error) throw error;

      const artistIds = [...new Set(data.map(l => l.artist_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", artistIds);
      const { data: artistProfiles } = await supabase
        .from("artist_profiles")
        .select("user_id, stage_name, avatar_url")
        .in("user_id", artistIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const artistMap = new Map(artistProfiles?.map(a => [a.user_id, a]) || []);

      return data.map(l => ({
        ...l,
        artist_name: artistMap.get(l.artist_id)?.stage_name || profileMap.get(l.artist_id)?.full_name || t("artistDefault"),
        artist_avatar: artistMap.get(l.artist_id)?.avatar_url || profileMap.get(l.artist_id)?.avatar_url,
      }));
    },
    refetchInterval: 10000,
  });

  const activeLives = lives?.filter(l => l.status === "live") || [];

  // Presence-based viewer counts for active lives
  useEffect(() => {
    const liveIds = activeLives.map(l => l.id);
    if (liveIds.length === 0) return;

    const channels = liveIds.map(liveId => {
      const channel = supabase.channel(`live-presence-list-${liveId}`, {
        config: { presence: { key: crypto.randomUUID() } }
      });
      channel
        .on("presence", { event: "sync" }, () => {
          setViewerCounts(prev => ({
            ...prev,
            [liveId]: Object.keys(channel.presenceState()).length
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
  }, [activeLives.map(l => l.id).join(",")]);

  const startLive = async () => {
    if (!currentUserId) return;
    setStartingLive(true);
    try {
      const { data, error } = await supabase
        .from("artist_lives")
        .insert({
          artist_id: currentUserId,
          title: liveTitle || t("liveDefault"),
          status: "live",
          room_id: `live-${currentUserId}-${Date.now()}`,
        })
        .select()
        .single();

      if (error) throw error;
      setDialogOpen(false);
      navigate(`/live/${data.id}`);
    } catch (err: any) {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    } finally {
      setStartingLive(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              {t("livesPageTitle")}
            </h1>
            <p className="text-muted-foreground">
              {t("livesPageSubtitle")}
            </p>
          </div>

          {isArtist && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:shadow-glow gap-2">
                  <Plus className="w-5 h-5" />
                  {t("startLive")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("startLiveTitle")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder={t("liveTitlePlaceholder")}
                    value={liveTitle}
                    onChange={(e) => setLiveTitle(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("liveFanDescription")}
                  </p>
                  <Button onClick={startLive} disabled={startingLive} className="w-full bg-gradient-primary">
                    {startingLive ? t("startingLive") : t("beginLive")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {activeLives.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {activeLives.map(live => (
                  <Card
                    key={live.id}
                    className="group hover:shadow-glow transition-all bg-card border-border overflow-hidden cursor-pointer ring-2 ring-red-500/50"
                    onClick={() => {
                      if (!currentUserId) { setShowAuthDialog(true); return; }
                      navigate(`/live/${live.id}`);
                    }}
                  >
                    <div className="relative h-48 bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                      <Avatar className="w-20 h-20 border-4 border-primary">
                        <AvatarImage src={live.artist_avatar} />
                        <AvatarFallback className="text-2xl">{live.artist_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-red-500 text-white animate-pulse">🔴 LIVE</Badge>
                      </div>
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 text-white text-xs rounded-full px-2 py-1">
                        <Users className="w-3 h-3" /> {viewerCounts[live.id] || 0} {t("viewers")}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg text-foreground">{live.artist_name}</h3>
                      <p className="text-sm text-muted-foreground">{live.title || t("liveInProgress")}</p>
                      <Button className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white">
                        <Eye className="w-4 h-4 mr-2" /> {t("watchLive")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Radio className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t("noLivesActive")}</h3>
                <p className="text-muted-foreground">
                  {isArtist ? t("noLivesArtistHint") : t("noLivesFanHint")}
                </p>
              </div>
            )}
          </>
        )}
      </main>
      <AuthRequiredDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
      <Footer />
    </div>
  );
};

export default Lives;
