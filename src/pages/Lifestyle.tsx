import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { Play, Heart, MessageCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { AuthRequiredDialog } from "@/components/auth/AuthRequiredDialog";
import { ShareButton } from "@/components/sharing/ShareButton";
import { toast } from "sonner";

const Lifestyle = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [likingVideoId, setLikingVideoId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id || null));
  }, []);

  const { data: videos, isLoading } = useQuery({
    queryKey: ["lifestyle-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lifestyle_videos")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      if (data && data.length > 0) {
        const videoIds = data.map(v => v.id);
        const { data: comments } = await supabase
          .from("comments")
          .select("content_id")
          .eq("content_type", "lifestyle")
          .in("content_id", videoIds);

        const commentCounts: Record<string, number> = {};
        comments?.forEach(c => {
          commentCounts[c.content_id] = (commentCounts[c.content_id] || 0) + 1;
        });

        return data.map(v => ({
          ...v,
          comments_count: commentCounts[v.id] || v.comments_count,
        }));
      }

      return data;
    },
    refetchInterval: 15000,
  });

  // Fetch which videos the current user has liked
  const { data: likedVideoIds } = useQuery({
    queryKey: ["lifestyle-likes", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data } = await supabase
        .from("video_interactions")
        .select("video_id")
        .eq("user_id", currentUserId)
        .eq("interaction_type", "like");
      return data?.map(d => d.video_id) || [];
    },
    enabled: !!currentUserId,
  });

  const toggleLike = async (videoId: string, currentLikes: number) => {
    if (!currentUserId) {
      setShowAuthDialog(true);
      return;
    }
    if (likingVideoId) return;
    setLikingVideoId(videoId);

    const alreadyLiked = likedVideoIds?.includes(videoId);

    try {
      if (alreadyLiked) {
        await supabase.from("video_interactions").delete()
          .eq("video_id", videoId).eq("user_id", currentUserId).eq("interaction_type", "like");
        await supabase.from("lifestyle_videos").update({ likes_count: Math.max(0, currentLikes - 1) }).eq("id", videoId);
      } else {
        await supabase.from("video_interactions").insert({ video_id: videoId, user_id: currentUserId, interaction_type: "like" });
        await supabase.from("lifestyle_videos").update({ likes_count: currentLikes + 1 }).eq("id", videoId);
      }
      queryClient.invalidateQueries({ queryKey: ["lifestyle-videos"] });
      queryClient.invalidateQueries({ queryKey: ["lifestyle-likes", currentUserId] });
    } catch {
      toast.error(t("loginToInteract"));
    } finally {
      setLikingVideoId(null);
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
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            {t("lifestylePageTitle")}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t("lifestylePageSubtitle")}
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[9/16] w-full" />
                <CardContent className="p-3">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-2" />
                  <Skeleton className="h-3 w-1/3 mb-3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {videos?.map((video) => {
              const isLiked = likedVideoIds?.includes(video.id);
              return (
                <Card key={video.id} className="group hover:shadow-glow transition-all bg-card border-border overflow-hidden">
                  <div 
                    className="relative cursor-pointer"
                    onClick={() => { if (!currentUserId) { setShowAuthDialog(true); return; } navigate(`/video/${video.id}`); }}
                  >
                    <div 
                      className="aspect-[9/16] relative bg-cover bg-center" 
                      style={{ 
                        backgroundImage: video.thumbnail_url ? `url(${video.thumbnail_url})` : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))' 
                      }}
                    >
                      <div className="absolute inset-0 bg-background/40 group-hover:bg-background/20 transition-all flex items-center justify-center">
                        <Play className="w-12 h-12 text-foreground opacity-90" />
                      </div>
                      <Badge className="absolute bottom-2 right-2 bg-background/80 text-foreground">
                        {video.duration}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-bold text-sm mb-1 text-foreground truncate">{video.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{video.artist_name}</p>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <Eye className="w-3 h-3" />
                      <span>{formatCount(video.views_count)} {t("viewsCount")}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-muted-foreground">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-2 ${isLiked ? "text-red-500" : ""}`}
                        disabled={likingVideoId === video.id}
                        onClick={(e) => { e.stopPropagation(); toggleLike(video.id, video.likes_count); }}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                        <span className="text-xs ml-1">{formatCount(video.likes_count)}</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={(e) => { e.stopPropagation(); if (!currentUserId) { setShowAuthDialog(true); return; } navigate(`/video/${video.id}`); }}>
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs ml-1">{video.comments_count}</span>
                      </Button>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ShareButton
                          contentType="lifestyle"
                          contentId={video.id}
                          title={video.title}
                        />
                      </div>
                    </div>
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

export default Lifestyle;
