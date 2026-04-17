import { useEffect, useRef, useState, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Track,
  LocalTrack,
  RemoteParticipant,
  ConnectionState,
  VideoPresets,
} from "livekit-client";
import { supabase } from "@/integrations/supabase/client";

interface UseLiveKitConfig {
  roomName: string;
  userId: string;
  isHost: boolean;
  participantName?: string;
  /** Allow this participant to publish (for guests in lives) */
  canPublish?: boolean;
  onRemoteStream?: (stream: MediaStream, peerId: string) => void;
  onPeerJoin?: (peerId: string) => void;
  onPeerLeave?: (peerId: string) => void;
  onError?: (error: string) => void;
}

interface LiveKitState {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isConnected: boolean;
  connectionState: string;
  peerCount: number;
  room: Room | null;
}

export const useLiveKit = ({
  roomName,
  userId,
  isHost,
  participantName,
  canPublish,
  onRemoteStream,
  onPeerJoin,
  onPeerLeave,
  onError,
}: UseLiveKitConfig) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>("new");
  const [peerCount, setPeerCount] = useState(0);

  const roomRef = useRef<Room | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const isJoinedRef = useRef(false);

  // Stable callback refs
  const onRemoteStreamRef = useRef(onRemoteStream);
  const onPeerJoinRef = useRef(onPeerJoin);
  const onPeerLeaveRef = useRef(onPeerLeave);
  const onErrorRef = useRef(onError);

  useEffect(() => { onRemoteStreamRef.current = onRemoteStream; }, [onRemoteStream]);
  useEffect(() => { onPeerJoinRef.current = onPeerJoin; }, [onPeerJoin]);
  useEffect(() => { onPeerLeaveRef.current = onPeerLeave; }, [onPeerLeave]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Get LiveKit token from edge function
  const getToken = useCallback(async (): Promise<{ token: string; url: string } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("livekit-token", {
        body: {
          roomName,
          isHost,
          participantName: participantName || userId,
          canPublish: canPublish ?? isHost,
        },
      });

      if (error) {
        console.error("Error getting LiveKit token:", error);
        onErrorRef.current?.("Impossible d'obtenir le token de connexion");
        return null;
      }

      return data;
    } catch (err) {
      console.error("Failed to fetch LiveKit token:", err);
      onErrorRef.current?.("Erreur de connexion au serveur");
      return null;
    }
  }, [roomName, isHost, participantName, userId, canPublish]);

  // Build a MediaStream from a participant's tracks
  const buildStreamForParticipant = useCallback((participant: RemoteParticipant): MediaStream => {
    const stream = new MediaStream();
    participant.trackPublications.forEach((pub) => {
      if (pub.track && pub.isSubscribed) {
        stream.addTrack(pub.track.mediaStreamTrack);
      }
    });
    return stream;
  }, []);

  // Update remote streams state
  const updateRemoteStreams = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    const newStreams = new Map<string, MediaStream>();
    room.remoteParticipants.forEach((participant) => {
      const stream = buildStreamForParticipant(participant);
      if (stream.getTracks().length > 0) {
        newStreams.set(participant.identity, stream);
      }
    });

    setRemoteStreams(newStreams);
    setPeerCount(room.remoteParticipants.size);
  }, [buildStreamForParticipant]);

  // Start local stream (camera + mic)
  // Build a MediaStream from the local participant's published tracks
  const buildLocalStream = useCallback((): MediaStream | null => {
    const room = roomRef.current;
    if (!room) return null;
    const stream = new MediaStream();
    room.localParticipant.trackPublications.forEach((pub) => {
      if (pub.track && pub.track instanceof LocalTrack) {
        stream.addTrack(pub.track.mediaStreamTrack);
      }
    });
    if (stream.getTracks().length === 0) return null;
    return stream;
  }, []);

  const startLocalStream = useCallback(async (video = true, audio = true): Promise<MediaStream | null> => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) {
      console.error("[LiveKit] Room not connected, cannot start local stream");
      onErrorRef.current?.("Salle non connectée");
      return null;
    }

    try {
      // Use LiveKit's native methods to enable camera/mic – avoids "Device in use" errors
      if (video) {
        await room.localParticipant.setCameraEnabled(true);
      }
      if (audio) {
        await room.localParticipant.setMicrophoneEnabled(true);
      }

      // Build a MediaStream from the now-published local tracks
      const stream = buildLocalStream();
      if (stream) {
        setLocalStream(stream);
        localStreamRef.current = stream;
      }

      return stream;
    } catch (err: any) {
      console.error("Error accessing media devices:", err);
      onErrorRef.current?.(err.message || "Impossible d'accéder à la caméra/microphone");
      return null;
    }
  }, [buildLocalStream]);

  // Join the LiveKit room
  const joinRoom = useCallback(async () => {
    if (isJoinedRef.current) return;

    try {
      setConnectionState("connecting");

      const tokenData = await getToken();
      if (!tokenData) {
        setConnectionState("failed");
        return;
      }

      if (!tokenData.url || !tokenData.token) {
        console.error("[LiveKit] Invalid token data received");
        onErrorRef.current?.("Configuration de streaming manquante");
        setConnectionState("failed");
        return;
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
          facingMode: "user",
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      roomRef.current = room;

      // Connection state changes
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log("[LiveKit] Connection state:", state);
        setConnectionState(state);
        setIsConnected(state === ConnectionState.Connected);
      });

      // Remote participant joins
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("[LiveKit] Participant joined:", participant.identity);
        setPeerCount(room.remoteParticipants.size);
        onPeerJoinRef.current?.(participant.identity);
      });

      // Remote participant leaves
      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("[LiveKit] Participant left:", participant.identity);
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.delete(participant.identity);
          return updated;
        });
        setPeerCount(room.remoteParticipants.size);
        onPeerLeaveRef.current?.(participant.identity);
      });

      // Track subscribed (remote track available)
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log("[LiveKit] Track subscribed:", track.kind, "from", participant.identity);
        const stream = buildStreamForParticipant(participant);
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.set(participant.identity, stream);
          return updated;
        });
        onRemoteStreamRef.current?.(stream, participant.identity);
      });

      // Track unsubscribed
      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log("[LiveKit] Track unsubscribed:", track.kind, "from", participant.identity);
        updateRemoteStreams();
      });

      // Track muted/unmuted
      room.on(RoomEvent.TrackMuted, () => updateRemoteStreams());
      room.on(RoomEvent.TrackUnmuted, () => updateRemoteStreams());

      // Reconnection
      room.on(RoomEvent.Reconnecting, () => {
        console.log("[LiveKit] Reconnecting...");
        setConnectionState("reconnecting");
      });

      room.on(RoomEvent.Reconnected, () => {
        console.log("[LiveKit] Reconnected!");
        setConnectionState("connected");
        updateRemoteStreams();
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log("[LiveKit] Disconnected");
        setIsConnected(false);
        setConnectionState("disconnected");
      });

      // Connect to room with timeout
      const connectPromise = room.connect(tokenData.url, tokenData.token);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Délai de connexion dépassé (15s)")), 15000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      
      isJoinedRef.current = true;
      setIsConnected(true);
      setConnectionState("connected");

      console.log("[LiveKit] Connected to room:", roomName);

      // Update initial peer count
      setPeerCount(room.remoteParticipants.size);

      // Build initial remote streams for already-connected participants
      updateRemoteStreams();

    } catch (err: any) {
      console.error("[LiveKit] Failed to join room:", err);
      setConnectionState("failed");
      
      // Clean up on failure
      if (roomRef.current) {
        try { roomRef.current.disconnect(); } catch {}
        roomRef.current = null;
      }
      isJoinedRef.current = false;
      
      const message = err.message || "Impossible de rejoindre la salle";
      onErrorRef.current?.(message);
    }
  }, [getToken, roomName, buildStreamForParticipant, updateRemoteStreams]);

  // Leave the room
  const leaveRoom = useCallback(async () => {
    const room = roomRef.current;
    if (room) {
      room.disconnect();
      roomRef.current = null;
    }

    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    isJoinedRef.current = false;
    setIsConnected(false);
    setRemoteStreams(new Map());
    setPeerCount(0);
    setConnectionState("disconnected");
  }, []);

  // Toggle video
  const toggleVideo = useCallback(async (enabled: boolean) => {
    const room = roomRef.current;
    if (!room) return;

    await room.localParticipant.setCameraEnabled(enabled);

    // Rebuild local stream so the local preview updates with the new track
    const stream = buildLocalStream();
    if (stream) {
      setLocalStream(stream);
      localStreamRef.current = stream;
    }
  }, [buildLocalStream]);

  // Toggle audio
  const toggleAudio = useCallback(async (enabled: boolean) => {
    const room = roomRef.current;
    if (!room) return;

    await room.localParticipant.setMicrophoneEnabled(enabled);

    // Rebuild local stream so audio track reference stays current
    const stream = buildLocalStream();
    if (stream) {
      setLocalStream(stream);
      localStreamRef.current = stream;
    }
  }, [buildLocalStream]);

  // Switch camera (front/back)
  const switchCamera = useCallback(async (currentFacingMode: "user" | "environment"): Promise<MediaStream | null> => {
    const room = roomRef.current;
    if (!room) return null;

    const newFacingMode = currentFacingMode === "user" ? "environment" : "user";

    try {
      // Disable current camera, then re-enable with new facing mode
      await room.localParticipant.setCameraEnabled(false);
      await room.localParticipant.setCameraEnabled(true, {
        facingMode: newFacingMode,
        resolution: VideoPresets.h720.resolution,
      });

      // Rebuild local stream
      const stream = buildLocalStream();
      if (stream) {
        setLocalStream(stream);
        localStreamRef.current = stream;
        return stream;
      }
    } catch (err) {
      console.error("[LiveKit] Switch camera failed:", err);
      await room.localParticipant.setCameraEnabled(true);
    }

    return null;
  }, [buildLocalStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      isJoinedRef.current = false;
    };
  }, []);

  return {
    localStream,
    remoteStreams,
    isConnected,
    connectionState,
    peerCount,
    room: roomRef.current,
    startLocalStream,
    joinRoom,
    leaveRoom,
    toggleVideo,
    toggleAudio,
    switchCamera,
  };
};
