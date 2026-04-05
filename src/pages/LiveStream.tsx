import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Heart, ArrowLeft, LogOut, Users, Hand, Mic, MicOff, Video, VideoOff, X, Check, UserPlus, Maximize, Minimize, SwitchCamera } from "lucide-react";
import { ShareButton } from "@/components/sharing/ShareButton";
import { HostGuestControls } from "@/components/streaming/HostGuestControls";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ConcertGiftPanel from "@/components/concert/ConcertGiftPanel";
import { QuickTip } from "@/components/duel/QuickTip";
import { GiftLeaderboard } from "@/components/duel/GiftLeaderboard";
import { Input } from "@/components/ui/input";
import { FloatingHearts, useFloatingHearts } from "@/components/animations/FloatingHearts";
import { FloatingEmojis, EmojiReactionBar, useBroadcastEmojis } from "@/components/animations/FloatingEmojis";
import { FullscreenButton } from "@/components/streaming/FullscreenButton";
import { LiveReportButton } from "@/components/streaming/LiveReportButton";

import { VideoZoomWrapper } from "@/components/streaming/VideoZoomWrapper";
import { WebRTCHost } from "@/components/concert/WebRTCHost";
import { WebRTCViewer } from "@/components/concert/WebRTCViewer";
import { MobileStreamOverlay } from "@/components/streaming/MobileStreamOverlay";
import { GuestVideoBox, useGuestBroadcast } from "@/components/streaming/GuestVideoBox";
import { useIsMobile } from "@/hooks/use-mobile";
import { WebRTCHostControls } from "@/components/concert/WebRTCHost";
import { motion, AnimatePresence } from "framer-motion";
import { FollowArtistButton } from "@/components/artist/FollowArtistButton";

