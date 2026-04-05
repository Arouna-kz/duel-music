import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { Play, Eye, ArrowLeft, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Replay {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration: string;
  views_count: number;
  recorded_date: string;
  is_premium: boolean;
  duel_id: string | null;
}

const MyReplays = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [replays, setReplays] = useState<Replay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyReplays();
  }, []);

  const loadMyReplays = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get duels where user is artist1, artist2, or manager
      const { data: duels } = await supabase
        .from("duels")
        .select("id")
        .or(`artist1_id.eq.${user.id},artist2_id.eq.${user.id},manager_id.eq.${user.id}`);

      // Get concert replays where user is the artist/creator
      const { data: concertReplays } = await supabase
        .from("replay_videos")
        .select("*")
        .or(`created_by.eq.${user.id},artist_id.eq.${user.id}`)
        .order("recorded_date", { ascending: false });

      let duelReplays: Replay[] = [];
      if (duels && duels.length > 0) {
        const duelIds = duels.map(d => d.id);
        const { data } = await supabase
          .from("replay_videos")
          .select("*")
          .in("duel_id", duelIds)
          .order("recorded_date", { ascending: false });
        duelReplays = (data || []) as Replay[];
      }

      // Merge and deduplicate
      const allReplays = [...duelReplays, ...(concertReplays || []) as Replay[]];
      const uniqueMap = new Map(allReplays.map(r => [r.id, r]));
      setReplays(Array.from(uniqueMap.values()));
    } catch (error) {
      console.error("Error loading replays:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/profile")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au profil
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Mes Replays
          </h1>
          <p className="text-xl text-muted-foreground">
            Revoyez vos performances passées
          </p>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : replays.length === 0 ? (
          <div className="text-center py-16">
            <Play className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucun replay disponible</h3>
            <p className="text-muted-foreground mb-4">
              Vos replays apparaîtront ici après vos duels
            </p>
            <Button onClick={() => navigate("/duels")}>
              Voir les duels
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {replays.map((replay) => (
              <Card 
                key={replay.id} 
                className="group hover:shadow-glow transition-all bg-card border-border overflow-hidden cursor-pointer"
                onClick={() => navigate(`/replay/${replay.id}`)}
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
                  {replay.is_premium && (
                    <Badge className="absolute top-2 right-2 bg-amber-500 text-white">
                      Premium
                    </Badge>
                  )}
                  <Badge className="absolute bottom-2 right-2 bg-background/80 text-foreground">
                    <Clock className="w-3 h-3 mr-1" />
                    {replay.duration}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-2 text-foreground">{replay.title}</h3>
                  {replay.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {replay.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{formatCount(replay.views_count)} vues</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(replay.recorded_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default MyReplays;
