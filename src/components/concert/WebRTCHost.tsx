import { useEffect, useRef, useState, useCallback } from "react";
import { useWebRTCSignaling } from "@/hooks/useWebRTCSignaling";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, Mic, MicOff, Radio, Users, Pause, Play, Wifi, WifiOff, SwitchCamera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export interface WebRTCHostControls {
  isStreaming: boolean;
  isPaused: boolean;
  isCameraOn: boolean;
  isMicOn: boolean;
  startStreaming: () => void;
  stopStreaming: () => void;
  pauseStreaming: () => void;
  resumeStreaming: () => void;
  handleToggleCamera: () => void;
  handleToggleMic: () => void;
  handleSwitchCamera: () => void;
}

interface WebRTCHostProps {
  roomId: string;
  hostId: string;
  onStreamStart?: () => void;
  onStreamStop?: () => void;
  onStreamPause?: () => void;
  onStreamResume?: () => void;
  onStreamReady?: (stream: MediaStream) => void;
  /** Hide bottom controls on mobile (shown in MobileArtistControls instead) */
  hideMobileControls?: boolean;
  /** Hide LIVE badge, viewer count, Connecté when in thumbnail */
  hideOverlays?: boolean;
  /** Callback to expose host controls to parent */
  onControlsReady?: (controls: WebRTCHostControls) => void;
  /** Label for the context: "live" or "concert" */
  streamType?: "live" | "concert";
}