const LiveStream = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [likes, setLikes] = useState(0);
  const likesLoadedRef = useRef(false);
  const [acceptedGuests, setAcceptedGuests] = useState<any[]>([]);
  const [focusedGuestId, setFocusedGuestId] = useState<string | null>(null);
  const [showGuestThumbnails, setShowGuestThumbnails] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [hasRequestedJoin, setHasRequestedJoin] = useState(false);
  const [myRequestId, setMyRequestId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guestStream, setGuestStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const [mobileChatMessages, setMobileChatMessages] = useState<any[]>([]);
  const [hostControls, setHostControls] = useState<WebRTCHostControls | null>(null);
  const [replyToDesktop, setReplyToDesktop] = useState<any | null>(null);
  const [showDesktopEmoji, setShowDesktopEmoji] = useState(false);
  const [guestTimers, setGuestTimers] = useState<Record<string, { remaining: number; total: number; name: string }>>({});
  const [hostMutedGuests, setHostMutedGuests] = useState<Record<string, boolean>>({});
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const likesChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const { hearts, addHeart } = useFloatingHearts();
  const { emojis: floatingEmojis, broadcastEmoji: addEmoji } = useBroadcastEmojis(id ? `live-emojis-${id}` : null);

  // Auto-fullscreen on mobile + re-enter if user exits
  useEffect(() => {
    if (!isMobile || !videoContainerRef.current) return;
    const tryFullscreen = () => {
      if (videoContainerRef.current && !document.fullscreenElement) {
        videoContainerRef.current.requestFullscreen?.().catch(() => {});
      }
    };
    const timeout = setTimeout(tryFullscreen, 1500);
    const onFullscreenChange = () => {
      if (isMobile && !document.fullscreenElement && videoContainerRef.current) {
        setTimeout(tryFullscreen, 500);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [isMobile]);

  // Persistent channel for guest media state broadcasts
  const guestStateChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`live-guest-state-${id}`, { config: { broadcast: { self: true } } })
      .subscribe();
    guestStateChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      guestStateChannelRef.current = null;
    };
  }, [id]);

  const broadcastMediaState = (micOn: boolean, camOn: boolean) => {
    guestStateChannelRef.current?.send({
      type: "broadcast",
      event: "guest_media_state",
      payload: { userId: currentUserId, isMicOn: micOn, isCamOn: camOn },
    });
  };

  // Broadcast guest stream via WebRTC when this user is an accepted guest
  useGuestBroadcast(id, currentUserId, isGuest ? guestStream : null);
  // Fetch live data
  const { data: live, isLoading, refetch } = useQuery({
    queryKey: ["live-stream", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_lives")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", data.artist_id)
        .single();

      const { data: artistProfile } = await supabase
        .from("artist_profiles")
        .select("stage_name")
        .eq("user_id", data.artist_id)
        .maybeSingle();

      return {
        ...data,
        artist_name: artistProfile?.stage_name || profile?.full_name || "Artiste",
        artist_avatar: profile?.avatar_url,
      };
    },
    refetchInterval: 10000,
  });

  const isArtist = currentUserId === live?.artist_id;
  const roomId = `live-${id}`;

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Load persisted likes on mount
  useEffect(() => {
    if (!id || likesLoadedRef.current) return;
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
  }, [id]);

  // Realtime likes - broadcast AND sync count
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`live-likes-${id}`, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "like" }, (payload) => setLikes(payload.payload.count))
      .on("broadcast", { event: "viewer_count" }, (payload) => setViewerCount(payload.payload.count))
      .subscribe();
    likesChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Load accepted guests for display
  useEffect(() => {
    if (!id) return;
    const loadAcceptedGuests = async () => {
      const { data } = await supabase
        .from("live_join_requests")
        .select("*")
        .eq("live_id", id)
        .eq("status", "accepted");
      if (data && data.length > 0) {
        const userIds = data.map(r => r.user_id);
        // Use SECURITY DEFINER function to bypass RLS
        const { data: profiles } = await supabase.rpc("get_display_profiles", {
          user_ids: userIds,
        });
        const profileMap = new Map((profiles as any[])?.map((p: any) => [p.id, p]) || []);
        setAcceptedGuests(data.map(r => {
          const profile = profileMap.get(r.user_id);
          return {
            ...r,
            user_name: profile?.full_name || "Utilisateur",
            avatar_url: profile?.avatar_url,
          };
        }));
      } else {
        setAcceptedGuests([]);
      }
    };
    loadAcceptedGuests();
    const channel = supabase
      .channel(`live-guests-display-${id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "live_join_requests",
        filter: `live_id=eq.${id}`,
      }, () => loadAcceptedGuests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Presence for viewer count
  useEffect(() => {
    if (!id) return;
    const presenceChannel = supabase.channel(`live-presence-${id}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const count = Object.keys(state).length;
        setViewerCount(count);
        likesChannelRef.current?.send({ type: "broadcast", event: "viewer_count", payload: { count } });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });
    return () => { supabase.removeChannel(presenceChannel); };
  }, [id]);

  // Realtime chat
  useEffect(() => {
    if (!id) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("live_chat_messages")
        .select("*")
        .eq("live_id", id)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) {
        const userIds = [...new Set(data.map(m => m.user_id))];
        const { data: profiles } = await supabase.rpc("get_display_profiles", {
          user_ids: userIds,
        });
        const profileMap = new Map((profiles as any[])?.map((p: any) => [p.id, p]) || []);
        setChatMessages(data.map(m => ({
          ...m,
          user_name: profileMap.get(m.user_id)?.full_name || "Anonyme",
          avatar_url: profileMap.get(m.user_id)?.avatar_url,
        })));
      }
    };
    loadMessages();
    const channel = supabase
      .channel(`live-chat-${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "live_chat_messages",
        filter: `live_id=eq.${id}`,
      }, async (payload) => {
        const { data: profiles } = await supabase.rpc("get_display_profiles", {
          user_ids: [payload.new.user_id],
        });
        const profile = (profiles as any[])?.[0];
        setChatMessages(prev => [...prev, {
          ...payload.new,
          user_name: profile?.full_name || "Anonyme",
          avatar_url: profile?.avatar_url,
        }]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Load join requests (for artist)
  useEffect(() => {
    if (!id || !isArtist) return;
    const loadRequests = async () => {
      const { data } = await supabase
        .from("live_join_requests")
        .select("*")
        .eq("live_id", id)
        .eq("status", "pending");
      if (data) {
        const userIds = data.map(r => r.user_id);
        const { data: profiles } = await supabase.rpc("get_display_profiles", {
          user_ids: userIds,
        });
        const profileMap = new Map((profiles as any[])?.map((p: any) => [p.id, p]) || []);
         setJoinRequests(data.map(r => ({
          ...r,
          user_name: profileMap.get(r.user_id)?.full_name || "Utilisateur",
          avatar_url: profileMap.get(r.user_id)?.avatar_url,
        })));
      }
    };
    loadRequests();
    const channel = supabase
      .channel(`live-requests-${id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "live_join_requests",
        filter: `live_id=eq.${id}`,
      }, () => loadRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, isArtist]);

  // Check existing join request on mount
  useEffect(() => {
    if (!id || !currentUserId) return;
    const checkRequest = async () => {
      const { data } = await supabase
        .from("live_join_requests")
        .select("id, status")
        .eq("live_id", id)
        .eq("user_id", currentUserId)
        .maybeSingle();
      if (data) {
        setMyRequestId(data.id);
        if (data.status === "pending") setHasRequestedJoin(true);
        if (data.status === "accepted") {
          setIsGuest(true);
          // Don't auto-start stream here - needs user gesture
          // User will click "Activer caméra" button
        }
      }
    };
    checkRequest();
  }, [id, currentUserId, isArtist]);

  // Watch for join acceptance + host control actions on guest
  useEffect(() => {
    if (!id || !currentUserId || isArtist) return;

    const channel = supabase
      .channel(`live-my-request-${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "live_join_requests",
        filter: `live_id=eq.${id}`,
      }, (payload) => {
        if (payload.new.user_id === currentUserId && payload.new.status === "accepted") {
          setIsGuest(true);
          // Don't auto-start - needs user gesture. Show button instead.
          toast({ title: t("joinedLive"), description: t("clickToActivate") });
        }
        if (payload.new.user_id === currentUserId && payload.new.status === "ended") {
          // Kicked by host
          setIsGuest(false);
          guestStream?.getTracks().forEach(t => t.stop());
          setGuestStream(null);
           toast({ title: t("removedFromLive"), variant: "destructive" });
        }
      })
      .subscribe();

    // Listen for broadcast control actions from host
    const controlChannel = supabase
      .channel(`live-controls-${id}`, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "guest_action" }, (payload) => {
        const { action, targetUserId, targetUserName, value } = payload.payload;

        if (action === "toggle_mic" && targetUserId) {
          setHostMutedGuests((prev) => ({ ...prev, [targetUserId]: !!value }));
        }

        // Timer events: visible to ALL viewers, not filtered by currentUserId
        if (action === "start_timer") {
          setGuestTimers(prev => ({ ...prev, [targetUserId]: { remaining: value, total: value, name: targetUserName || "Invité" } }));
        }
        if (action === "timer_ended") {
          setGuestTimers(prev => {
            const next = { ...prev };
            delete next[targetUserId];
            return next;
          });
          if (targetUserId === currentUserId) {
            toast({ title: t("speakingTimeEnded") });
          }
        }

        // Personal actions: only for this user
        if (targetUserId !== currentUserId) return;

        if (action === "kick") {
          setIsGuest(false);
          guestStream?.getTracks().forEach(t => t.stop());
          setGuestStream(null);
          toast({ title: "Vous avez été retiré du live", variant: "destructive" });
        }
        if (action === "toggle_mic" && guestStream) {
          guestStream.getAudioTracks().forEach(t => { t.enabled = !value; });
          setIsMicOn(!value);
          broadcastMediaState(!value, isCamOn);
          toast({ title: value ? t("micMutedByHost") : t("micUnmutedByHost") });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(controlChannel);
    };
  }, [id, currentUserId, guestStream, isCamOn]);

  // Countdown tick for guest timers
  useEffect(() => {
    const activeTimers = Object.keys(guestTimers).filter(k => guestTimers[k].remaining > 0);
    if (activeTimers.length === 0) return;
    const interval = setInterval(() => {
      setGuestTimers(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (next[key].remaining <= 1) {
            delete next[key];
          } else {
            next[key] = { ...next[key], remaining: next[key].remaining - 1 };
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [Object.keys(guestTimers).length]); // eslint-disable-line react-hooks/exhaustive-deps

  const startGuestCamera = async () => {
    try {
      // Check if we already have a live video track - just re-enable it
      if (guestStream) {
        const existingVideo = guestStream.getVideoTracks().find(t => t.readyState === "live");
        if (existingVideo) {
          existingVideo.enabled = true;
          setIsCamOn(true);
          // Force stream update to trigger WebRTC sync
          setGuestStream(new MediaStream(guestStream.getTracks()));
          return;
        }
      }

      // Get ONLY video - don't touch audio
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const [newVideoTrack] = videoStream.getVideoTracks();
      if (!newVideoTrack) return;

      newVideoTrack.enabled = true;
      
      // Merge: keep ALL existing live tracks + add the new video track
      const existingTracks = guestStream?.getTracks().filter(t => t.readyState === "live" && t.kind !== "video") ?? [];
      const allTracks = [...existingTracks, newVideoTrack];
      setGuestStream(new MediaStream(allTracks));
      setIsCamOn(true);
      // Broadcast state change
      broadcastMediaState(isMicOn, true);
      // DO NOT touch isMicOn - it's independent
    } catch {
      toast({ title: t("cameraError"), description: t("cameraErrorDesc"), variant: "destructive" });
    }
  };

  const startGuestMic = async () => {
    try {
      // Check if we already have a live audio track - just re-enable it
      if (guestStream) {
        const existingAudio = guestStream.getAudioTracks().find(t => t.readyState === "live");
        if (existingAudio) {
          existingAudio.enabled = true;
          setIsMicOn(true);
          // Force stream update to trigger WebRTC sync
          setGuestStream(new MediaStream(guestStream.getTracks()));
          return;
        }
      }

      // Get ONLY audio - don't touch video
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const [newAudioTrack] = audioStream.getAudioTracks();
      if (!newAudioTrack) return;

      newAudioTrack.enabled = true;
      
      // Merge: keep ALL existing live tracks + add the new audio track
      const existingTracks = guestStream?.getTracks().filter(t => t.readyState === "live" && t.kind !== "audio") ?? [];
      const allTracks = [...existingTracks, newAudioTrack];
      setGuestStream(new MediaStream(allTracks));
      setIsMicOn(true);
      // Broadcast state change
      broadcastMediaState(true, isCamOn);
      // DO NOT touch isCamOn - it's independent
    } catch {
      toast({ title: t("micError"), description: t("micErrorDesc"), variant: "destructive" });
    }
  };

  const sendLike = async () => {
    const newCount = likes + 1;
    setLikes(newCount);
    addHeart();
    likesChannelRef.current?.send({ type: "broadcast", event: "like", payload: { count: newCount } });
    // Persist to DB
    if (id) {
      await supabase.from("live_likes" as any).upsert(
        { live_id: id, likes_count: newCount, updated_at: new Date().toISOString() },
        { onConflict: "live_id" }
      );
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !id) return;
    const parentId = replyToDesktop?.id || null;
    const replyName = replyToDesktop?.user_name || null;
    const replyMsg = replyToDesktop?.message || null;
    
    // Store reply info in message via broadcast (since live_chat_messages doesn't have parent_id for live)
    await supabase.from("live_chat_messages").insert({
      live_id: id,
      user_id: currentUserId,
      message: newMessage.trim(),
    });
    
    // If replying, broadcast reply metadata
    if (parentId) {
      supabase.channel(`live-chat-reply-${id}`, { config: { broadcast: { self: true } } }).send({
        type: "broadcast",
        event: "chat_reply",
        payload: { parentId, replyToName: replyName, replyToMessage: replyMsg, userId: currentUserId, message: newMessage.trim() },
      });
    }
    
    setNewMessage("");
    setReplyToDesktop(null);
  };

  const requestToJoin = async () => {
    if (!currentUserId || !id) return;
    const { data, error } = await supabase.from("live_join_requests").insert({
      live_id: id,
      user_id: currentUserId,
    }).select().single();
    if (!error && data) {
      setHasRequestedJoin(true);
      setMyRequestId(data.id);
      toast({ title: t("requestSent"), description: t("artistWillReview") });
    }
  };

  const cancelJoinRequest = async () => {
    if (!myRequestId) return;
    await supabase
      .from("live_join_requests")
      .update({ status: "cancelled" })
      .eq("id", myRequestId);
    setHasRequestedJoin(false);
    setMyRequestId(null);
    toast({ title: t("requestCancelled") });
  };

  const handleJoinRequest = async (requestId: string, accept: boolean) => {
    await supabase
      .from("live_join_requests")
      .update({
        status: accept ? "accepted" : "rejected",
        accepted_at: accept ? new Date().toISOString() : null,
      })
      .eq("id", requestId);
  };

  const kickGuest = async (requestId: string) => {
    await supabase
      .from("live_join_requests")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", requestId);
    toast({ title: t("userRemovedFromLive") });
  };

  const leaveLive = async () => {
    if (!myRequestId) return;
    await supabase
      .from("live_join_requests")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", myRequestId);
    setIsGuest(false);
    guestStream?.getTracks().forEach(t => t.stop());
    setGuestStream(null);
    setHasRequestedJoin(false);
    setMyRequestId(null);
    toast({ title: t("leftLive") });
  };

  const endLive = async () => {
    if (!id) return;
    await supabase.from("artist_lives").update({
      status: "ended",
      ended_at: new Date().toISOString(),
    }).eq("id", id);
    toast({ title: t("liveEnded") });
    navigate("/lives");
  };

  const handleAutoStopReport = async () => {
    if (!id) return;
    toast({
      title: "⚠️ Live arrêté",
      description: "Ce live a été arrêté suite à de nombreux signalements.",
      variant: "destructive",
    });
    await supabase.from("artist_lives").update({
      status: "ended",
      ended_at: new Date().toISOString(),
    }).eq("id", id);
    navigate("/lives");
  };

  const toggleMic = async () => {
    if (!guestStream) {
      await startGuestMic();
      return;
    }

    const audioTracks = guestStream.getAudioTracks().filter(t => t.readyState === "live");
    if (audioTracks.length === 0) {
      await startGuestMic();
      return;
    }

    const nextEnabled = !audioTracks.some(t => t.enabled);
    audioTracks.forEach(t => { t.enabled = nextEnabled; });
    setIsMicOn(nextEnabled);
    // Force stream reference change to trigger WebRTC sync
    setGuestStream(new MediaStream(guestStream.getTracks()));
    // Broadcast state change to all viewers
    broadcastMediaState(nextEnabled, isCamOn);
    // DO NOT touch isCamOn
  };

  const toggleCam = async () => {
    if (!guestStream) {
      await startGuestCamera();
      return;
    }

    const videoTracks = guestStream.getVideoTracks().filter(t => t.readyState === "live");
    if (videoTracks.length === 0) {
      await startGuestCamera();
      return;
    }

    const nextEnabled = !videoTracks.some(t => t.enabled);
    videoTracks.forEach(t => { t.enabled = nextEnabled; });
    setIsCamOn(nextEnabled);
    // Force stream reference change to trigger WebRTC sync
    setGuestStream(new MediaStream(guestStream.getTracks()));
    // Broadcast state change to all viewers
    broadcastMediaState(isMicOn, nextEnabled);
    // DO NOT touch isMicOn
  };

  const [guestFacingMode, setGuestFacingMode] = useState<'user' | 'environment'>('user');

  const switchGuestCamera = async () => {
    if (!guestStream) return;
    const newFacingMode = guestFacingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: newFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      // Stop old video tracks
      guestStream.getVideoTracks().forEach(t => t.stop());
      // Keep audio tracks, replace video
      const audioTracks = guestStream.getAudioTracks().filter(t => t.readyState === "live");
      const allTracks = [...audioTracks, newVideoTrack];
      const updatedStream = new MediaStream(allTracks);
      setGuestStream(updatedStream);
      setGuestFacingMode(newFacingMode);
      setIsCamOn(true);
      broadcastMediaState(isMicOn, true);
    } catch (err) {
      console.error("[SwitchGuestCamera] Error:", err);
      toast({ title: t("error"), description: "Impossible de basculer la caméra", variant: "destructive" });
    }
  };

  // Chat reply metadata broadcast listener
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`live-chat-reply-${id}`, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "chat_reply" }, (payload) => {
        const { parentId, replyToName, replyToMessage, userId: replyUserId, message: replyText } = payload.payload;
        // Update the latest matching message with reply metadata
        setChatMessages(prev => {
          const updated = [...prev];
          // Find the last message from this user with this text
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].user_id === replyUserId && updated[i].message === replyText && !updated[i].parent_id) {
              updated[i] = { ...updated[i], parent_id: parentId, reply_to_name: replyToName, reply_to_message: replyToMessage };
              break;
            }
          }
          return updated;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Mobile chat for TikTok overlay
  useEffect(() => {
    if (!id || !isMobile) return;
    setMobileChatMessages(chatMessages.map((m: any) => ({
      ...m,
      reply_to_name: m.reply_to_name || undefined,
      reply_to_message: m.reply_to_message || undefined,
    })));
  }, [chatMessages, isMobile, id]);

  const sendMobileChatMessage = async (msg: string, parentId?: string | null) => {
    if (!currentUserId || !id) return;
    
    // Find the reply-to message info
    const replyMsg = parentId ? chatMessages.find(m => m.id === parentId) : null;
    
    await supabase.from("live_chat_messages").insert({
      live_id: id,
      user_id: currentUserId,
      message: msg,
    });
    
    // Broadcast reply metadata if replying
    if (parentId && replyMsg) {
      supabase.channel(`live-chat-reply-${id}`, { config: { broadcast: { self: true } } }).send({
        type: "broadcast",
        event: "chat_reply",
        payload: { parentId, replyToName: replyMsg.user_name, replyToMessage: replyMsg.message, userId: currentUserId, message: msg },
      });
    }
  };

  useEffect(() => {
    setHostMutedGuests((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([userId]) => acceptedGuests.some((guest) => guest.user_id === userId))
      )
    );
  }, [acceptedGuests]);

  const guestThumbnailIndexById = new Map(
    acceptedGuests
      .filter((guest) => guest.user_id !== focusedGuestId)
      .map((guest, index) => [guest.user_id, index] as const)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 pt-24 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!live) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 pt-24 text-center">
           <p className="text-foreground text-xl">{t("liveNotFound")}</p>
           <Button className="mt-4" onClick={() => navigate("/lives")}>{t("backToLives")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={isMobile ? "fixed inset-0 bg-black z-50" : "min-h-screen bg-background"}>
      {!isMobile && <Header />}
      <main className={isMobile ? "w-full h-full" : "container mx-auto px-4 pt-24 pb-8"}>
        {!isMobile && (
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={() => navigate("/lives")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> {t("returnBtn")}
            </Button>
            {live && <ShareButton contentType="live" contentId={id!} title={live.title || "Live"} />}
          </div>
        )}

        <div className={isMobile ? "h-full" : "grid grid-cols-1 lg:grid-cols-4 gap-6"}>
          {/* Video area */}
          <div className={isMobile ? "h-full" : "lg:col-span-3"}>
            <Card className={isMobile ? "w-full h-full bg-black border-0 rounded-none overflow-hidden" : "bg-card border-border overflow-hidden"}>
              <VideoZoomWrapper isFocused className={`relative bg-black ${isMobile ? 'h-full' : 'aspect-video'}`}>
              <div ref={videoContainerRef} className="w-full h-full relative">
                {/* Host/Viewer video — ALWAYS mounted, use CSS to show/hide */}
                {isArtist && currentUserId ? (
                  <div className={focusedGuestId ? `absolute w-24 h-20 md:w-36 md:h-24 ${isMobile ? 'bottom-[156px]' : 'bottom-4'} right-4 z-30 rounded-lg overflow-hidden border-2 border-accent cursor-pointer hover:ring-2 hover:ring-accent group` : "w-full h-full"} onClick={focusedGuestId ? () => setFocusedGuestId(null) : undefined}>
                    <WebRTCHost
                      roomId={roomId}
                      hostId={currentUserId}
                      streamType="live"
                      onStreamStart={async () => {
                        await supabase.from("artist_lives").update({ status: "live" }).eq("id", id);
                      }}
                      onStreamStop={endLive}
                      onStreamReady={(stream) => setGuestStream(stream)}
                      hideMobileControls={isMobile || !!focusedGuestId}
                      hideOverlays={!!focusedGuestId}
                      onControlsReady={setHostControls}
                    />
                    {/* Artist name/avatar + mini controls when in small thumbnail — NO LIVE badge, viewer count or Connecté */}
                    {focusedGuestId && (
                      <>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 z-10 flex items-center gap-1">
                          <Avatar className="w-4 h-4">
                            <AvatarImage src={live.artist_avatar} />
                            <AvatarFallback className="text-[6px]">{live.artist_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-[9px] md:text-[11px] text-white font-medium truncate max-w-[60px] md:max-w-[80px]">🎤 {live.artist_name}</span>
                        </div>
                        {/* Mini controls overlay on hover */}
                        {hostControls && (
                          <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-0.5 py-0.5 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-20" onClick={(e) => e.stopPropagation()}>
                            <Button size="icon" variant="ghost" className={`w-5 h-5 ${hostControls.isMicOn ? 'text-green-400' : 'text-red-400'}`} onClick={() => hostControls.handleToggleMic()} title={hostControls.isMicOn ? "Couper micro" : "Activer micro"}>
                              {hostControls.isMicOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                            </Button>
                            <Button size="icon" variant="ghost" className={`w-5 h-5 ${hostControls.isCameraOn ? 'text-green-400' : 'text-red-400'}`} onClick={() => hostControls.handleToggleCamera()} title={hostControls.isCameraOn ? "Couper caméra" : "Activer caméra"}>
                              {hostControls.isCameraOn ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="w-5 h-5 text-red-400" onClick={() => endLive()} title="Terminer le live">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : currentUserId ? (
                  <div className={focusedGuestId ? `absolute w-24 h-20 md:w-36 md:h-24 ${isMobile ? 'bottom-[156px]' : 'bottom-4'} right-4 z-30 rounded-lg overflow-hidden border-2 border-accent cursor-pointer hover:ring-2 hover:ring-accent` : "w-full h-full"} onClick={focusedGuestId ? () => setFocusedGuestId(null) : undefined}>
                    <WebRTCViewer
                      roomId={roomId}
                      viewerId={currentUserId}
                      concertTitle={live.title || "Live en cours"}
                      artistName={live.artist_name}
                    />
                    {focusedGuestId && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 z-10">
                        <span className="text-[9px] md:text-[11px] text-white font-medium truncate">🎤 {live.artist_name}</span>
                      </div>
                    )}
                  </div>
                ) : !focusedGuestId ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                    <div className="text-center">
                      <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary">
                        <AvatarImage src={live.artist_avatar} />
                        <AvatarFallback className="text-3xl">{live.artist_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <h2 className="text-white text-2xl font-bold">{live.artist_name}</h2>
                      <p className="text-white/70 text-lg">{live.title || "Live en cours"}</p>
                    </div>
                  </div>
                ) : null}

                {/* Toggle thumbnails button — only on desktop (mobile uses overlay icon) */}
                {acceptedGuests.length > 0 && !isMobile && (
                  <div className="absolute top-4 right-14 z-30">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 bg-black/50 hover:bg-black/70 text-white pointer-events-auto"
                      onClick={(e) => { e.stopPropagation(); setShowGuestThumbnails(prev => !prev); }}
                      title={showGuestThumbnails ? "Masquer les vignettes" : "Afficher les vignettes"}
                    >
                      {showGuestThumbnails ? <Minimize className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    </Button>
                  </div>
                )}

                {/* Guest video boxes - same component instances preserved between small/large */}
                {acceptedGuests.map((guest) => {
                  const isFocusedGuest = focusedGuestId === guest.user_id;
                  const thumbnailIndex = guestThumbnailIndexById.get(guest.user_id) ?? 0;

                  if (!isFocusedGuest && !showGuestThumbnails) return null;

                  return (
                    <div
                      key={guest.id}
                      className={isFocusedGuest ? "absolute inset-0 z-10" : "absolute z-20"}
                      style={
                        isFocusedGuest
                          ? undefined
                          : {
                              right: isMobile ? 8 : 16,
                                bottom: isMobile ? 156 + thumbnailIndex * 92 : 16 + thumbnailIndex * 108,
                            }
                      }
                    >
                      <GuestVideoBox
                        guestUserId={guest.user_id}
                        guestName={guest.user_name}
                        guestAvatarUrl={guest.avatar_url}
                        liveId={id!}
                        currentUserId={currentUserId}
                        localStream={guest.user_id === currentUserId ? guestStream : undefined}
                        isMainView={isFocusedGuest}
                        forceMicOff={!!hostMutedGuests[guest.user_id]}
                        onToggleExpand={() => setFocusedGuestId(isFocusedGuest ? null : guest.user_id)}
                        timerRemaining={guestTimers[guest.user_id]?.remaining}
                        timerTotal={guestTimers[guest.user_id]?.total}
                      />
                    </div>
                  );
                })}

                {/* Guest controls overlay — hidden on mobile (handled by MobileStreamOverlay icons) */}
                {isGuest && guestStream && !isMobile && (
                  <div className="absolute bottom-4 left-16 z-20 flex gap-1">
                    <Button size="icon" variant="ghost" className={`w-8 h-8 ${isMicOn ? 'bg-green-500/70' : 'bg-destructive/70'} text-white`} onClick={toggleMic}>
                      {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className={`w-8 h-8 ${isCamOn ? 'bg-green-500/70' : 'bg-destructive/70'} text-white`} onClick={toggleCam}>
                      {isCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </Button>
                    {isCamOn && (
                      <Button size="icon" variant="ghost" className="w-8 h-8 bg-secondary/70 text-white" onClick={switchGuestCamera} title={t("switchCamera")}>
                        <SwitchCamera className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="w-8 h-8 bg-destructive/80 text-white" onClick={leaveLive} title="Quitter">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Activation buttons — desktop only (mobile handled by overlay icons) */}
                {isGuest && !guestStream && !isMobile && (
                  <div className="absolute bottom-4 left-16 z-20">
                    <div className="flex gap-1">
                       <Button onClick={startGuestCamera} size="sm" className="bg-primary text-primary-foreground">
                         <Video className="w-3 h-3 mr-1" /> {t("cameraBtn")}
                       </Button>
                       <Button onClick={startGuestMic} size="sm" className="bg-primary text-primary-foreground">
                         <Mic className="w-3 h-3 mr-1" /> {t("micBtn")}
                       </Button>
                    </div>
                  </div>
                )}

                {/* Mobile TikTok overlay — all controls rendered inline (no portals) */}
                <MobileStreamOverlay
                  isLive={live.status === "live"}
                  viewerCount={viewerCount}
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
                    <ConcertGiftPanel concertId={id!} artistId={live.artist_id} artistName={live.artist_name} />
                  }
                  leaderboardContent={<GiftLeaderboard liveId={id!} />}
                  title={live.title || "Live"}
                  artistName={live.artist_name}
                  isArtist={isArtist}
                  artistControls={hostControls ? {
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
                  guestManagementContent={
                    <HostGuestControls
                      liveId={id!}
                      isHost={isArtist}
                      currentUserId={currentUserId || ""}
                      onKickGuest={() => toast({ title: t("guestKicked") })}
                    />
                  }
                  activeGuestCount={acceptedGuests.length}
                  pendingGuestCount={joinRequests.length}
                  isGuest={isGuest}
                  guestSelfControls={isGuest ? {
                    hasStream: !!guestStream,
                    isMicOn,
                    isCamOn,
                    onToggleMic: toggleMic,
                    onToggleCam: toggleCam,
                    onStartMic: startGuestMic,
                    onStartCam: startGuestCamera,
                    onLeave: leaveLive,
                    onSwitchCamera: switchGuestCamera,
                  } : undefined}
                  showGuestThumbnails={showGuestThumbnails}
                  onToggleThumbnails={() => setShowGuestThumbnails(prev => !prev)}
                  hasGuests={acceptedGuests.length > 0}
                  spectatorJoin={!isArtist && !isGuest ? {
                    hasRequested: hasRequestedJoin,
                    isGuest: false,
                    onRequestJoin: requestToJoin,
                    onCancelRequest: cancelJoinRequest,
                    onLeave: leaveLive,
                  } : undefined}
                  description={live.title || "Live spontané"}
                  onQuitLive={() => navigate("/lives")}
                  focusedParticipantInfo={focusedGuestId ? (() => {
                    const guest = acceptedGuests.find(g => g.user_id === focusedGuestId);
                    if (!guest) return null;
                    return { name: guest.user_name || "Invité", isMicOn: !hostMutedGuests[focusedGuestId], isCameraOn: true };
                  })() : null}
                />

                {Object.keys(guestTimers).length > 0 && (
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30">
                    {Object.entries(guestTimers).map(([userId, timer]) => (
                      <div key={userId} className="flex items-center gap-3 bg-background/70 backdrop-blur-md rounded-full px-4 py-2 border border-accent/40 shadow-lg animate-in fade-in slide-in-from-top-2 mb-1">
                        <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">{timer.name}</span>
                        <span className={`text-sm font-bold tabular-nums min-w-[48px] text-right ${timer.remaining <= 10 ? 'text-destructive animate-pulse' : 'text-accent'}`}>
                          {Math.floor(timer.remaining / 60)}:{String(timer.remaining % 60).padStart(2, "0")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Floating reactions (desktop) */}
                {!isMobile && <FloatingHearts hearts={hearts} />}
                {!isMobile && <FloatingEmojis emojis={floatingEmojis} />}

                {/* Fullscreen (desktop) */}
                {!isMobile && (
                  <div className="absolute bottom-4 left-4 z-20">
                    <FullscreenButton targetRef={videoContainerRef} />
                  </div>
                )}

                {/* Overlays (desktop) */}
                {!isMobile && (
                  <>
                    <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                      <Badge className="bg-destructive text-destructive-foreground animate-pulse">LIVE</Badge>
                      <Badge variant="outline" className="bg-background/50 text-foreground border-border/30">
                        <Users className="w-3 h-3 mr-1" /> {viewerCount}
                      </Badge>
                      {/* Focused guest info in top bar on desktop */}
                      {focusedGuestId && (() => {
                        const guest = acceptedGuests.find(g => g.user_id === focusedGuestId);
                        if (!guest) return null;
                        return (
                          <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                            <span className="text-foreground text-xs font-semibold truncate max-w-[150px]">{guest.user_name}</span>
                            {!hostMutedGuests[focusedGuestId] ? <Mic className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <MicOff className="w-3.5 h-3.5 text-destructive shrink-0" />}
                            <Video className="w-3.5 h-3.5 text-green-400 shrink-0" />
                          </div>
                        );
                      })()}
                    </div>
                    <div className="absolute top-4 right-4 bg-background/50 backdrop-blur-sm text-foreground px-4 py-2 rounded-full font-bold flex items-center gap-2 z-10">
                      <Heart className="w-5 h-5 fill-destructive text-destructive" /> {likes}
                    </div>
                  </>
                )}
              </div>
              </VideoZoomWrapper>

              {!isMobile && (
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={live.artist_avatar} />
                      <AvatarFallback>{live.artist_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <button onClick={() => live.artist_id && navigate(`/artist/${live.artist_id}`)} className="font-bold text-foreground hover:text-primary transition-colors">
                        {live.artist_name}
                      </button>
                      <p className="text-sm text-muted-foreground">{live.title || "Live spontané"}</p>
                      {currentUserId && live.artist_id && currentUserId !== live.artist_id && (
                        <FollowArtistButton artistId={live.artist_id} currentUserId={currentUserId} size="sm" />
                      )}
                    </div>
                  </div>

                  <div className="mb-3 w-full">
                    <EmojiReactionBar onReact={addEmoji} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                     <Button onClick={sendLike} variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                       <Heart className="w-4 h-4 mr-2" /> {t("likeBtn")}
                    </Button>

                    {!isArtist && !hasRequestedJoin && !isGuest && (
                       <Button onClick={requestToJoin} variant="outline" className="border-primary">
                         <Hand className="w-4 h-4 mr-2" /> {t("requestToJoinBtn")}
                      </Button>
                    )}

                    {hasRequestedJoin && !isGuest && (
                      <div className="flex gap-2">
                         <Badge variant="outline" className="py-2 px-4">{t("waitingLabel")}</Badge>
                         <Button size="sm" variant="ghost" onClick={cancelJoinRequest} className="text-destructive">
                           <X className="w-4 h-4 mr-1" /> {t("cancelBtn")}
                        </Button>
                      </div>
                    )}

                    {isGuest && !guestStream && (
                      <div className="flex gap-2">
                         <Button onClick={startGuestCamera} variant="secondary">
                           <Video className="w-4 h-4 mr-1" /> {t("cameraBtn")}
                         </Button>
                         <Button onClick={startGuestMic} variant="secondary">
                           <Mic className="w-4 h-4 mr-1" /> {t("micBtn")}
                         </Button>
                      </div>
                    )}

                    {isGuest && guestStream && (
                       <Button onClick={leaveLive} variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                         <LogOut className="w-4 h-4 mr-2" /> {t("leaveLiveBtn2")}
                       </Button>
                    )}

                    {/* Live report */}
                    <LiveReportButton
                      liveId={id!}
                      viewerCount={viewerCount}
                      isArtist={isArtist}
                      onAutoStop={handleAutoStopReport}
                    />

                    {isArtist && (
                       <Button onClick={endLive} variant="destructive">
                         <X className="w-4 h-4 mr-2" /> {t("endLiveBtn")}
                       </Button>
                    )}

                    {!isArtist && (
                       <Button onClick={() => navigate("/lives")} variant="ghost" className="text-muted-foreground">
                         <LogOut className="w-4 h-4 mr-2" /> {t("quitBtn")}
                       </Button>
                    )}
                  </div>
                </div>

                {/* Artist: Host guest controls */}
                {isArtist && currentUserId && (
                  <div className="mt-4 space-y-3">
                    <HostGuestControls
                      liveId={id!}
                      isHost={isArtist}
                      currentUserId={currentUserId}
                       onKickGuest={(requestId) => {
                         toast({ title: t("guestKicked") });
                      }}
                    />
                  </div>
                )}
              </CardContent>
              )}
            </Card>
          </div>

          {/* Sidebar — desktop only */}
          {!isMobile && (
          <div className="lg:col-span-1 space-y-4">
            <ConcertGiftPanel
              concertId={id!}
              artistId={live.artist_id}
              artistName={live.artist_name}
            />
            <QuickTip recipientIds={[{ id: live.artist_id, name: live.artist_name || "Artiste" }]} />
            <GiftLeaderboard liveId={id!} />

            {/* Chat */}
            <Card className="border-border">
              <CardContent className="p-3">
                <h4 className="font-semibold text-sm mb-2">{t("liveChatTitle")}</h4>
                <div className="h-[300px] overflow-y-auto overflow-x-hidden scrollbar-hidden space-y-2 mb-3 pr-1">
                  {chatMessages.map((msg) => {
                    const isReply = msg.parent_id && msg.reply_to_name;
                    return (
                      <div key={msg.id} className="flex items-start gap-2 group">
                        <Avatar className="w-6 h-6 flex-shrink-0">
                          <AvatarImage src={msg.avatar_url} />
                          <AvatarFallback className="text-xs">{msg.user_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          {isReply && (
                            <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 mb-0.5">
                              <span>↩</span>
                              <span className="font-medium text-primary">{msg.reply_to_name}</span>
                              <span className="truncate max-w-[120px] opacity-70">{msg.reply_to_message}</span>
                            </div>
                          )}
                          <span className="text-xs font-semibold text-primary">{msg.user_name}</span>
                          <p className="text-xs text-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.message}</p>
                        </div>
                        <button
                          onClick={() => setReplyToDesktop(msg)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
                          title="Répondre"
                        >
                          <span className="text-xs">↩</span>
                        </button>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                {currentUserId && (
                  <div className="space-y-1">
                    {replyToDesktop && (
                      <div className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 rounded px-2 py-1">
                        <span>↩ {replyToDesktop.user_name}:</span>
                        <span className="truncate max-w-[150px] text-muted-foreground">{replyToDesktop.message}</span>
                        <button onClick={() => setReplyToDesktop(null)} className="ml-auto text-muted-foreground hover:text-foreground">✕</button>
                      </div>
                    )}
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                          placeholder={t("writeMessagePlaceholder")}
                          className="text-sm h-8 pr-8"
                        />
                        <button
                          onClick={() => setShowDesktopEmoji(v => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          😀
                        </button>
                      </div>
                      <Button size="sm" onClick={sendMessage} className="h-8">
                        {t("sendBtnLabel")}
                      </Button>
                    </div>
                    {showDesktopEmoji && (
                      <div className="flex flex-wrap gap-1 bg-muted/50 rounded-lg p-2">
                        {["😀","😂","❤️","🔥","👏","🎵","🎤","💯","😍","🙌","💪","🎉","😮","👀","✨","🥳"].map(e => (
                          <button key={e} onClick={() => { setNewMessage(prev => prev + e); setShowDesktopEmoji(false); }} className="text-lg hover:scale-125 transition-transform p-0.5">{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          )}
        </div>
      </main>
      {!isMobile && <Footer />}
    </div>
  );
};

export default LiveStream;
