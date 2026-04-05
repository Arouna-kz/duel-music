import { useEffect, useRef, useState } from "react";
import { useWebRTCSignaling } from "@/hooks/useWebRTCSignaling";
import { Radio, Users, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WebRTCViewerProps {
  roomId: string;
  viewerId: string;
  concertTitle: string;
  artistName: string;
  onError?: (error: string) => void;
}

export const WebRTCViewer = ({
  roomId,
  viewerId,
  concertTitle,
  artistName,
  onError,
}: WebRTCViewerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const hasJoinedRef = useRef(false);

  const {
    remoteStreams,
    isConnected,
    connectionState,
    peerCount,
    joinRoom,
    leaveRoom,
  } = useWebRTCSignaling({
    roomId,
    userId: viewerId,
    isHost: false,
    onRemoteStream: (stream, peerId) => {
      console.log("Received remote stream from host:", peerId);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasRemoteStream(true);
        setIsConnecting(false);
      }
    },
    onPeerLeave: (peerId) => {
      console.log("Host disconnected:", peerId);
      setHasRemoteStream(false);
    },
    onError: (error) => {
      console.error("WebRTC error:", error);
      onError?.(error);
      setIsConnecting(false);
    },
  });

  // Auto-join room on mount - only once
  useEffect(() => {
    if (!hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinRoom();
    }
    
    return () => {
      hasJoinedRef.current = false;
      leaveRoom();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update video element when remote streams change
  useEffect(() => {
    const streams = Array.from(remoteStreams.values());
    if (streams.length > 0 && videoRef.current) {
      videoRef.current.srcObject = streams[0];
      setHasRemoteStream(true);
      setIsConnecting(false);
    }
  }, [remoteStreams]);

  const getConnectionStatus = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connecté';
      case 'connecting':
        return 'Connexion...';
      case 'checking':
        return 'Vérification...';
      case 'disconnected':
        return 'Déconnecté';
      case 'failed':
        return 'Échec';
      default:
        return 'En attente';
    }
  };

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {!hasRemoteStream && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
          <div className="text-center p-8">
            {isConnecting ? (
              <>
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white text-xl font-bold">{concertTitle}</p>
                <p className="text-white/70 mb-4">{artistName}</p>
                <div className="flex items-center justify-center gap-2 text-white/50">
                  <Radio className="w-5 h-5 animate-pulse" />
                  <p>Connexion au direct...</p>
                </div>
                <p className="text-white/40 text-sm mt-2">{getConnectionStatus()}</p>
              </>
            ) : (
              <>
                <WifiOff className="w-12 h-12 text-white/50 mx-auto mb-4" />
                <p className="text-white text-xl font-bold">En attente du direct</p>
                <p className="text-white/70">L'artiste n'a pas encore commencé le stream</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Connection status badges removed to avoid cluttering small views */}
    </div>
  );
};
