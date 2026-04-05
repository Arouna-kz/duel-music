import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Heart, ArrowLeft, LogOut } from "lucide-react";
import { ShareButton } from "@/components/sharing/ShareButton";
import Header from "@/components/Header";
import { FollowArtistButton } from "@/components/artist/FollowArtistButton";
import Footer from "@/components/Footer";
import { ConcertChat } from "@/components/concert/ConcertChat";
import ConcertGiftPanel from "@/components/concert/ConcertGiftPanel";
import { QuickTip } from "@/components/duel/QuickTip";
import { GiftLeaderboard } from "@/components/duel/GiftLeaderboard";
import { ConcertDurationTimer } from "@/components/concert/ConcertDurationTimer";
import { ConcertRecordingControls } from "@/components/concert/ConcertRecordingControls";
import { WebRTCHost } from "@/components/concert/WebRTCHost";
import { WebRTCViewer } from "@/components/concert/WebRTCViewer";
import { FloatingHearts, useFloatingHearts } from "@/components/animations/FloatingHearts";
import { FloatingEmojis, EmojiReactionBar, useBroadcastEmojis } from "@/components/animations/FloatingEmojis";
import { FullscreenButton } from "@/components/streaming/FullscreenButton";
import { SpeakingTimerOverlay } from "@/components/streaming/SpeakingTimerOverlay";
import { VideoZoomWrapper } from "@/components/streaming/VideoZoomWrapper";
import { MobileStreamOverlay } from "@/components/streaming/MobileStreamOverlay";
import { useIsMobile } from "@/hooks/use-mobile";
import { WebRTCHostControls } from "@/components/concert/WebRTCHost";

