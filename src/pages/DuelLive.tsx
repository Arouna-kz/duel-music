import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { WebRTCDuelStream, WebRTCDuelStreamHandle } from "@/components/duel/WebRTCDuelStream";
import { DuelVideoTimer } from "@/components/duel/DuelVideoTimer";
import { MobileDuelControls } from "@/components/duel/MobileDuelControls";
import VotePanel from "@/components/duel/VotePanel";
import GiftPanel from "@/components/duel/GiftPanel";
import { ThreadedChat } from "@/components/chat/ThreadedChat";
import { QuickTip } from "@/components/duel/QuickTip";
import { GiftLeaderboard } from "@/components/duel/GiftLeaderboard";

import { ConcertRecordingControls } from "@/components/concert/ConcertRecordingControls";
import { FloatingHearts, useFloatingHearts } from "@/components/animations/FloatingHearts";
import { FloatingEmojis, EmojiReactionBar, useBroadcastEmojis } from "@/components/animations/FloatingEmojis";
import { GiftAnimationWithSound } from "@/components/animations/GiftAnimationWithSound";
import { StandardGiftNotification } from "@/components/animations/StandardGiftNotification";
import { WinnerAnnouncement } from "@/components/animations/WinnerAnnouncement";
import { FullscreenButton } from "@/components/streaming/FullscreenButton";
import { MobileStreamOverlay } from "@/components/streaming/MobileStreamOverlay";
import { FollowArtistButton } from "@/components/artist/FollowArtistButton";

import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Users, MicOff, Mic, Video, VideoOff, UserX, Timer, Heart, Maximize, Minimize, Eye, EyeOff, Trophy } from "lucide-react";
import { ShareButton } from "@/components/sharing/ShareButton";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface DuelChatMessage {
  id: string;
  created_at: string;
  duel_id: string;
  is_moderated: boolean | null;
  message: string;
  parent_id: string | null;
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  reply_to_name?: string;
  reply_to_message?: string;
}

type StreamSlot = 'artist1' | 'artist2' | 'manager';

type MediaState = { isMicOn: boolean; isCameraOn: boolean; isStreaming: boolean; isPaused: boolean };

