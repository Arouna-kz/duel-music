import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, Square, Loader2, Pause, Play, Clock } from "lucide-react";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface ConcertRecordingControlsProps {
  stream: MediaStream | null;
  concertId: string;
  userId: string;
  isArtistConcert: boolean;
  onRecordingSaved?: (url: string) => void;
  /** If set, treat this as a duel recording instead of a concert */
  isDuel?: boolean;
  duelTitle?: string;
  duelArtist1Name?: string;
  duelArtist2Name?: string;
}

export const ConcertRecordingControls = ({
  stream,
  concertId,
  userId,
  isArtistConcert,
  onRecordingSaved,
  isDuel = false,
  duelTitle,
  duelArtist1Name,
  duelArtist2Name,
}: ConcertRecordingControlsProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);

  const { 
    isRecording, 
    isPaused,
    isUploading, 
    formattedDuration,
    startRecording, 
    pauseRecording,
    resumeRecording,
    stopAndUpload 
  } = useMediaRecorder({
    stream,
    concertId,
    userId,
    onRecordingComplete: async (url) => {
      if (url) {
        await saveReplayUrl(url);
        onRecordingSaved?.(url);
      }
    },
  });

  const saveReplayUrl = async (url: string) => {
    setIsSaving(true);
    try {
      if (isDuel) {
        // Save as duel replay
        const title = duelTitle || "Duel";
        await supabase.from("replay_videos").insert({
          duel_id: concertId,
          title,
          description: `Replay du ${title}`,
          video_url: url,
          thumbnail_url: "",
          duration: "N/A",
          recorded_date: new Date().toISOString(),
          is_premium: false,
          is_public: false,
          created_by: userId,
          source_type: "duel",
          replay_price: 0,
        } as any);
      } else {
        // Save as concert replay
        const table = isArtistConcert ? "artist_concerts" : "concerts";
        
        const { error } = await supabase
          .from(table)
          .update({
            recording_url: url,
            is_replay_available: true,
          })
          .eq("id", concertId);

        if (error) throw error;

        const { data: concertData } = await supabase
          .from(table)
          .select("*")
          .eq("id", concertId)
          .single();

        if (concertData) {
          const cTitle = concertData.title || "Concert";
          const artistName = isArtistConcert ? "" : ((concertData as any).artist_name || "");
          const thumbnailUrl = isArtistConcert ? (concertData as any).cover_image_url : (concertData as any).image_url;
          const artistIdVal = isArtistConcert ? (concertData as any).artist_id : null;
          await supabase.from("replay_videos").insert({
            concert_id: concertId,
            title: `Concert: ${cTitle}`,
            description: `Replay du concert "${cTitle}" ${artistName ? `par ${artistName}` : ""}`.trim(),
            video_url: url,
            thumbnail_url: thumbnailUrl,
            duration: concertData.started_at
              ? `${Math.round((Date.now() - new Date(concertData.started_at).getTime()) / 60000)} min`
              : "N/A",
            recorded_date: new Date().toISOString(),
            is_premium: false,
            is_public: false,
            created_by: userId,
            source_type: "concert",
            replay_price: 0,
            artist_id: artistIdVal,
          } as any);
        }
      }

      toast({
        title: "Enregistrement sauvegardé",
        description: isDuel ? "Le replay du duel est maintenant disponible" : "Le replay du concert est maintenant disponible",
      });
    } catch (error: any) {
      console.error("Error saving replay URL:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'enregistrement",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartRecording = () => {
    const started = startRecording();
    if (started) {
      toast({
        title: "Enregistrement démarré",
        description: "Le concert est en cours d'enregistrement pour le replay",
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de démarrer l'enregistrement. Vérifiez que le stream est actif.",
        variant: "destructive",
      });
    }
  };

  const handlePauseRecording = () => {
    const paused = pauseRecording();
    if (paused) {
      toast({
        title: t("recordingPaused"),
        description: t("recordingPausedDesc"),
      });
    }
  };

  const handleResumeRecording = () => {
    const resumed = resumeRecording();
    if (resumed) {
      toast({
        title: "Enregistrement repris",
        description: "L'enregistrement a repris.",
      });
    }
  };

  const handleStopRecording = async () => {
    toast({
      title: "Finalisation...",
      description: "Enregistrement et téléversement du replay en cours",
    });

    const url = await stopAndUpload();
    if (!url) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'enregistrement",
        variant: "destructive",
      });
    }
  };

  if (!stream) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!isRecording ? (
        <Button
          onClick={handleStartRecording}
          variant="outline"
          size="sm"
          className="border-red-500 text-red-500 hover:bg-red-500/10"
          disabled={isUploading || isSaving}
        >
          <Video className="w-4 h-4 mr-2" />
          Enregistrer
        </Button>
      ) : (
        <>
          {/* Pause/Resume button */}
          {isPaused ? (
            <Button
              onClick={handleResumeRecording}
              variant="outline"
              size="sm"
              className="border-green-500 text-green-500 hover:bg-green-500/10"
              disabled={isUploading || isSaving}
            >
              <Play className="w-4 h-4 mr-2" />
              Reprendre
            </Button>
          ) : (
            <Button
              onClick={handlePauseRecording}
              variant="outline"
              size="sm"
              className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
              disabled={isUploading || isSaving}
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}

          {/* Stop button */}
          <Button
            onClick={handleStopRecording}
            variant="destructive"
            size="sm"
            disabled={isUploading || isSaving}
          >
            {isUploading || isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Square className="w-4 h-4 mr-2" />
                Arrêter
              </>
            )}
          </Button>
        </>
      )}

      {isRecording && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <span className={`w-2 h-2 bg-red-500 rounded-full ${isPaused ? '' : 'animate-pulse'}`} />
          <Clock className="w-3 h-3" />
          <span>{formattedDuration}</span>
          <span className="text-muted-foreground">
            {isPaused ? t("pausedShort") : t("recLabel")}
          </span>
        </div>
      )}
    </div>
  );
};
