import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { Play, Lock, Clock, Eye, Crown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useUserSubscription } from "@/hooks/useSubscription";
import { AuthRequiredDialog } from "@/components/auth/AuthRequiredDialog";

const Replays = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const dateLocale = language === "fr" ? fr : enUS;
  const { rules, isProOrAbove } = useUserSubscription();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id || null));
  }, []);

  const { data: replays, isLoading } = useQuery({
    queryKey: ["replays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("replay_videos")
        .select("*")
        .eq("is_public", true)
        .order("recorded_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  };

  const canAccessPremiumReplay = (isPremium: boolean) => {
    if (!isPremium) return true;
    return rules.premium_replays;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            {t("replaysPageTitle")}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t("replaysPageSubtitle")}
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {replays?.map((replay) => {
              const hasAccess = canAccessPremiumReplay(replay.is_premium);
              return (
                <Card 
                  key={replay.id} 
                  className="group hover:shadow-glow transition-all bg-card border-border overflow-hidden cursor-pointer" 
                  onClick={() => {
                    if (!currentUserId) { setShowAuthDialog(true); return; }
                    hasAccess ? navigate(`/replay/${replay.id}`) : navigate("/pricing");
                  }}
                >
                  <div className="relative">
                    <div 
                      className="h-48 bg-cover bg-center relative" 
                      style={{ 
                        backgroundImage: replay.thumbnail_url ? `url(${replay.thumbnail_url})` : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))' 
                      }}
                    >
                      <div className="absolute inset-0 bg-background/40 group-hover:bg-background/20 transition-all flex items-center justify-center">
                        {replay.is_premium && !hasAccess ? (
                          <Lock className="w-12 h-12 text-foreground opacity-90" />
                        ) : (
                          <Play className="w-12 h-12 text-foreground opacity-90" />
                        )}
                      </div>
                      <Badge className="absolute top-2 right-2 bg-background/80 text-foreground">
                        <Clock className="w-3 h-3 mr-1" />
                        {replay.duration}
                      </Badge>
                      {replay.is_premium && (
                        <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground">
                          <Crown className="w-3 h-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                      {replay.is_premium && !hasAccess && (
                        <Badge className="absolute bottom-2 left-2 bg-destructive text-destructive-foreground text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          {t("premiumReplayLocked")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-2 text-foreground">{replay.title}</h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>{format(new Date(replay.recorded_date), "dd MMMM yyyy", { locale: dateLocale })}</span>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{formatCount(replay.views_count)} {t("viewsCount")}</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-gradient-primary hover:shadow-glow transition-all"
                      variant={replay.is_premium && !hasAccess ? "outline" : "default"}
                    >
                      {replay.is_premium && !hasAccess ? (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          {t("upgradeNow")}
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          {t("watch")}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <AuthRequiredDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
      <Footer />
    </div>
  );
};

export default Replays;