const DuelLive = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [duel, setDuel] = useState<any>(null);
  const [votes, setVotes] = useState({ artist1: 0, artist2: 0 });
  const [viewersCount, setViewersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [focusedSlot, setFocusedSlot] = useState<StreamSlot | null>(null);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [profiles, setProfiles] = useState<{ artist1?: Profile; artist2?: Profile; manager?: Profile }>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [hostStream, setHostStream] = useState<MediaStream | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [mutedArtists, setMutedArtists] = useState<{ [key: string]: boolean }>({});
  const [speakingTime, setSpeakingTime] = useState<number>(120);
  const [activeTimerTargetId, setActiveTimerTargetId] = useState<string | null>(null);
  const [managerTimerRemaining, setManagerTimerRemaining] = useState(0);
  const managerTimerDeadlineRef = useRef<number | null>(null);
  const [likes, setLikes] = useState(0);
  const [mobileChatMessages, setMobileChatMessages] = useState<DuelChatMessage[]>([]);
  const [winnerAnnouncement, setWinnerAnnouncement] = useState<{ name: string; avatar: string | null; votes: number } | null>(null);
  const winnerChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Track media state for each slot (local + remote via broadcast)
  const [mediaStates, setMediaStates] = useState<Record<StreamSlot, MediaState>>({
    artist1: { isMicOn: false, isCameraOn: false, isStreaming: false, isPaused: false },
    artist2: { isMicOn: false, isCameraOn: false, isStreaming: false, isPaused: false },
    manager: { isMicOn: false, isCameraOn: false, isStreaming: false, isPaused: false },
  });
  const mediaStatesRef = useRef(mediaStates);
  const mediaChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const streamRefs = useRef<Record<StreamSlot, WebRTCDuelStreamHandle | null>>({ artist1: null, artist2: null, manager: null });
  const streamRefHandlers = useMemo<Record<StreamSlot, (handle: WebRTCDuelStreamHandle | null) => void>>(() => ({
    artist1: (handle) => { streamRefs.current.artist1 = handle; },
    artist2: (handle) => { streamRefs.current.artist2 = handle; },
    manager: (handle) => { streamRefs.current.manager = handle; },
  }), []);
  const { hearts, addHeart } = useFloatingHearts();
  const { emojis: floatingEmojis, broadcastEmoji: addEmoji } = useBroadcastEmojis(id ? `duel-emojis-${id}` : null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const likesChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const giftBroadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const translationRef = useRef(t);
  const seenGiftEventIdsRef = useRef<Set<string>>(new Set());
  const giftContextRef = useRef<{
    artist1Id: string | null;
    artist2Id: string | null;
    managerId: string | null;
    artist1Name: string;
    artist2Name: string;
    managerName: string;
  }>({
    artist1Id: null,
    artist2Id: null,
    managerId: null,
    artist1Name: "Artiste 1",
    artist2Name: "Artiste 2",
    managerName: "Manager",
  });

  const timerChannelName = `duel-timer-${id}`;
  const timerChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const muteChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const giftChannelTopic = useMemo(() => {
    const duelRoomId = duel?.room_id || (id ? `duel-${id}` : null);
    return duelRoomId ? `room_${duelRoomId}` : null;
  }, [duel?.room_id, id]);

  // Gift animation state — driven by room broadcast (room_<roomId>)
  const [activeGiftAnim, setActiveGiftAnim] = useState<{
    eventId: string;
    giftName: string;
    giftImage: string;
    senderName: string;
    recipientName: string;
    price: number;
  } | null>(null);

  const applyPersistedTimerFromDb = useCallback((timerEndsAt: string | null, targetId: string | null) => {
    if (!timerEndsAt || !targetId) {
      managerTimerDeadlineRef.current = null;
      setActiveTimerTargetId(null);
      setManagerTimerRemaining(0);
      return;
    }

    const endAtTs = new Date(timerEndsAt).getTime();
    if (Number.isNaN(endAtTs) || endAtTs <= Date.now()) {
      managerTimerDeadlineRef.current = null;
      setActiveTimerTargetId(null);
      setManagerTimerRemaining(0);
      return;
    }

    managerTimerDeadlineRef.current = endAtTs;
    setActiveTimerTargetId(targetId);
    setManagerTimerRemaining(Math.max(0, Math.ceil((endAtTs - Date.now()) / 1000)));
  }, []);

  useEffect(() => {
    giftContextRef.current = {
      artist1Id: duel?.artist1_id ?? null,
      artist2Id: duel?.artist2_id ?? null,
      managerId: duel?.manager_id ?? null,
      artist1Name: profiles.artist1?.full_name || "Artiste 1",
      artist2Name: profiles.artist2?.full_name || "Artiste 2",
      managerName: profiles.manager?.full_name || "Manager",
    };
  }, [duel?.artist1_id, duel?.artist2_id, duel?.manager_id, profiles.artist1?.full_name, profiles.artist2?.full_name, profiles.manager?.full_name]);

  const triggerAnimation = useCallback((animation: {
    eventId?: string;
    giftName: string;
    giftImage: string;
    senderName: string;
    recipientName: string;
    price: number;
  }) => {
    setActiveGiftAnim({
      eventId: animation.eventId || crypto.randomUUID(),
      giftName: animation.giftName,
      giftImage: animation.giftImage,
      senderName: animation.senderName,
      recipientName: animation.recipientName,
      price: animation.price,
    });
  }, []);

  useEffect(() => {
    translationRef.current = t;
  }, [t]);

  const handleGiftAnimationBroadcast = useCallback(async (msg: any) => {
    const payload = msg.payload ?? {};
    console.log("Animation reçue via broadcast", payload);

    const eventId = payload.event_id ?? payload.eventId;
    if (eventId && seenGiftEventIdsRef.current.has(eventId)) return;
    if (eventId) {
      seenGiftEventIdsRef.current.add(eventId);
      setTimeout(() => seenGiftEventIdsRef.current.delete(eventId), 10000);
    }

    const giftId = payload.gift_id ?? payload.giftId;
    const senderId = payload.user_id ?? payload.from_user_id;
    const recipientId = payload.to_user_id ?? payload.recipient_id;
    if (!giftId || !senderId) return;

    let giftName = payload.gift_name ?? payload.giftName;
    let giftImage = payload.gift_image ?? payload.giftImage;
    let giftPrice = Number(payload.price);
    const animationType = payload.animation_type as string | undefined;

    if (!giftName || !giftImage || Number.isNaN(giftPrice)) {
      const { data: giftData } = await supabase
        .from("virtual_gifts")
        .select("name, image_url, price")
        .eq("id", giftId)
        .maybeSingle();

      giftName = giftName || giftData?.name || "Cadeau";
      giftImage = giftImage || giftData?.image_url || "🎁";
      giftPrice = Number.isNaN(giftPrice) ? Number(giftData?.price) || 0 : giftPrice;
    }

    if (Number.isNaN(giftPrice)) {
      giftPrice = animationType === "premium" ? 5 : 0;
    }

    let senderName = payload.user_name ?? payload.senderName;
    if (!senderName) {
      const { data: senderProfiles } = await supabase.rpc("get_display_profiles", {
        user_ids: [senderId],
      });
      senderName = (senderProfiles as any[])?.[0]?.full_name || translationRef.current("userDefault");
    }

    const context = giftContextRef.current;
    const recipientFromPayload = payload.recipient_name ?? payload.recipientName;
    let recipientDisplayName = recipientFromPayload || translationRef.current("recipientLabel");

    if (!recipientFromPayload && recipientId) {
      if (recipientId === context.artist1Id) recipientDisplayName = context.artist1Name;
      else if (recipientId === context.artist2Id) recipientDisplayName = context.artist2Name;
      else if (recipientId === context.managerId) recipientDisplayName = context.managerName;
    }

    triggerAnimation({
      eventId: payload.event_id ?? payload.eventId,
      giftName,
      giftImage,
      senderName,
      recipientName: recipientDisplayName,
      price: Number.isNaN(giftPrice) ? 0 : giftPrice,
    });
  }, [triggerAnimation]);

  const sendGiftAnimationBroadcast = useCallback(async (payload: Record<string, unknown>) => {
    const eventId = (payload.event_id ?? payload.eventId ?? crypto.randomUUID()) as string;
    
    // Mark as seen immediately so the self-broadcast doesn't duplicate
    seenGiftEventIdsRef.current.add(eventId);
    setTimeout(() => seenGiftEventIdsRef.current.delete(eventId), 10000);

    // Show animation locally for the sender IMMEDIATELY (no async wait)
    const giftPrice = Number(payload.price) || 0;
    triggerAnimation({
      eventId,
      giftName: (payload.giftName ?? payload.gift_name ?? "Cadeau") as string,
      giftImage: (payload.giftImage ?? payload.gift_image ?? "🎁") as string,
      senderName: (payload.senderName ?? payload.user_name ?? "Fan") as string,
      recipientName: (payload.recipientName ?? payload.recipient_name ?? "") as string,
      price: giftPrice,
    });

    console.log("[DuelLive] Sender animation triggered, broadcasting to others:", giftChannelTopic);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const channel = giftBroadcastChannelRef.current;
      if (channel) {
        try {
          const result = await channel.send({
            type: "broadcast",
            event: "gift_animation",
            payload,
          });
          if (result === "ok") return;
        } catch (sendErr) {
          console.warn(`[DuelLive] Broadcast attempt ${attempt + 1} error:`, sendErr);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    console.error("[DuelLive] Gift broadcast failed after 10 attempts");
    return;
  }, [triggerAnimation, giftChannelTopic]);

  // Timer broadcast channel
  useEffect(() => {
    if (!id) return;

    const timerChannel = supabase
      .channel(timerChannelName, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "duel_timer" }, (payload) => {
        const { action, targetId, endsAt } = payload.payload ?? {};

        if (action === "stop") {
          applyPersistedTimerFromDb(null, null);
          return;
        }

        if (action === "start") {
          applyPersistedTimerFromDb(endsAt ?? null, targetId ?? null);
        }
      })
      .subscribe();

    timerChannelRef.current = timerChannel;

    return () => {
      timerChannelRef.current = null;
      supabase.removeChannel(timerChannel);
    };
  }, [id, timerChannelName, applyPersistedTimerFromDb]);

  // Gift animation listener — shared room channel (room_<roomId>) for all clients
  useEffect(() => {
    if (!giftChannelTopic) return;

    console.log("[DuelLive] Subscribing to gift channel:", giftChannelTopic);

    const giftChannel = supabase
      .channel(giftChannelTopic, { config: { broadcast: { self: true, ack: true } } })
      .on("broadcast", { event: "gift_animation" }, (msg) => {
        console.log("[DuelLive] Gift broadcast received by listener:", msg);
        handleGiftAnimationBroadcast(msg);
      })
      .subscribe((status) => {
        console.log("[DuelLive] Gift channel status:", status);
        if (status === "SUBSCRIBED") {
          giftBroadcastChannelRef.current = giftChannel;
        }
      });

    return () => {
      if (giftBroadcastChannelRef.current === giftChannel) {
        giftBroadcastChannelRef.current = null;
      }
      supabase.removeChannel(giftChannel);
    };
  }, [giftChannelTopic, handleGiftAnimationBroadcast]);

  // FORCE_MUTE / FORCE_UNMUTE broadcast for manager controls
  useEffect(() => {
    if (!id) return;

    const muteChannel = supabase
      .channel(`duel-mute-${id}`, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "FORCE_MUTE" }, (payload) => {
        const artistId = payload.payload?.artistId;
        if (!artistId) return;
        setMutedArtists((prev) => ({ ...prev, [artistId]: true }));
      })
      .on("broadcast", { event: "FORCE_UNMUTE" }, (payload) => {
        const artistId = payload.payload?.artistId;
        if (!artistId) return;
        setMutedArtists((prev) => ({ ...prev, [artistId]: false }));
      })
      .subscribe();

    muteChannelRef.current = muteChannel;

    return () => {
      muteChannelRef.current = null;
      supabase.removeChannel(muteChannel);
    };
  }, [id]);

  // Tick countdown (persistent from DB: current_timer_ends_at)
  useEffect(() => {
    if (!activeTimerTargetId || !managerTimerDeadlineRef.current) return;

    const tick = () => {
      if (!managerTimerDeadlineRef.current) return;

      const next = Math.max(0, Math.ceil((managerTimerDeadlineRef.current - Date.now()) / 1000));
      setManagerTimerRemaining(next);

      if (next > 0) return;

      managerTimerDeadlineRef.current = null;
      setActiveTimerTargetId(null);

      const canPersistStop = !!currentUserId && duel?.manager_id === currentUserId;
      if (!canPersistStop || !id) return;

      void supabase
        .from("duels")
        .update({ current_timer_ends_at: null, current_timer_target_id: null } as any)
        .eq("id", id);

      timerChannelRef.current?.send({
        type: "broadcast",
        event: "duel_timer",
        payload: { action: "stop", targetId: null, endsAt: null },
      });
    };

    tick();
    const interval = setInterval(tick, 250);

    return () => clearInterval(interval);
  }, [activeTimerTargetId, currentUserId, duel?.manager_id, id]);

  const broadcastTimerToAll = useCallback(async (action: "start" | "stop", targetId: string, value?: number) => {
    if (!id) return;

    if (action === "start" && value) {
      const endsAt = new Date(Date.now() + value * 1000).toISOString();

      applyPersistedTimerFromDb(endsAt, targetId);

      const { error } = await supabase
        .from("duels")
        .update({ current_timer_ends_at: endsAt, current_timer_target_id: targetId } as any)
        .eq("id", id);

      if (!error) {
        timerChannelRef.current?.send({
          type: "broadcast",
          event: "duel_timer",
          payload: { action: "start", targetId, endsAt },
        });
      }
      return;
    }

    applyPersistedTimerFromDb(null, null);

    const { error } = await supabase
      .from("duels")
      .update({ current_timer_ends_at: null, current_timer_target_id: null } as any)
      .eq("id", id);

    if (!error) {
      timerChannelRef.current?.send({
        type: "broadcast",
        event: "duel_timer",
        payload: { action: "stop", targetId, endsAt: null },
      });
    }
  }, [id, applyPersistedTimerFromDb]);

  // Mute toggle with FORCE_MUTE broadcast
  const toggleMuteArtist = useCallback((artistId: string) => {
    setMutedArtists((prev) => {
      const shouldMute = !prev[artistId];

      muteChannelRef.current?.send({
        type: "broadcast",
        event: shouldMute ? "FORCE_MUTE" : "FORCE_UNMUTE",
        payload: { artistId },
      });

      return { ...prev, [artistId]: shouldMute };
    });
  }, []);

  useEffect(() => {
    mediaStatesRef.current = mediaStates;
  }, [mediaStates]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Auto-fullscreen on mobile
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
    return () => { clearTimeout(timeout); document.removeEventListener("fullscreenchange", onFullscreenChange); };
  }, [isMobile]);

  // Fetch votes
  const fetchVotes = async (artist1Id: string, artist2Id: string) => {
    const { data } = await supabase.from("duel_votes").select("artist_id, amount").eq("duel_id", id);
    if (data) {
      const a1 = data.filter((v) => v.artist_id === artist1Id).reduce((sum, v) => sum + Number(v.amount), 0);
      const a2 = data.filter((v) => v.artist_id === artist2Id).reduce((sum, v) => sum + Number(v.amount), 0);
      setVotes({ artist1: a1, artist2: a2 });
    }
  };

  useEffect(() => {
    if (!id) return;
    const fetchDuel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        setUserRoles(roles?.map(r => r.role) || []);
      }
      const { data, error } = await supabase.from("duels").select("*").eq("id", id).single();
      if (error) { toast({ title: t("error"), description: t("loadingDuel"), variant: "destructive" }); navigate("/duels"); return; }
      setDuel(data); setStartedAt(data.started_at); applyPersistedTimerFromDb(data.current_timer_ends_at ?? null, data.current_timer_target_id ?? null); setLoading(false);
      fetchVotes(data.artist1_id, data.artist2_id);
      
      // Load persisted likes
      const { data: likesData } = await supabase.from("live_likes").select("likes_count").eq("live_id", id).single();
      if (likesData) setLikes(likesData.likes_count);
      
      const profileIds = [data.artist1_id, data.artist2_id, data.manager_id].filter(Boolean);
      const { data: profilesData } = await supabase.rpc("get_display_profiles", { user_ids: profileIds });
      if (profilesData) {
        const pm: any = {};
        profilesData.forEach((p) => {
          if (p.id === data.artist1_id) pm.artist1 = p;
          if (p.id === data.artist2_id) pm.artist2 = p;
          if (p.id === data.manager_id) pm.manager = p;
        });
        setProfiles(pm);
      }
    };
    fetchDuel();
  }, [id, navigate, toast, applyPersistedTimerFromDb]);

  useEffect(() => {
    if (!id) return;

    const duelStateChannel = supabase
      .channel(`duel-state-${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "duels",
        filter: `id=eq.${id}`,
      }, (payload) => {
        const updatedDuel = payload.new as any;
        setDuel((prev: any) => ({ ...(prev || {}), ...updatedDuel }));
        applyPersistedTimerFromDb(updatedDuel.current_timer_ends_at ?? null, updatedDuel.current_timer_target_id ?? null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(duelStateChannel);
    };
  }, [id, applyPersistedTimerFromDb]);

  // Realtime
  useEffect(() => {
    if (!id || !duel) return;
    const votesChannel = supabase.channel(`duel-votes-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "duel_votes", filter: `duel_id=eq.${id}` }, () => fetchVotes(duel.artist1_id, duel.artist2_id))
      .subscribe();
    const presenceChannel = supabase.channel(`duel-presence-${id}`, { config: { presence: { key: crypto.randomUUID() } } });
    presenceChannel
      .on("presence", { event: "sync" }, () => setViewersCount(Object.keys(presenceChannel.presenceState()).length))
      .subscribe(async (status) => { if (status === "SUBSCRIBED") await presenceChannel.track({ online_at: new Date().toISOString() }); });
    const likesChannel = supabase.channel(`duel-likes-${id}`)
      .on("broadcast", { event: "like" }, (payload) => setLikes(payload.payload.count))
      .subscribe();
    likesChannelRef.current = likesChannel;

    if (isMobile) {
      const loadMobileChat = async () => {
        const { data: msgs } = await supabase.from("duel_chat_messages").select("*").eq("duel_id", id).eq("is_moderated", false).order("created_at", { ascending: true }).limit(50);
        if (msgs) {
          const userIds = [...new Set(msgs.map(m => m.user_id))];
          const { data: profs } = await supabase.rpc("get_display_profiles", { user_ids: userIds });
          const pm = new Map(profs?.map(p => [p.id, p]) || []);
          const msgMap = new Map<string, DuelChatMessage>();
          const enriched: DuelChatMessage[] = msgs.map((m) => {
            const message: DuelChatMessage = {
              ...m,
              user_name: pm.get(m.user_id)?.full_name || "Utilisateur",
              avatar_url: pm.get(m.user_id)?.avatar_url ?? null,
            };
            msgMap.set(m.id, message);
            return message;
          });
          setMobileChatMessages(
            enriched.map((message) => {
              if (!message.parent_id) return message;

              const parent = msgMap.get(message.parent_id);
              if (!parent) return message;

              return {
                ...message,
                reply_to_name: parent.user_name,
                reply_to_message: parent.message,
              };
            })
          );
        }
      };
      loadMobileChat();
      const chatChannel = supabase.channel(`duel-mobile-chat-${id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "duel_chat_messages", filter: `duel_id=eq.${id}` }, async (payload) => {
          const msg = payload.new as any;
          if (msg.is_moderated) return;
          const { data: profArr } = await supabase.rpc("get_display_profiles", { user_ids: [msg.user_id] });
          const profile = profArr?.[0] || null;
          setMobileChatMessages(prev => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            const parent = prev.find((m) => m.id === msg.parent_id);
            const nextMessage: DuelChatMessage = {
              ...msg,
              user_name: profile?.full_name || "Utilisateur",
              avatar_url: profile?.avatar_url ?? null,
              reply_to_name: parent?.user_name,
              reply_to_message: parent?.message,
            };

            return [...prev.slice(-49), nextMessage];
          });
        })
        .subscribe();
      return () => { supabase.removeChannel(votesChannel); supabase.removeChannel(presenceChannel); supabase.removeChannel(likesChannel); supabase.removeChannel(chatChannel); };
    }
    return () => { supabase.removeChannel(votesChannel); supabase.removeChannel(presenceChannel); supabase.removeChannel(likesChannel); };
  }, [id, duel, isMobile]);


  const isParticipant = currentUserId && duel && (currentUserId === duel.artist1_id || currentUserId === duel.artist2_id || currentUserId === duel.manager_id);
  const isManager = currentUserId === duel?.manager_id;
  const isArtist1 = currentUserId === duel?.artist1_id;
  const isArtist2 = currentUserId === duel?.artist2_id;
  const isDuelArtist = isArtist1 || isArtist2;
  const roomId = duel?.room_id || `duel-${id}`;
  const isLive = duel?.status === 'live';
  // Which slot is "self" for the current user?
  const selfSlot: StreamSlot | null = isArtist1 ? 'artist1' : isArtist2 ? 'artist2' : isManager ? 'manager' : null;

  const handleStreamReady = useCallback(async (stream: MediaStream) => {
    setHostStream(stream);
    if (duel?.status === 'upcoming') {
      const now = new Date().toISOString();
      setStartedAt(now);
      await supabase.from("duels").update({ status: "live", started_at: now } as any).eq("id", id);
    }
  }, [duel?.status, id]);

  const sendLike = async () => {
    const newCount = likes + 1;
    setLikes(newCount);
    addHeart();
    // Persist to DB
    await supabase.from("live_likes").upsert(
      { live_id: id!, likes_count: newCount },
      { onConflict: "live_id" }
    );
    likesChannelRef.current?.send({ type: "broadcast", event: "like", payload: { count: newCount } });
  };

  const handleMobileSendMessage = async (msg: string, parentId?: string | null) => {
    if (!currentUserId) return;
    const insertData: any = { duel_id: id, user_id: currentUserId, message: msg };
    if (parentId) insertData.parent_id = parentId;
    await supabase.from("duel_chat_messages").insert(insertData);
  };

  const announceWinner = async () => {
    if (!duel || !id) return;
    const a1votes = votes.artist1;
    const a2votes = votes.artist2;
    const winnerId = a1votes >= a2votes ? duel.artist1_id : duel.artist2_id;
    const winnerProfile = winnerId === duel.artist1_id ? profiles.artist1 : profiles.artist2;
    const winnerVoteCount = winnerId === duel.artist1_id ? a1votes : a2votes;

    // Save winner to DB but do NOT end the duel
    await supabase.from("duels").update({ winner_id: winnerId } as any).eq("id", id);

    const payload = { name: winnerProfile?.full_name || "Vainqueur", avatar: winnerProfile?.avatar_url || null, votes: winnerVoteCount };
    setWinnerAnnouncement(payload);

    // Broadcast to all
    winnerChannelRef.current?.send({ type: "broadcast", event: "winner_announced", payload });
  };

  // Winner announcement channel — listens to both announce and stop events from manager
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`duel-winner-${id}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "winner_announced" }, (msg) => {
        setWinnerAnnouncement(msg.payload);
      })
      .on("broadcast", { event: "winner_stopped" }, () => {
        setWinnerAnnouncement(null);
      })
      .subscribe();
    winnerChannelRef.current = channel;
    return () => { winnerChannelRef.current = null; supabase.removeChannel(channel); };
  }, [id]);

  // When manager stops the animation locally, broadcast the stop to everyone
  const handleStopWinnerAnnouncement = useCallback(() => {
    setWinnerAnnouncement(null);
    winnerChannelRef.current?.send({ type: "broadcast", event: "winner_stopped", payload: {} });
  }, []);

  const endDuel = async () => {
    const now = new Date().toISOString();
    await supabase.from("duels").update({ status: "ended", ended_at: now } as any).eq("id", id);
    toast({ title: t("duelEnded"), description: t("duelEndedDesc") });
    navigate("/duels");
  };

  const duelDescription = profiles.artist1?.full_name && profiles.artist2?.full_name
    ? `${profiles.artist1.full_name} vs ${profiles.artist2.full_name}` : "Duel";

  const getSlotName = (slot: StreamSlot) =>
    slot === 'artist1' ? (profiles.artist1?.full_name || "Artiste 1")
    : slot === 'artist2' ? (profiles.artist2?.full_name || "Artiste 2")
    : (profiles.manager?.full_name || "Manager");

  const getSlotId = (slot: StreamSlot) =>
    slot === 'artist1' ? duel?.artist1_id : slot === 'artist2' ? duel?.artist2_id : duel?.manager_id;

  const getSlotLabel = (slot: StreamSlot) =>
    slot === 'manager' ? `🎙️ ${getSlotName(slot)}` : `🎤 ${getSlotName(slot)}`;

  const updateSlotMediaState = useCallback((slot: StreamSlot, nextState: MediaState) => {
    setMediaStates((prev) => {
      const current = prev[slot];
      if (
        current &&
        current.isMicOn === nextState.isMicOn &&
        current.isCameraOn === nextState.isCameraOn &&
        current.isStreaming === nextState.isStreaming &&
        current.isPaused === nextState.isPaused
      ) {
        return prev;
      }

      return { ...prev, [slot]: nextState };
    });
  }, []);

  const handleLocalMediaStateChange = useCallback((slot: StreamSlot, state: MediaState) => {
    updateSlotMediaState(slot, state);
    mediaChannelRef.current?.send({ type: "broadcast", event: "media-state", payload: { slot, state } });

    if (selfSlot === slot) {
      mediaChannelRef.current?.track({ slot, ...state });
    }
  }, [selfSlot, updateSlotMediaState]);

  const mediaStateHandlers = useMemo<Record<StreamSlot, (state: MediaState) => void>>(() => ({
    artist1: (state) => handleLocalMediaStateChange('artist1', state),
    artist2: (state) => handleLocalMediaStateChange('artist2', state),
    manager: (state) => handleLocalMediaStateChange('manager', state),
  }), [handleLocalMediaStateChange]);

  // Subscribe to media state via broadcast + presence for initial sync
  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`duel-media-${id}`, { config: { presence: { key: selfSlot || `viewer-${currentUserId || 'anon'}` } } })
      .on("broadcast", { event: "media-state" }, (payload) => {
        const { slot, state } = payload.payload;
        if (slot && state && slot !== selfSlot) {
          updateSlotMediaState(slot, state as MediaState);
        }
      })
      .on("presence", { event: "sync" }, () => {
        const presState = channel.presenceState();
        Object.values(presState).forEach((entries: any) => {
          const entry = entries[0];
          if (entry?.slot && entry.slot !== selfSlot) {
            updateSlotMediaState(entry.slot, {
              isMicOn: !!entry.isMicOn,
              isCameraOn: !!entry.isCameraOn,
              isStreaming: !!entry.isStreaming,
              isPaused: !!entry.isPaused,
            });
          }
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && selfSlot) {
          await channel.track({ slot: selfSlot, ...mediaStatesRef.current[selfSlot] });
        }
      });
    mediaChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [id, selfSlot, currentUserId, updateSlotMediaState]);

  // No auto-start: participants must manually activate their mic/camera

  // Determine border color based on media state
  const getBorderClass = (slot: StreamSlot) => {
    const s = mediaStates[slot];
    if (!s.isStreaming) return "border-muted-foreground/30";
    if (s.isMicOn && s.isCameraOn) return "border-green-500";
    if (s.isMicOn || s.isCameraOn) return "border-yellow-500";
    return "border-destructive";
  };

  // Build the stream component with per-video timer overlay
  const renderStream = (slot: StreamSlot, hideName = false, hideControls = false) => {
    const slotId = getSlotId(slot);
    if (!slotId) return null;
    const shouldHideControls = isMobile ? true : hideControls;
    return (
      <>
        <WebRTCDuelStream
          ref={streamRefHandlers[slot]}
          roomId={`${roomId}-${slot}`}
          duelId={id}
          oderId={slotId}
          signalingUserId={currentUserId || undefined}
          participantName={getSlotName(slot)}
          avatarUrl={profiles[slot]?.avatar_url}
          isCurrentUser={currentUserId === slotId}
          isParticipant={currentUserId === slotId}
          onStreamReady={handleStreamReady}
          isMutedByManager={mutedArtists[slotId]}
          hideName={hideName}
          hideControls={shouldHideControls}
          onMediaStateChange={mediaStateHandlers[slot]}
        />
        {/* Independent timer overlay — does not cause parent re-renders */}
        {(slot === 'artist1' || slot === 'artist2') && (
          <DuelVideoTimer targetUserId={slotId} activeTargetId={activeTimerTargetId} remaining={managerTimerRemaining} />
        )}
      </>
    );
  };

  // Media state indicator badges
  const MediaIndicator = ({ slot, small = false }: { slot: StreamSlot; small?: boolean }) => {
    const s = mediaStates[slot];
    const sz = small ? "w-3 h-3" : "w-3.5 h-3.5";
    return (
      <div className="flex items-center gap-0.5">
        {s.isMicOn ? <Mic className={`${sz} text-green-400`} /> : <MicOff className={`${sz} text-destructive`} />}
        {s.isCameraOn ? <Video className={`${sz} text-green-400`} /> : <VideoOff className={`${sz} text-destructive`} />}
      </div>
    );
  };

  // selfSlot is declared above near role declarations
  // Determine layout order for mobile:
  // - If spectator or manager: manager large on top, artists horizontal below
  // - If artist: self large on top, others horizontal below
  const getMainSlot = (): StreamSlot => {
    if (isArtist1) return 'artist1';
    if (isArtist2) return 'artist2';
    return 'manager'; // spectator or manager → manager large
  };

  const getSecondarySlots = (): StreamSlot[] => {
    const main = getMainSlot();
    const all: StreamSlot[] = ['artist1', 'artist2'];
    if (duel?.manager_id) all.push('manager');
    return all.filter(s => s !== main);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/30 rounded-full" />
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute inset-0" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-foreground">⚔️</span>
            <p className="text-muted-foreground font-medium animate-pulse">{t("loadingDuel")}</p>
          </div>
        </div>
      </div>
    );
  }

  // ===== MOBILE LAYOUT =====
  if (isMobile && duel) {
    const mainSlot = getMainSlot();
    const secondarySlots = getSecondarySlots();
    const allSlots: StreamSlot[] = ['artist1', 'artist2', ...(duel.manager_id ? ['manager' as StreamSlot] : [])];

    return (
      <div className="fixed inset-0 bg-black z-50">
        <div className="relative w-full h-full" ref={videoContainerRef}>

          {/* === ALL STREAMS rendered persistently — CSS controls position, never unmounted === */}
          {allSlots.map(slot => {
            const isFocused = focusedSlot === slot;
            const isMain = !focusedSlot && slot === mainSlot;
            const isSecondary = !focusedSlot && secondarySlots.includes(slot);
            const isOverlay = focusedSlot && focusedSlot !== slot;

            let style: React.CSSProperties = { position: 'absolute', transition: 'top 0.3s ease, bottom 0.3s ease, left 0.3s ease, right 0.3s ease, width 0.3s ease, height 0.3s ease, opacity 0.3s ease' };
            let extraClass = "overflow-hidden";

            if (isFocused) {
              style = { ...style, inset: 0, zIndex: 10 };
            } else if (isOverlay) {
              if (!showThumbnails) {
                style = { ...style, opacity: 0, pointerEvents: 'none', width: '1px', height: '1px', bottom: 0, right: 0 };
              } else {
                const overlaySlots = allSlots.filter(s => s !== focusedSlot);
                const idx = overlaySlots.indexOf(slot);
                style = { ...style, bottom: `${136 + idx * 88}px`, right: '12px', width: '112px', height: '80px', zIndex: 40, borderRadius: '8px' };
                extraClass += ` border-2 ${getBorderClass(slot)} cursor-pointer bg-black/40 backdrop-blur-sm`;
              }
            } else if (isMain) {
              style = { ...style, top: 0, left: 0, right: 0, bottom: 'calc(22% + 136px)', zIndex: 1 };
              extraClass += ` border-b-2 ${getBorderClass(slot)}`;
            } else if (isSecondary) {
              const secIdx = secondarySlots.indexOf(slot);
              style = { ...style, bottom: '136px', height: '22%', left: `${(secIdx / secondarySlots.length) * 100}%`, width: `${100 / secondarySlots.length}%`, zIndex: 1 };
              extraClass += ` border-t-2 ${getBorderClass(slot)} cursor-pointer`;
            }

            return (
              <div
                key={slot}
                className={extraClass}
                style={style}
                onClick={() => !isFocused ? setFocusedSlot(slot) : undefined}
              >
                {renderStream(slot, true, isFocused ? false : true)}


                {/* Overlay thumbnail label */}
                {isOverlay && showThumbnails && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 flex items-center justify-between">
                    <span className="text-[9px] text-white font-medium truncate max-w-[60px]">{getSlotName(slot)}</span>
                    <MediaIndicator slot={slot} small />
                  </div>
                )}

                {/* Main slot labels — tap slot to focus, no Maximize icon (use top bar toggle) */}
                {isMain && (
                  <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5">
                    <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); setFocusedSlot(slot); }}>
                      {getSlotLabel(slot)}
                      <MediaIndicator slot={slot} />
                    </span>
                  </div>
                )}

                {/* Secondary slot labels — tap to focus */}
                {isSecondary && (
                  <div className="absolute bottom-1 left-1 z-10 flex items-center gap-1">
                    <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm flex items-center gap-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); setFocusedSlot(slot); }}>
                      {getSlotLabel(slot)}
                      <MediaIndicator slot={slot} small />
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Timer overlays are now inside each video box via DuelVideoTimer */}

          {/* Back button - hidden on mobile */}
          <button onClick={() => navigate("/duels")} className="absolute top-3 left-3 z-50 w-8 h-8 rounded-full bg-background/30 backdrop-blur-sm hidden md:flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          {/* Share button is rendered via MobileStreamOverlay rightTopContent */}

          {/* Mobile overlay */}
          <MobileStreamOverlay
            isLive={isLive}
            viewerCount={viewersCount}
            likes={likes}
            onLike={sendLike}
            chatMessages={mobileChatMessages}
            onSendMessage={handleMobileSendMessage}
            currentUserId={currentUserId}
            hearts={hearts}
            addHeart={addHeart}
            floatingEmojis={floatingEmojis}
            onEmojiReact={addEmoji}
            videoContainerRef={videoContainerRef as any}
            rightTopContent={
              <>
                <ShareButton contentType="duel" contentId={id!} title={`Duel: ${profiles.artist1?.full_name || ''} vs ${profiles.artist2?.full_name || ''}`} variant="overlay" />
                {/* Layout toggle: focus main slot or return to grid view (NOT a fullscreen toggle — mobile is already fullscreen) */}
                <button
                  onClick={() => setFocusedSlot(prev => prev ? null : getMainSlot())}
                  className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
                  title={focusedSlot ? t("gridView") || "Vue grille" : t("focusView") || "Mettre au centre"}
                >
                  {focusedSlot ? <Users className="w-4 h-4 text-white" /> : <Maximize className="w-4 h-4 text-white" />}
                </button>
              </>
            }
            focusedParticipantInfo={focusedSlot ? { name: getSlotName(focusedSlot), isMicOn: mediaStates[focusedSlot].isMicOn, isCameraOn: mediaStates[focusedSlot].isCameraOn } : null}
            title={duelDescription}
            artistName={duelDescription}
            badgeLabel="⚔️ DUEL"
            description={duelDescription}
            onQuitLive={() => navigate("/duels")}
            showGuestThumbnails={showThumbnails}
            onToggleThumbnails={() => setShowThumbnails(prev => !prev)}
            hasGuests={true}
            voteBarContent={
              votes.artist1 + votes.artist2 > 0 || isLive ? (
                <div className="w-full h-7 bg-black/60 backdrop-blur-sm flex items-center relative overflow-hidden">
                  <div className="h-full bg-primary/70 transition-all duration-500 flex items-center justify-start pl-1.5" style={{ width: `${votes.artist1 + votes.artist2 > 0 ? (votes.artist1 / (votes.artist1 + votes.artist2)) * 100 : 50}%` }}>
                    <span className="text-[9px] text-white font-bold truncate max-w-[40%]">{profiles.artist1?.full_name?.split(' ')[0] || 'A1'} {votes.artist1}</span>
                  </div>
                  <div className="flex-1 h-full bg-accent/70 flex items-center justify-end pr-1.5">
                    <span className="text-[9px] text-white font-bold truncate max-w-[40%]">{votes.artist2} {profiles.artist2?.full_name?.split(' ')[0] || 'A2'}</span>
                  </div>
                </div>
              ) : undefined
            }
            giftPanelContent={
              <GiftPanel duelId={id!} roomId={roomId} artist1Id={duel.artist1_id} artist2Id={duel.artist2_id} managerId={duel.manager_id}
                onGiftAnimationBroadcast={sendGiftAnimationBroadcast}
                artist1Name={profiles.artist1?.full_name || "Artiste 1"} artist2Name={profiles.artist2?.full_name || "Artiste 2"} managerName={profiles.manager?.full_name || "Manager"} />
            }
            leaderboardContent={<GiftLeaderboard duelId={id!} />}
            votePanelContent={
              <VotePanel duelId={id!} artist1Id={duel.artist1_id} artist2Id={duel.artist2_id} />
            }
            recordingContent={
              isManager && hostStream ? (
                <ConcertRecordingControls
                  stream={hostStream}
                  concertId={id!}
                  userId={currentUserId!}
                  isArtistConcert={false}
                  isDuel={true}
                  duelTitle={`Duel: ${profiles.artist1?.full_name || 'A1'} vs ${profiles.artist2?.full_name || 'A2'}`}
                  onRecordingSaved={() => {}}
                />
              ) : undefined
            }
            extraControls={
              (!isManager && !hostStream) ? (
                <VotePanel duelId={id!} artist1Id={duel.artist1_id} artist2Id={duel.artist2_id} />
              ) : undefined
            }
            maxVisibleMessages={4}
            extraLeftControls={
              selfSlot && isParticipant ? (
                <MobileDuelControls
                  isStreaming={mediaStates[selfSlot].isStreaming}
                  isPaused={mediaStates[selfSlot].isPaused}
                  isCameraOn={mediaStates[selfSlot].isCameraOn}
                  isMicOn={mediaStates[selfSlot].isMicOn}
                  onStart={() => streamRefs.current[selfSlot!]?.startStreaming()}
                  onPause={() => streamRefs.current[selfSlot!]?.pauseStream()}
                  onResume={() => streamRefs.current[selfSlot!]?.resumeStream()}
                  onStop={() => streamRefs.current[selfSlot!]?.stopStreaming()}
                  onToggleCamera={() => streamRefs.current[selfSlot!]?.toggleCamera()}
                  onToggleMic={() => streamRefs.current[selfSlot!]?.toggleMic()}
                  onSwitchCamera={() => streamRefs.current[selfSlot!]?.switchCamera()}
                />
              ) : undefined
            }
            managerControlsContent={
              isManager && isLive ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant={mutedArtists[duel.artist1_id] ? "destructive" : "outline"} onClick={() => toggleMuteArtist(duel.artist1_id)}>
                      <MicOff className="w-3 h-3 mr-1" />{mutedArtists[duel.artist1_id] ? "Unmute" : "Mute"} {profiles.artist1?.full_name?.split(" ")[0] || "A1"}
                    </Button>
                    <Button size="sm" variant={mutedArtists[duel.artist2_id] ? "destructive" : "outline"} onClick={() => toggleMuteArtist(duel.artist2_id)}>
                      <MicOff className="w-3 h-3 mr-1" />{mutedArtists[duel.artist2_id] ? "Unmute" : "Mute"} {profiles.artist2?.full_name?.split(" ")[0] || "A2"}
                    </Button>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("speakingTimeLabel")} : {speakingTime >= 60 ? `${Math.floor(speakingTime / 60)}min ${speakingTime % 60 > 0 ? `${speakingTime % 60}s` : ''}` : `${speakingTime}s`}</p>
                    <Slider value={[speakingTime]} onValueChange={(v) => setSpeakingTime(v[0])} min={15} max={3600} step={15} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="secondary" disabled={activeTimerTargetId === duel.artist1_id && managerTimerRemaining > 0}
                      onClick={() => { broadcastTimerToAll('start', duel.artist1_id, speakingTime); setActiveTimerTargetId(duel.artist1_id); }}>
                      <Timer className="w-3 h-3 mr-1" />{t("turnOfLabel")} {profiles.artist1?.full_name?.split(" ")[0] || "A1"}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={activeTimerTargetId === duel.artist2_id && managerTimerRemaining > 0}
                      onClick={() => { broadcastTimerToAll('start', duel.artist2_id, speakingTime); setActiveTimerTargetId(duel.artist2_id); }}>
                      <Timer className="w-3 h-3 mr-1" />{t("turnOfLabel")} {profiles.artist2?.full_name?.split(" ")[0] || "A2"}
                    </Button>
                  </div>
                  {activeTimerTargetId && managerTimerRemaining > 0 && (
                    <div className="text-center p-2 bg-accent/20 rounded-lg">
                      <p className="text-sm font-bold">
                        {t("turnOfLabel")} {activeTimerTargetId === duel.artist1_id ? profiles.artist1?.full_name : profiles.artist2?.full_name}
                      </p>
                      <p className={`text-2xl font-mono font-bold tabular-nums my-1 ${managerTimerRemaining <= 10 ? "text-destructive" : "text-accent"}`}>
                        {Math.floor(managerTimerRemaining / 60)}:{String(managerTimerRemaining % 60).padStart(2, "0")}
                      </p>
                      <Button size="sm" variant="ghost" onClick={() => broadcastTimerToAll('stop', activeTimerTargetId)} className="mt-1">
                        {t("stopTimerBtn")}
                      </Button>
                    </div>
                  )}
                   <Button size="sm" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold" onClick={announceWinner} disabled={!!winnerAnnouncement}>
                     <Trophy className="w-3 h-3 mr-1" />{t("announceWinner")}
                   </Button>
                   <Button size="sm" variant="destructive" className="w-full" onClick={endDuel}>
                     <UserX className="w-3 h-3 mr-1" />{t("endDuelBtn")}
                   </Button>
                </div>
              ) : undefined
            }
          />
          {/* Gift animations — visible to ALL viewers */}
          {activeGiftAnim && (
            activeGiftAnim.price < 10 ? (
              <StandardGiftNotification key={activeGiftAnim.eventId} giftName={activeGiftAnim.giftName} giftImage={activeGiftAnim.giftImage} senderName={activeGiftAnim.senderName} recipientName={activeGiftAnim.recipientName} onComplete={() => setActiveGiftAnim(null)} />
            ) : (
              <GiftAnimationWithSound key={activeGiftAnim.eventId} giftName={activeGiftAnim.giftName} giftImage={activeGiftAnim.giftImage} senderName={activeGiftAnim.senderName} recipientName={activeGiftAnim.recipientName} enableSound={activeGiftAnim.price >= 50} onComplete={() => setActiveGiftAnim(null)} />
            )
          )}
          {winnerAnnouncement && (
            <WinnerAnnouncement winnerName={winnerAnnouncement.name} winnerAvatar={winnerAnnouncement.avatar} winnerVotes={winnerAnnouncement.votes} onStop={handleStopWinnerAnnouncement} canDismiss={isManager} />
          )}
        </div>
      </div>
    );
  }

  // ===== DESKTOP LAYOUT =====
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/duels")}>
            <ArrowLeft className="w-4 h-4 mr-2" />{t("back")}
          </Button>
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge className="bg-destructive text-destructive-foreground flex items-center gap-1">
                <span className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse" />
                ⚔️ DUEL LIVE
              </Badge>
            )}
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="w-3 h-3" />{viewersCount} viewers
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Timer overlays are now inside each video box via DuelVideoTimer */}

            <Card className="bg-card border-border overflow-hidden">
              <div ref={videoContainerRef} className="relative aspect-video bg-black">
                {/* ALL STREAMS rendered persistently — CSS controls position, never unmounted */}
                {(() => {
                  const desktopSlots = ['artist1', ...(duel.manager_id ? ['manager'] : []), 'artist2'] as StreamSlot[];
                  return desktopSlots.map(slot => {
                    const isFocused = focusedSlot === slot;
                    const isThumbnail = focusedSlot != null && focusedSlot !== slot;
                    const isGrid = !focusedSlot;

                    let style: React.CSSProperties = { position: 'absolute', transition: 'top 0.3s ease, bottom 0.3s ease, left 0.3s ease, right 0.3s ease, width 0.3s ease, height 0.3s ease, opacity 0.3s ease' };
                    let extraClass = "overflow-hidden";

                    if (isFocused) {
                      style = { ...style, inset: 0, zIndex: 10 };
                    } else if (isThumbnail) {
                      if (!showThumbnails) {
                        style = { ...style, opacity: 0, pointerEvents: 'none', width: '1px', height: '1px', bottom: 0, left: 0 };
                      } else {
                        const thumbSlots = desktopSlots.filter(s => s !== focusedSlot);
                        const idx = thumbSlots.indexOf(slot);
                        style = { ...style, bottom: `${80 + idx * 108}px`, left: '16px', width: '144px', height: '96px', zIndex: 30, borderRadius: '8px' };
                        extraClass += ` border-2 ${getBorderClass(slot)} cursor-pointer hover:ring-2 hover:ring-primary`;
                      }
                    } else {
                      // Grid
                      const gridIdx = desktopSlots.indexOf(slot);
                      const count = desktopSlots.length;
                      style = { ...style, top: 0, bottom: 0, left: `${(gridIdx / count) * 100}%`, width: `${100 / count}%`, zIndex: 1 };
                      extraClass += ` border-x border-border/20 cursor-pointer group`;
                    }

                    return (
                      <div
                        key={slot}
                        className={extraClass}
                        style={style}
                        onClick={() => !isFocused ? setFocusedSlot(slot) : undefined}
                      >
                        {renderStream(slot, true, isFocused ? (slot !== selfSlot) : true)}

                        {/* Focused label — moved to top bar overlay, no longer shown at bottom */}

                        {/* Thumbnail label */}
                        {isThumbnail && showThumbnails && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 flex items-center justify-between">
                            <span className="text-[10px] text-white font-medium truncate max-w-[70px]">{getSlotName(slot)}</span>
                            <MediaIndicator slot={slot} small />
                          </div>
                        )}

                        {/* Grid labels */}
                        {isGrid && (
                          <>
                            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1">
                              <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
                                {getSlotLabel(slot)} <MediaIndicator slot={slot} small />
                              </span>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                              <div className="bg-black/50 backdrop-blur-sm rounded-full p-2">
                                <Maximize className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  });
                })()}

                {/* Focus controls — below badges row to avoid overlap */}
                {focusedSlot && (
                  <>
                    <button onClick={() => setFocusedSlot(null)} className="absolute top-14 right-4 z-40 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center" title="Réduire">
                      <Minimize className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={() => setShowThumbnails(p => !p)} className="absolute top-14 right-14 z-40 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center">
                      {showThumbnails ? <EyeOff className="w-4 h-4 text-white" /> : <Eye className="w-4 h-4 text-white" />}
                    </button>
                  </>
                )}

                {/* Overlays - single top bar with all controls */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
                  <div className="flex items-center gap-2 pointer-events-auto">
                    {isLive && <Badge className="bg-destructive text-destructive-foreground animate-pulse">⚔️ DUEL</Badge>}
                    <Badge variant="outline" className="bg-background/50 text-foreground border-border/30"><Users className="w-3 h-3 mr-1" /> {viewersCount}</Badge>
                    {/* Focused slot info in top bar on desktop */}
                    {focusedSlot && (
                      <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <span className="text-foreground text-xs font-semibold truncate max-w-[150px]">{getSlotName(focusedSlot)}</span>
                        <MediaIndicator slot={focusedSlot} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pointer-events-auto">
                    <button onClick={sendLike} className="bg-background/50 backdrop-blur-sm text-foreground px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-background/70 transition-colors">
                      <Heart className="w-5 h-5 fill-destructive text-destructive" /> {likes}
                    </button>
                    <ShareButton contentType="duel" contentId={id!} title={`Duel: ${profiles.artist1?.full_name || ''} vs ${profiles.artist2?.full_name || ''}`} variant="overlay" />
                    <FullscreenButton targetRef={videoContainerRef} />
                  </div>
                </div>
                <FloatingHearts hearts={hearts} />
                <FloatingEmojis emojis={floatingEmojis} />
              </div>

              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <Avatar className="w-10 h-10 border-2 border-background cursor-pointer" onClick={() => duel.artist1_id && navigate(`/artist/${duel.artist1_id}`)}>
                        <AvatarImage src={profiles.artist1?.avatar_url || ""} />
                        <AvatarFallback>{profiles.artist1?.full_name?.charAt(0) || "A1"}</AvatarFallback>
                      </Avatar>
                      <Avatar className="w-10 h-10 border-2 border-background cursor-pointer" onClick={() => duel.artist2_id && navigate(`/artist/${duel.artist2_id}`)}>
                        <AvatarImage src={profiles.artist2?.avatar_url || ""} />
                        <AvatarFallback>{profiles.artist2?.full_name?.charAt(0) || "A2"}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => duel.artist1_id && navigate(`/artist/${duel.artist1_id}`)} className="font-bold text-foreground hover:text-primary transition-colors">
                          {profiles.artist1?.full_name || "Artiste 1"}
                        </button>
                        <span className="text-muted-foreground">vs</span>
                        <button onClick={() => duel.artist2_id && navigate(`/artist/${duel.artist2_id}`)} className="font-bold text-foreground hover:text-primary transition-colors">
                          {profiles.artist2?.full_name || "Artiste 2"}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {currentUserId && duel.artist1_id && currentUserId !== duel.artist1_id && (
                          <FollowArtistButton artistId={duel.artist1_id} currentUserId={currentUserId} size="sm" />
                        )}
                        {currentUserId && duel.artist2_id && currentUserId !== duel.artist2_id && (
                          <FollowArtistButton artistId={duel.artist2_id} currentUserId={currentUserId} size="sm" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isLive ? t("duelInProgress") : duel.status === "upcoming" ? t("duelUpcoming") : t("duelEnded")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={sendLike} variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                      <Heart className="w-4 h-4 mr-2" /> {t("likeBtn")}
                    </Button>
                    {!isParticipant && (
                      <Button onClick={() => navigate("/duels")} variant="ghost" className="text-muted-foreground">
                        <ArrowLeft className="w-4 h-4 mr-2" /> {t("quitBtn")}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3"><EmojiReactionBar onReact={addEmoji} /></div>
              </CardContent>
            </Card>

            {/* Vote Stats */}
            <div className="bg-card rounded-lg p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{t("liveVotesTitle")}</h3>
                {isManager && hostStream && <ConcertRecordingControls stream={hostStream} concertId={id!} userId={currentUserId!} isArtistConcert={false} isDuel={true} duelTitle={`Duel: ${profiles.artist1?.full_name || 'A1'} vs ${profiles.artist2?.full_name || 'A2'}`} onRecordingSaved={() => {}} />}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center"><p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">{votes.artist1}</p><p className="text-muted-foreground">{profiles.artist1?.full_name || "Artiste 1"}</p></div>
                <div className="text-center"><p className="text-3xl font-bold bg-gradient-electric bg-clip-text text-transparent">{votes.artist2}</p><p className="text-muted-foreground">{profiles.artist2?.full_name || "Artiste 2"}</p></div>
              </div>
              <div className="mt-4 h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-primary transition-all" style={{ width: `${votes.artist1 + votes.artist2 > 0 ? (votes.artist1 / (votes.artist1 + votes.artist2)) * 100 : 50}%` }} />
              </div>
            </div>

            {/* Manager Controls */}
            {isManager && isLive && (
              <Card className="p-4 border-accent/30">
                <h4 className="font-semibold mb-3 flex items-center gap-2"><Timer className="w-4 h-4 text-accent" />{t("managerControlsTitle")}</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant={mutedArtists[duel.artist1_id] ? "destructive" : "outline"} onClick={() => toggleMuteArtist(duel.artist1_id)}><MicOff className="w-3 h-3 mr-1" />{mutedArtists[duel.artist1_id] ? "Unmute" : "Mute"} {profiles.artist1?.full_name?.split(" ")[0] || "A1"}</Button>
                    <Button size="sm" variant={mutedArtists[duel.artist2_id] ? "destructive" : "outline"} onClick={() => toggleMuteArtist(duel.artist2_id)}><MicOff className="w-3 h-3 mr-1" />{mutedArtists[duel.artist2_id] ? "Unmute" : "Mute"} {profiles.artist2?.full_name?.split(" ")[0] || "A2"}</Button>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("speakingTimeLabel")} : {speakingTime >= 60 ? `${Math.floor(speakingTime / 60)}min ${speakingTime % 60 > 0 ? `${speakingTime % 60}s` : ''}` : `${speakingTime}s`}</p>
                    <Slider value={[speakingTime]} onValueChange={(v) => setSpeakingTime(v[0])} min={15} max={3600} step={15} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={activeTimerTargetId === duel.artist1_id && managerTimerRemaining > 0}
                      onClick={() => {
                        broadcastTimerToAll('start', duel.artist1_id, speakingTime);
                        setActiveTimerTargetId(duel.artist1_id);
                      }}
                    >
                      <Timer className="w-3 h-3 mr-1" />
                      {t("turnOfLabel")} {profiles.artist1?.full_name?.split(" ")[0] || "A1"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={activeTimerTargetId === duel.artist2_id && managerTimerRemaining > 0}
                      onClick={() => {
                        broadcastTimerToAll('start', duel.artist2_id, speakingTime);
                        setActiveTimerTargetId(duel.artist2_id);
                      }}
                    >
                      <Timer className="w-3 h-3 mr-1" />
                      {t("turnOfLabel")} {profiles.artist2?.full_name?.split(" ")[0] || "A2"}
                    </Button>
                  </div>
                  {activeTimerTargetId && managerTimerRemaining > 0 && (
                    <div className="text-center p-2 bg-accent/20 rounded-lg">
                      <p className="text-sm font-bold">
                        {t("turnOfLabel")} {activeTimerTargetId === duel.artist1_id ? profiles.artist1?.full_name : profiles.artist2?.full_name}
                      </p>
                      <p className={`text-2xl font-mono font-bold tabular-nums my-1 ${managerTimerRemaining <= 10 ? "text-destructive" : "text-accent"}`}>
                        {Math.floor(managerTimerRemaining / 60)}:{String(managerTimerRemaining % 60).padStart(2, "0")}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          broadcastTimerToAll('stop', activeTimerTargetId);
                        }}
                        className="mt-1"
                      >
                        {t("stopTimerBtn")}
                      </Button>
                    </div>
                  )}
                   <Button size="sm" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold" onClick={announceWinner} disabled={!!winnerAnnouncement}>
                     <Trophy className="w-3 h-3 mr-1" />{t("announceWinner")}
                   </Button>
                   <Button size="sm" variant="destructive" className="w-full" onClick={endDuel}>
                     <UserX className="w-3 h-3 mr-1" />{t("endDuelBtn")}
                   </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Side Panels */}
          <div className="space-y-6">
            <VotePanel duelId={id!} artist1Id={duel.artist1_id} artist2Id={duel.artist2_id} />
            <GiftPanel duelId={id!} roomId={roomId} artist1Id={duel.artist1_id} artist2Id={duel.artist2_id} managerId={duel.manager_id} onGiftAnimationBroadcast={sendGiftAnimationBroadcast} artist1Name={profiles.artist1?.full_name || "Artiste 1"} artist2Name={profiles.artist2?.full_name || "Artiste 2"} managerName={profiles.manager?.full_name || "Manager"} />
            <QuickTip duelId={id!} recipientIds={[{ id: duel.artist1_id, name: profiles.artist1?.full_name || "Artiste 1" }, { id: duel.artist2_id, name: profiles.artist2?.full_name || "Artiste 2" }]} />
            <GiftLeaderboard duelId={id!} />
            <div className="h-[400px]">
              <ThreadedChat chatType="duel" entityId={id!} participants={[
                ...(profiles.artist1 ? [{ id: duel.artist1_id, name: profiles.artist1.full_name || "Artiste 1" }] : []),
                ...(profiles.artist2 ? [{ id: duel.artist2_id, name: profiles.artist2.full_name || "Artiste 2" }] : []),
                ...(profiles.manager ? [{ id: duel.manager_id, name: `${profiles.manager.full_name || "Manager"} (Manager)` }] : []),
              ]} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
      {/* Gift animations — visible to ALL viewers */}
      {activeGiftAnim && (
        activeGiftAnim.price < 10 ? (
          <StandardGiftNotification key={activeGiftAnim.eventId} giftName={activeGiftAnim.giftName} giftImage={activeGiftAnim.giftImage} senderName={activeGiftAnim.senderName} recipientName={activeGiftAnim.recipientName} onComplete={() => setActiveGiftAnim(null)} />
        ) : (
          <GiftAnimationWithSound key={activeGiftAnim.eventId} giftName={activeGiftAnim.giftName} giftImage={activeGiftAnim.giftImage} senderName={activeGiftAnim.senderName} recipientName={activeGiftAnim.recipientName} enableSound={activeGiftAnim.price >= 50} onComplete={() => setActiveGiftAnim(null)} />
        )
      )}
      {/* Winner announcement */}
      {winnerAnnouncement && (
        <WinnerAnnouncement
          winnerName={winnerAnnouncement.name}
          winnerAvatar={winnerAnnouncement.avatar}
          winnerVotes={winnerAnnouncement.votes}
          onStop={handleStopWinnerAnnouncement}
          canDismiss={isManager}
        />
      )}
    </div>
  );
};

export default DuelLive;