const ConcertLive = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [hostStream, setHostStream] = useState<MediaStream | null>(null);
  const [likes, setLikes] = useState(0);
  const likesLoadedRef = useRef(false);
  const likesChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [isArtist, setIsArtist] = useState(false);
  const [artistId, setArtistId] = useState<string | undefined>();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [mobileChatMessages, setMobileChatMessages] = useState<any[]>([]);
  const { hearts, addHeart } = useFloatingHearts();
  const { emojis: floatingEmojis, broadcastEmoji: addEmoji } = useBroadcastEmojis(id ? `concert-emojis-${id}` : null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [hostControls, setHostControls] = useState<WebRTCHostControls | null>(null);

  // Realtime likes sync via broadcast
  useEffect(() => {
    if (!id) return;

    // Load persisted likes count
    const loadLikes = async () => {
      const { data } = await supabase
        .from("live_likes")
        .select("likes_count")
        .eq("live_id", id)
        .maybeSingle();
      if (data) {
        setLikes(data.likes_count);
      }
      likesLoadedRef.current = true;
    };
    loadLikes();

    const channel = supabase
      .channel(`concert-likes-${id}`)
      .on("broadcast", { event: "like" }, (payload) => {
        setLikes(payload.payload.count);
      })
      .subscribe();

    likesChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      likesChannelRef.current = null;
    };
  }, [id]);

  const { data: concert, isLoading, refetch } = useQuery({
    queryKey: ["concert-live", id],
    queryFn: async () => {
      // First try to find in artist_concerts (for artist-created concerts)
      const { data: artistConcert, error: artistError } = await supabase
        .from("artist_concerts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (artistConcert) {
        return {
          id: artistConcert.id,
          title: artistConcert.title,
          artist_name: "",
          artist_id: artistConcert.artist_id,
          description: artistConcert.description,
          scheduled_date: artistConcert.scheduled_date,
          scheduled_time: new Date(artistConcert.scheduled_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          location: "En ligne",
          ticket_price: artistConcert.ticket_price,
          max_tickets: artistConcert.max_tickets,
          stream_url: artistConcert.stream_url,
          status: artistConcert.status,
          image_url: artistConcert.cover_image_url,
          is_artist_concert: true,
          started_at: artistConcert.started_at,
          recording_url: artistConcert.recording_url,
          is_replay_available: artistConcert.is_replay_available,
        };
      }

      // If not found in artist_concerts, try regular concerts
      const { data, error } = await supabase
        .from("concerts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data ? { 
        ...data, 
        is_artist_concert: false,
        started_at: data.started_at,
        recording_url: data.recording_url,
        is_replay_available: data.is_replay_available,
      } : null;
    },
    refetchInterval: 5000, // Poll every 5 seconds to catch status changes
  });

  // Subscribe to realtime changes for concert status
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`concert-status-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "artist_concerts",
          filter: `id=eq.${id}`,
        },
        () => {
          refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "concerts",
          filter: `id=eq.${id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, refetch]);

  useEffect(() => {
    checkArtistStatus();
  }, [id]);

  // Update startedAt when concert data changes
  useEffect(() => {
    if (concert?.started_at) {
      setStartedAt(concert.started_at);
    }
  }, [concert?.started_at]);

  const checkArtistStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isArtistOrAdmin = roles?.some(r => r.role === "artist" || r.role === "admin") || false;
    setIsArtist(isArtistOrAdmin);
    
    if (isArtistOrAdmin) {
      setArtistId(user.id);
    }
  };

  // Check if the current user is the concert organizer
  const isOrganizer = currentUserId && concert?.artist_id === currentUserId;

  // Room ID for WebRTC
  const roomId = `concert-${id}`;

  // Handle stream events from WebRTC components
  const handleStreamStart = async () => {
    const now = new Date().toISOString();
    setStartedAt(now);
    
    // Update the correct table based on concert type
    if (concert?.is_artist_concert) {
      await supabase
        .from("artist_concerts")
        .update({ 
          status: "live",
          started_at: now 
        })
        .eq("id", id);
    } else {
      await supabase
        .from("concerts")
        .update({ 
          status: "live",
          started_at: now 
        })
        .eq("id", id);
    }

    // Send notifications to ticket holders and followers via notify-user-event
    try {
      // Get all ticket holders
      const { data: tickets } = await supabase
        .from("concert_tickets")
        .select("user_id")
        .eq("concert_id", id);

      const ticketHolderIds = [...new Set(tickets?.map((t) => t.user_id) || [])];

      // For artist concerts: also notify artist followers
      let followerIds: string[] = [];
      if (concert?.is_artist_concert && concert?.artist_id) {
        const { data: followers } = await supabase
          .from("artist_followers")
          .select("follower_id")
          .eq("artist_id", concert.artist_id);
        followerIds = followers?.map((f) => f.follower_id) || [];
      }

      const allUserIds = [...new Set([...ticketHolderIds, ...followerIds])];

      // Notify each user via the unified notify-user-event function
      await Promise.allSettled(
        allUserIds.map((userId) =>
          supabase.functions.invoke("notify-user-event", {
            body: {
              userId,
              type: "concert_live",
              data: {
                concertId: id,
                concertTitle: concert?.title,
                artistName: concert?.artist_name || concert?.title,
              },
            },
          })
        )
      );
    } catch (err) {
      console.error("Error sending concert live notifications:", err);
    }
  };

  const handleStreamStop = async () => {
    const now = new Date().toISOString();
    
    // Update the correct table based on concert type
    if (concert?.is_artist_concert) {
      await supabase
        .from("artist_concerts")
        .update({ 
          status: "ended",
          ended_at: now 
        })
        .eq("id", id);
    } else {
      await supabase
        .from("concerts")
        .update({ 
          status: "ended",
          ended_at: now 
        })
        .eq("id", id);
    }
  };

  const sendLike = async () => {
    const newCount = likes + 1;
    setLikes(newCount);
    addHeart();
    likesChannelRef.current?.send({
      type: "broadcast",
      event: "like",
      payload: { count: newCount },
    });

    // Persist likes count
    if (id) {
      const { data: existing } = await supabase
        .from("live_likes")
        .select("live_id")
        .eq("live_id", id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("live_likes")
          .update({ likes_count: newCount })
          .eq("live_id", id);
      } else {
        await supabase
          .from("live_likes")
          .insert({ live_id: id, likes_count: newCount });
      }
    }
  };

  // Mobile chat loading
  useEffect(() => {
    if (!id || !isMobile) return;
    const loadMobileChat = async () => {
      const { data: msgs } = await supabase.from("concert_chat_messages").select("*").eq("concert_id", id).eq("is_moderated", false).order("created_at", { ascending: true }).limit(50);
      if (msgs) {
        const userIds = [...new Set(msgs.map(m => m.user_id))];
        const { data: profs } = await supabase.rpc("get_display_profiles", { user_ids: userIds });
        const pm = new Map((profs as any[])?.map((p: any) => [p.id, p]) || []);
        const msgMap = new Map<string, any>();
        const enriched: any[] = msgs.map(m => {
          const e: any = { ...m, user_name: pm.get(m.user_id)?.full_name || "Anonyme", avatar_url: pm.get(m.user_id)?.avatar_url };
          msgMap.set(m.id, e);
          return e;
        });
        enriched.forEach(m => {
          if (m.parent_id) { const p = msgMap.get(m.parent_id); if (p) { m.reply_to_name = p.user_name; m.reply_to_message = p.message; } }
        });
        setMobileChatMessages(enriched);
      }
    };
    loadMobileChat();
    const chatChannel = supabase.channel(`concert-mobile-chat-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "concert_chat_messages", filter: `concert_id=eq.${id}` }, async (payload) => {
        const msg = payload.new as any;
        if (msg.is_moderated) return;
        const { data: profiles } = await supabase.rpc("get_display_profiles", { user_ids: [msg.user_id] });
        const profile = (profiles as any[])?.[0];
        setMobileChatMessages(prev => {
          if (prev.some((m: any) => m.id === msg.id)) return prev;
          const parent = prev.find((m: any) => m.id === msg.parent_id);
          return [...prev.slice(-49), { ...msg, user_name: profile?.full_name || "Anonyme", avatar_url: profile?.avatar_url, reply_to_name: parent?.user_name, reply_to_message: parent?.message }];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(chatChannel); };
  }, [id, isMobile]);

  const sendMobileChatMessage = async (msg: string, parentId?: string | null) => {
    if (!currentUserId || !id) return;
    await supabase.from("concert_chat_messages").insert({
      concert_id: id,
      user_id: currentUserId,
      message: msg,
      parent_id: parentId || null,
    });
  };

  const handleLeaveConcert = () => {
    toast({ title: t("leftConcert") });
    navigate("/concerts");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/30 rounded-full" />
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute inset-0" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-foreground">🎵</span>
            <p className="text-muted-foreground font-medium animate-pulse">{t("loadingConcert") || "Chargement du concert..."}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!concert) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-foreground">{t("concertNotFound")}</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Determine if concert is live
  const isLive = concert.status === "live";

  // ===== MOBILE LAYOUT =====
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        <div className="relative w-full h-full" ref={videoContainerRef}>
          {/* Video stream */}
          {isOrganizer && currentUserId ? (
            <WebRTCHost
              roomId={roomId}
              hostId={currentUserId}
              hideMobileControls={true}
              onStreamStart={handleStreamStart}
              onStreamStop={handleStreamStop}
              onStreamReady={(stream) => setHostStream(stream)}
              onControlsReady={(c) => setHostControls(c)}
            />
          ) : currentUserId ? (
            <WebRTCViewer
              roomId={roomId}
              viewerId={currentUserId}
              concertTitle={concert.title}
              artistName={concert.artist_name}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <div className="text-center">
                <p className="text-white text-xl font-bold">{concert.title}</p>
                <p className="text-white/70">{concert.artist_name}</p>
                <p className="text-white/50 mt-4">{t("loginToWatchConcert")}</p>
              </div>
            </div>
          )}

          {/* TikTok-style mobile overlay */}
          <MobileStreamOverlay
            defaultHidden={false}
            isLive={isLive}
            viewerCount={0}
            likes={likes}
            onLike={sendLike}
            chatMessages={mobileChatMessages}
            onSendMessage={sendMobileChatMessage}
            currentUserId={currentUserId}
            hearts={hearts}
            addHeart={addHeart}
            floatingEmojis={floatingEmojis}
            onEmojiReact={addEmoji}
            videoContainerRef={videoContainerRef as React.RefObject<HTMLElement>}
            giftPanelContent={
              <ConcertGiftPanel concertId={id!} artistId={concert.artist_id || artistId} artistName={concert.artist_name} />
            }
            leaderboardContent={<GiftLeaderboard concertId={id!} />}
            title={concert.title}
            artistName={concert.artist_name}
            badgeLabel="CONCERT"
            onQuitLive={handleLeaveConcert}
            rightTopContent={
              <ShareButton contentType="concert" contentId={id!} title={concert.title} variant="overlay" />
            }
            description={concert.description || undefined}
            timerContent={
              !isOrganizer && isLive ? (
                <ConcertDurationTimer startedAt={startedAt} isLive={isLive} />
              ) : undefined
            }
            recordingContent={
              isOrganizer && hostStream ? (
                <ConcertRecordingControls
                  stream={hostStream}
                  concertId={id!}
                  userId={currentUserId!}
                  isArtistConcert={concert.is_artist_concert}
                  onRecordingSaved={() => refetch()}
                />
              ) : undefined
            }
            isArtist={isOrganizer || false}
            artistControls={isOrganizer && hostStream && hostControls ? {
              isStreaming: hostControls.isStreaming,
              isPaused: hostControls.isPaused,
              isCameraOn: hostControls.isCameraOn,
              isMicOn: hostControls.isMicOn,
              onPause: hostControls.pauseStreaming,
              onResume: hostControls.resumeStreaming,
              onStop: hostControls.stopStreaming,
              onToggleCamera: hostControls.handleToggleCamera,
              onToggleMic: hostControls.handleToggleMic,
              onSwitchCamera: hostControls.handleSwitchCamera,
            } : undefined}
          />
        </div>
      </div>
    );
  }

  // ===== DESKTOP LAYOUT =====
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate("/concerts")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("returnBtn")}
          </Button>
          <ShareButton contentType="concert" contentId={id!} title={concert.title} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Stream */}
          <div className="lg:col-span-3">
            <Card className="bg-card border-border overflow-hidden">
              {/* WebRTC Video Area */}
              <VideoZoomWrapper isFocused className="relative aspect-video bg-black" label={concert.title}>
                <div className="w-full h-full" ref={videoContainerRef}>
                {isOrganizer && currentUserId ? (
                  <WebRTCHost
                    roomId={roomId}
                    hostId={currentUserId}
                    onStreamStart={handleStreamStart}
                    onStreamStop={handleStreamStop}
                    onStreamReady={(stream) => setHostStream(stream)}
                  />
                ) : currentUserId ? (
                  <WebRTCViewer
                    roomId={roomId}
                    viewerId={currentUserId}
                    concertTitle={concert.title}
                    artistName={concert.artist_name}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                    <div className="text-center">
                      <p className="text-white text-xl font-bold">{concert.title}</p>
                      <p className="text-white/70">{concert.artist_name}</p>
                      <p className="text-white/50 mt-4">{t("loginToWatchConcert")}</p>
                    </div>
                  </div>
                )}
                
                {/* Floating reactions */}
                <FloatingHearts hearts={hearts} />
                <FloatingEmojis emojis={floatingEmojis} />

                {/* Likes counter overlay */}
                <div className="absolute top-4 right-4 bg-background/50 backdrop-blur-sm text-foreground px-4 py-2 rounded-full font-bold flex items-center gap-2 z-10">
                  <Heart className="w-5 h-5 fill-destructive text-destructive" />
                  {likes}
                </div>

                {/* Duration timer for viewers */}
                {!isOrganizer && isLive && (
                  <div className="absolute top-4 left-4 z-10">
                    <ConcertDurationTimer startedAt={startedAt} isLive={isLive} />
                  </div>
                )}

                {/* Fullscreen toggle (desktop) */}
                <div className="absolute bottom-4 left-4 z-20">
                  <FullscreenButton targetRef={videoContainerRef} />
                </div>
                </div>
              </VideoZoomWrapper>
              
              <CardContent className="p-4">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {concert.title}
                </h1>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => concert.artist_id && navigate(`/artist/${concert.artist_id}`)}
                    className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    {concert.artist_name}
                  </button>
                  {currentUserId && concert.artist_id && currentUserId !== concert.artist_id && (
                    <FollowArtistButton artistId={concert.artist_id} currentUserId={currentUserId} size="sm" />
                  )}
                </div>
                <div className="mb-3">
                  <EmojiReactionBar onReact={addEmoji} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Recording controls for organizer */}
                  {isOrganizer && hostStream && (
                    <ConcertRecordingControls
                      stream={hostStream}
                      concertId={id!}
                      userId={currentUserId!}
                      isArtistConcert={concert.is_artist_concert}
                      onRecordingSaved={() => refetch()}
                    />
                  )}
                  
                  <Button
                    onClick={sendLike}
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10"
                  >
                     <Heart className="w-4 h-4 mr-2" />
                     {t("likeBtn")}
                  </Button>

                  {!isOrganizer && (
                    <Button
                      onClick={handleLeaveConcert}
                      variant="destructive"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {t("leaveConcert")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Chat & Gifts */}
          <div className="lg:col-span-1 space-y-4">
            <ConcertGiftPanel
              concertId={id!}
              artistId={concert.artist_id || artistId}
              artistName={concert.artist_name}
            />
            {/* Quick Tip for concert artist */}
            {artistId && (
              <QuickTip
                recipientIds={[{ id: artistId, name: concert.artist_name || "Artiste" }]}
              />
            )}
            {/* Gift Leaderboard */}
            <GiftLeaderboard concertId={id!} />
            <div className="h-[400px] overflow-hidden">
              <ConcertChat concertId={id!} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ConcertLive;
