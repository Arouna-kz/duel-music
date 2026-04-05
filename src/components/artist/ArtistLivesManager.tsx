import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Radio, Plus, Eye, Users, Calendar, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ArtistLivesManagerProps {
  userId: string;
  onNavigate: (path: string) => void;
}

export const ArtistLivesManager = ({ userId, onNavigate }: ArtistLivesManagerProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [liveTitle, setLiveTitle] = useState("");
  const [startingLive, setStartingLive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: lives, isLoading } = useQuery({
    queryKey: ["artist-my-lives", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_lives")
        .select("*")
        .eq("artist_id", userId)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const activeLive = lives?.find(l => l.status === "live");
  const pastLives = lives?.filter(l => l.status === "ended") || [];

  const startLive = async () => {
    if (!userId) return;
    setStartingLive(true);
    try {
      const { data, error } = await supabase
        .from("artist_lives")
        .insert({
          artist_id: userId,
          title: liveTitle || t("artLivesDefaultTitle"),
          status: "live",
          room_id: `live-${userId}-${Date.now()}`,
        })
        .select()
        .single();

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["artist-my-lives"] });
      setDialogOpen(false);
      onNavigate(`/live/${data.id}`);
    } catch (err: any) {
      toast({ title: t("commonError"), description: err.message, variant: "destructive" });
    } finally {
      setStartingLive(false);
    }
  };

  const endLive = async (liveId: string) => {
    try {
      const { error } = await supabase
        .from("artist_lives")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", liveId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["artist-my-lives"] });
      toast({ title: t("artLivesEnded"), description: t("artLivesEndedDesc") });
    } catch (err: any) {
      toast({ title: t("commonError"), description: err.message, variant: "destructive" });
    }
  };

  const formatDuration = (startedAt: string, endedAt?: string | null) => {
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h${minutes % 60}min`;
    return `${minutes}min`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("artLivesTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("artLivesSubtitle")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white gap-2">
              <Plus className="w-4 h-4" />{t("artLivesStart")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("artLivesStartTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder={t("artLivesTitlePlaceholder")} value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} />
              <p className="text-sm text-muted-foreground">{t("artLivesStartDesc")}</p>
              <Button onClick={startLive} disabled={startingLive} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                {startingLive ? t("artLivesStarting") : t("artLivesStartBtn")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {activeLive && (
        <Card className="border-2 border-red-500/50 bg-red-500/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <div>
                  <p className="font-bold text-foreground">{activeLive.title || t("artLivesActive")}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {activeLive.viewer_count || 0} {t("artLivesViewers")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDuration(activeLive.started_at)}
                    </span>
                  </div>
                </div>
                <Badge className="bg-red-500 text-white animate-pulse">🔴 {t("artConcertLive")}</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onNavigate(`/live/${activeLive.id}`)} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <Eye className="w-4 h-4 mr-1" /> {t("artLivesJoin")}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => endLive(activeLive.id)}>
                  {t("artLivesEndBtn")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!activeLive && (
        <Card className="border-dashed border-2 border-border bg-accent/20">
          <CardContent className="p-8 text-center">
            <Radio className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium text-muted-foreground">{t("artLivesNoActive")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("artLivesNoActiveDesc")}</p>
          </CardContent>
        </Card>
      )}

      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {t("artLivesPast")} ({pastLives.length})
        </h4>

        {isLoading ? (
          <div className="text-center py-6 text-muted-foreground">{t("commonLoading")}</div>
        ) : pastLives.length > 0 ? (
          <div className="space-y-3">
            {pastLives.map(live => (
              <Card key={live.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <Radio className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{live.title || "Live"}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(live.started_at).toLocaleDateString("fr-FR", {
                              day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                          {live.ended_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(live.started_at, live.ended_at)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {live.viewer_count || 0} {t("artLivesMaxViews")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">{t("artLivesEndedBadge")}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              {t("artLivesNoPast")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};