export const WebRTCHost = ({
  roomId,
  hostId,
  onStreamStart,
  onStreamStop,
  onStreamPause,
  onStreamResume,
  onStreamReady,
  hideMobileControls = false,
  hideOverlays = false,
  onControlsReady,
  streamType = "concert",
}: WebRTCHostProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const notifiedPeersRef = useRef<Set<string>>(new Set());

  const {
    localStream,
    isConnected,
    connectionState,
    peerCount,
    startLocalStream,
    joinRoom,
    leaveRoom,
    toggleVideo,
    toggleAudio,
    switchCamera,
  } = useWebRTCSignaling({
    roomId,
    userId: hostId,
    isHost: true,
    onPeerJoin: (peerId) => {
      // Only notify once per peer
      if (!notifiedPeersRef.current.has(peerId)) {
        notifiedPeersRef.current.add(peerId);
        console.log("New viewer joined:", peerId);
        toast({
          title: "Nouveau spectateur",
          description: "Un spectateur a rejoint le concert",
        });
      }
    },
    onPeerLeave: (peerId) => {
      notifiedPeersRef.current.delete(peerId);
      console.log("Viewer left:", peerId);
    },
    onError: (error) => {
      console.error("WebRTC error:", error);
      toast({
        title: "Erreur de connexion",
        description: error,
        variant: "destructive",
      });
    },
  });

  // Update video element when local stream changes
  useEffect(() => {
    if (localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Notify parent when stream is ready
  useEffect(() => {
    if (localStream) {
      onStreamReady?.(localStream);
    }
  }, [localStream, onStreamReady]);

  const startStreaming = useCallback(async () => {
    const stream = await startLocalStream(true, true);
    if (stream) {
      await joinRoom();
      setIsStreaming(true);
      setIsCameraOn(true);
      setIsMicOn(true);
      onStreamStart?.();
      toast({
        title: streamType === "live" ? "Live démarré" : "Concert démarré",
        description: "Vous êtes maintenant en direct!",
      });
    }
  }, [startLocalStream, joinRoom, onStreamStart, toast, streamType]);

  const stopStreaming = useCallback(async () => {
    await leaveRoom();
    setIsStreaming(false);
    setIsPaused(false);
    notifiedPeersRef.current.clear();
    onStreamStop?.();
    toast({
      title: streamType === "live" ? "Live terminé" : "Concert terminé",
      description: "Le direct est maintenant arrêté",
    });
  }, [leaveRoom, onStreamStop, toast, streamType]);

  const pauseStreaming = useCallback(() => {
    toggleVideo(false);
    toggleAudio(false);
    setIsPaused(true);
    setIsCameraOn(false);
    setIsMicOn(false);
    onStreamPause?.();
    toast({
      title: streamType === "live" ? t("livePaused") : t("concertPaused"),
      description: t("viewersSeeingPause"),
    });
  }, [toggleVideo, toggleAudio, onStreamPause, toast, streamType]);

  const resumeStreaming = useCallback(() => {
    toggleVideo(true);
    toggleAudio(true);
    setIsPaused(false);
    setIsCameraOn(true);
    setIsMicOn(true);
    onStreamResume?.();
    toast({
      title: streamType === "live" ? "Live repris" : "Concert repris",
      description: "Le direct a repris!",
    });
  }, [toggleVideo, toggleAudio, onStreamResume, toast, streamType]);

  const handleToggleCamera = useCallback(() => {
    const newState = !isCameraOn;
    toggleVideo(newState);
    setIsCameraOn(newState);
  }, [isCameraOn, toggleVideo]);

  const handleToggleMic = useCallback(() => {
    const newState = !isMicOn;
    toggleAudio(newState);
    setIsMicOn(newState);
  }, [isMicOn, toggleAudio]);

  const handleSwitchCamera = useCallback(async () => {
    const newStream = await switchCamera(facingMode);
    if (newStream) {
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      onStreamReady?.(newStream);
    }
  }, [facingMode, switchCamera, onStreamReady]);

  // Expose controls to parent for mobile controls
  useEffect(() => {
    onControlsReady?.({
      isStreaming,
      isPaused,
      isCameraOn,
      isMicOn,
      startStreaming,
      stopStreaming,
      pauseStreaming,
      resumeStreaming,
      handleToggleCamera,
      handleToggleMic,
      handleSwitchCamera,
    });
  }, [isStreaming, isPaused, isCameraOn, isMicOn, onControlsReady, startStreaming, stopStreaming, pauseStreaming, resumeStreaming, handleToggleCamera, handleToggleMic, handleSwitchCamera]);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <Pause className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <p className="text-white text-xl font-bold">{streamType === "live" ? t("livePaused") : t("concertPaused")}</p>
            <p className="text-white/70">{t("viewersSeeingPause")}</p>
          </div>
        </div>
      )}

      {!isStreaming && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/30 to-accent/30 z-40">
          <div className="text-center px-4">
            <Radio className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <p className="text-white text-xl font-bold">{t("readyToStart")}</p>
            <p className="text-white/70 mb-4">{t("clickToStartStream")}</p>
            <Button onClick={startStreaming} size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg px-8 py-3">
              <Video className="w-5 h-5 mr-2" />
              {streamType === "live" ? t("startTheLive") : t("startTheConcert")}
            </Button>
          </div>
        </div>
      )}

      {/* All overlay badges (LIVE, viewers, connection) are handled by LiveStream.tsx / MobileStreamOverlay — removed here to avoid duplication */}

      {isPaused && !hideOverlays && (
        <div className="absolute top-4 left-4">
          <Badge className="bg-yellow-500 text-black flex items-center gap-1">
            <Pause className="w-3 h-3" />
            {t("pausedLabel")}
          </Badge>
        </div>
      )}

      {/* Bottom controls - hidden on mobile when hideMobileControls is true (except start button) */}
      <div className={`absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 flex-wrap z-40 ${(hideMobileControls && isStreaming) || !isStreaming ? 'hidden' : ''}`}>
        {!isStreaming ? null : (
          <>
            {isPaused ? (
              <Button onClick={resumeStreaming} className="bg-green-500 hover:bg-green-600">
                <Play className="w-4 h-4 mr-2" />
                Reprendre
              </Button>
            ) : (
              <Button 
                onClick={pauseStreaming} 
                variant="outline"
                className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            )}
            
            <Button onClick={stopStreaming} variant="destructive">
              <VideoOff className="w-4 h-4 mr-2" />
              Arrêter
            </Button>
            
            {!isPaused && (
              <>
                <Button 
                  onClick={handleSwitchCamera}
                  variant="secondary"
                  size="icon"
                  title={t("switchCamera")}
                >
                  <SwitchCamera className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={handleToggleCamera} 
                  variant={isCameraOn ? "secondary" : "outline"}
                  size="icon"
                >
                  {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </Button>
                <Button 
                  onClick={handleToggleMic} 
                  variant={isMicOn ? "secondary" : "outline"}
                  size="icon"
                >
                  {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </Button>
              </>
            )}
          </>
        )}
      </div>

    </div>
  );
};
