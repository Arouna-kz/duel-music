import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Clock, Eye, Lock, Play, Heart, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { useEffect, useState, useRef } from "react";
import CommentSection from "@/components/comments/CommentSection";

const ReplayDetail = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const dateLocale = language === "fr" ? fr : enUS;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id || null));
  }, []);

  const { data: replay, isLoading } = useQuery({
    queryKey: ["replay", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("replay_videos").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: hasAccess } = useQuery({
    queryKey: ["replay-access", id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data, error } = await supabase.from("replay_access").select("*").eq("replay_id", id).eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  // Likes
  const { data: likesCount = 0 } = useQuery({
    queryKey: ["replay-likes-count", id],
    queryFn: async () => {
      const { count } = await supabase.from("replay_likes").select("*", { count: "exact", head: true }).eq("replay_id", id);
      return count || 0;
    },
  });

  const { data: userLiked = false } = useQuery({
    queryKey: ["replay-user-liked", id, currentUserId],
    queryFn: async () => {
      if (!currentUserId) return false;
      const { data } = await supabase.from("replay_likes").select("id").eq("replay_id", id).eq("user_id", currentUserId).maybeSingle();
      return !!data;
    },
    enabled: !!currentUserId,
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("Not authenticated");
      if (userLiked) {
        await supabase.from("replay_likes").delete().eq("replay_id", id).eq("user_id", currentUserId);
      } else {
        await supabase.from("replay_likes").insert({ replay_id: id, user_id: currentUserId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["replay-likes-count", id] });
      queryClient.invalidateQueries({ queryKey: ["replay-user-liked", id, currentUserId] });
    },
  });

  // Comments count
  const { data: commentsCount = 0 } = useQuery({
    queryKey: ["replay-comments-count", id],
    queryFn: async () => {
      const { count } = await supabase.from("comments").select("*", { count: "exact", head: true }).eq("content_id", id).eq("content_type", "replay");
      return count || 0;
    },
  });

  // Increment views once
  const viewIncrementedRef = useRef(false);
  useEffect(() => {
    if (replay && (!replay.is_premium || hasAccess) && !viewIncrementedRef.current) {
      viewIncrementedRef.current = true;
      supabase.rpc("increment_replay_views" as any, { p_replay_id: id }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["replay", id] });
      });
    }
  }, [replay, hasAccess, id]);

  const unlockReplay = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      const { error } = await supabase.from("replay_access").insert({ replay_id: id, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["replay-access", id] });
      toast.success(t("replayUnlocked"));
    },
    onError: () => { toast.error(t("unlockError")); },
  });

  const formatCount = (count: number) => count >= 1000 ? `${(count / 1000).toFixed(0)}K` : count.toString();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid lg:grid-cols-2 gap-8">
            <Skeleton className="h-96 w-full rounded-lg" />
            <div className="space-y-6"><Skeleton className="h-12 w-3/4" /><Skeleton className="h-6 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-12 w-full" /></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!replay) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <p className="text-center text-muted-foreground">{t("replayNotFound")}</p>
        </main>
        <Footer />
      </div>
    );
  }

  const canWatch = !replay.is_premium || hasAccess;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("back")}
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="relative">
            {canWatch && isPlaying ? (
              <div className="rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  src={replay.video_url}
                  controls
                  autoPlay
                  className="w-full max-h-[500px] object-contain"
                  poster={replay.thumbnail_url || undefined}
                  onEnded={() => setIsPlaying(false)}
                />
              </div>
            ) : (
              <div className="h-96 rounded-lg bg-cover bg-center relative" style={{ backgroundImage: replay.thumbnail_url ? `url(${replay.thumbnail_url})` : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))' }}>
                {!canWatch && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg"><Lock className="w-16 h-16 text-muted-foreground" /></div>
                )}
                {canWatch && (
                  <div
                    className="absolute inset-0 bg-background/20 hover:bg-background/10 transition-all flex items-center justify-center rounded-lg cursor-pointer"
                    onClick={() => setIsPlaying(true)}
                  >
                    <Play className="w-16 h-16 text-foreground" />
                  </div>
                )}
              </div>
            )}
            {replay.is_premium && <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground">Premium</Badge>}
            <Badge className="absolute top-4 right-4 bg-background/80 text-foreground"><Clock className="w-3 h-3 mr-1" />{replay.duration}</Badge>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">{replay.title}</h1>
              {replay.description && <p className="text-muted-foreground mb-4">{replay.description}</p>}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1"><Eye className="w-4 h-4" /><span>{formatCount(replay.views_count)} {t("views")}</span></div>
                <span>•</span>
                <button
                  onClick={() => currentUserId ? toggleLike.mutate() : toast.error(t("loginRequired"))}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Heart className={`w-4 h-4 ${userLiked ? "fill-red-500 text-red-500" : ""}`} />
                  <span>{formatCount(likesCount)}</span>
                </button>
                <span>•</span>
                <div className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /><span>{formatCount(commentsCount)}</span></div>
                <span>•</span>
                <span>{format(new Date(replay.recorded_date), "dd MMMM yyyy", { locale: dateLocale })}</span>
              </div>
            </div>

            <Card className="bg-card/50 border-border">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">{t("information")}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("duration")}</span><span className="font-medium">{replay.duration}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("recordingDate")}</span><span className="font-medium">{format(new Date(replay.recorded_date), "dd MMMM yyyy", { locale: dateLocale })}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("viewsCount")}</span><span className="font-medium">{formatCount(replay.views_count)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("access")}</span><Badge variant={replay.is_premium ? "default" : "secondary"}>{replay.is_premium ? "Premium" : t("free")}</Badge></div>
                </div>
              </CardContent>
            </Card>

            {canWatch ? (
              <Button size="lg" className="w-full bg-gradient-primary hover:shadow-glow transition-all text-lg" onClick={() => setIsPlaying(true)}><Play className="w-5 h-5 mr-2" />{t("watch")}</Button>
            ) : (
              <Button size="lg" className="w-full bg-gradient-primary hover:shadow-glow transition-all text-lg" onClick={() => unlockReplay.mutate()} disabled={unlockReplay.isPending}>
                <Lock className="w-5 h-5 mr-2" />
                {unlockReplay.isPending ? t("unlocking") : t("unlockPremium")}
              </Button>
            )}
          </div>
        </div>

        {/* Comments section */}
        {canWatch && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">{t("comments")} ({commentsCount})</h2>
            <CommentSection contentId={id!} contentType="replay" />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ReplayDetail;