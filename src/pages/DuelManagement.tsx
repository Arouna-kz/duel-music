import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Video, Upload, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const DuelManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [artists, setArtists] = useState<any[]>([]);
  const [filteredArtists, setFilteredArtists] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [endedDuels, setEndedDuels] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    artist1_id: "",
    artist2_id: "",
    scheduled_time: "",
    room_id: "",
    admin_role: "manager" as "manager" | "self",
  });

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = artists.filter(artist => 
        artist.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredArtists(filtered);
    } else {
      setFilteredArtists(artists);
    }
  }, [searchQuery, artists]);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setCurrentUserId(user.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasAccess = roles?.some(r => r.role === "admin" || r.role === "manager");
      const userIsAdmin = roles?.some(r => r.role === "admin") || false;
      setIsAdmin(userIsAdmin);
      
      if (!hasAccess) {
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas les permissions nécessaires.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setCanManage(true);
      await Promise.all([loadArtists(), loadEndedDuels(user.id)]);
    } catch (error) {
      console.error("Error checking access:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadArtists = async () => {
    try {
      const { data: artistRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "artist");

      if (artistRoles && artistRoles.length > 0) {
        const artistIds = artistRoles.map(r => r.user_id);
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", artistIds);

        const { data: artistProfiles } = await supabase
          .from("artist_profiles")
          .select("user_id, stage_name")
          .in("user_id", artistIds);

        const enrichedArtists = profiles?.map(profile => {
          const artistProfile = artistProfiles?.find(ap => ap.user_id === profile.id);
          return {
            ...profile,
            stage_name: artistProfile?.stage_name
          };
        }) || [];

        setArtists(enrichedArtists);
        setFilteredArtists(enrichedArtists);
      }
    } catch (error) {
      console.error("Error loading artists:", error);
    }
  };

  const loadEndedDuels = async (userId: string) => {
    try {
      const { data: duels } = await supabase
        .from("duels")
        .select("*")
        .eq("status", "ended")
        .eq("manager_id", userId)
        .order("ended_at", { ascending: false });

      if (duels) {
        const artistIds = [...new Set(duels.flatMap(d => [d.artist1_id, d.artist2_id]))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", artistIds);

        const { data: replays } = await supabase
          .from("replay_videos")
          .select("duel_id")
          .in("duel_id", duels.map(d => d.id));

        const enrichedDuels = duels.map(duel => ({
          ...duel,
          artist1_name: profiles?.find(p => p.id === duel.artist1_id)?.full_name || "Artiste 1",
          artist2_name: profiles?.find(p => p.id === duel.artist2_id)?.full_name || "Artiste 2",
          hasReplay: replays?.some(r => r.duel_id === duel.id)
        }));

        setEndedDuels(enrichedDuels);
      }
    } catch (error) {
      console.error("Error loading ended duels:", error);
    }
  };

  const handleCreateDuel = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.artist1_id || !formData.artist2_id) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner deux artistes.",
        variant: "destructive",
      });
      return;
    }

    if (formData.artist1_id === formData.artist2_id) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner deux artistes différents.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const managerId = isAdmin && formData.admin_role === "self" ? null : user?.id;
      const { error } = await supabase.from("duels").insert({
        artist1_id: formData.artist1_id,
        artist2_id: formData.artist2_id,
        scheduled_time: formData.scheduled_time || null,
        room_id: formData.room_id || null,
        manager_id: managerId,
        status: "upcoming"
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Le duel a été créé avec succès.",
      });

      setFormData({
        artist1_id: "",
        artist2_id: "",
        scheduled_time: "",
        room_id: "",
        admin_role: "manager",
      });

      setTimeout(() => navigate("/duels"), 1500);
    } catch (error) {
      console.error("Error creating duel:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le duel.",
        variant: "destructive",
      });
    }
  };

  const handlePublishReplay = async (duelId: string, publish: boolean) => {
    if (publish) {
      const duel = endedDuels.find(d => d.id === duelId);
      if (!duel) return;

      const { error } = await supabase.from("replay_videos").insert({
        duel_id: duelId,
        title: `Duel: ${duel.artist1_name} vs ${duel.artist2_name}`,
        description: `Replay du duel entre ${duel.artist1_name} et ${duel.artist2_name}`,
        video_url: duel.room_id ? `https://stream.example.com/replay/${duel.room_id}` : "",
        duration: "00:00",
        recorded_date: duel.ended_at || new Date().toISOString(),
        is_premium: false
      });

      if (error) {
        toast({ title: "Erreur", description: "Impossible de publier le replay.", variant: "destructive" });
      } else {
        toast({ title: "Succès", description: "Le replay a été mis en ligne." });
        if (currentUserId) loadEndedDuels(currentUserId);
      }
    } else {
      const { error } = await supabase
        .from("replay_videos")
        .delete()
        .eq("duel_id", duelId);

      if (error) {
        toast({ title: "Erreur", description: "Impossible de retirer le replay.", variant: "destructive" });
      } else {
        toast({ title: "Succès", description: "Le replay a été retiré." });
        if (currentUserId) loadEndedDuels(currentUserId);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Chargement...</p>
      </div>
    );
  }

  if (!canManage) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4">
        <div className="container max-w-4xl mx-auto space-y-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Gestion des Duels</h1>
            <p className="text-muted-foreground">Créez et gérez les duels et replays</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Créer un Nouveau Duel</CardTitle>
              <CardDescription>
                Sélectionnez les artistes et définissez les paramètres du duel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un artiste..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <form onSubmit={handleCreateDuel} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="artist1">Artiste 1</Label>
                  <Select
                    value={formData.artist1_id}
                    onValueChange={(value) => setFormData({ ...formData, artist1_id: value })}
                  >
                    <SelectTrigger id="artist1">
                      <SelectValue placeholder="Sélectionnez le premier artiste" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredArtists.map((artist) => (
                        <SelectItem key={artist.id} value={artist.id}>
                          {artist.stage_name || artist.full_name || artist.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artist2">Artiste 2</Label>
                  <Select
                    value={formData.artist2_id}
                    onValueChange={(value) => setFormData({ ...formData, artist2_id: value })}
                  >
                    <SelectTrigger id="artist2">
                      <SelectValue placeholder="Sélectionnez le deuxième artiste" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredArtists.map((artist) => (
                        <SelectItem key={artist.id} value={artist.id}>
                          {artist.stage_name || artist.full_name || artist.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduled_time">Date et heure (optionnel)</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <Input
                      id="scheduled_time"
                      type="datetime-local"
                      value={formData.scheduled_time}
                      onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="room_id">ID de la salle (optionnel)</Label>
                  <Input
                    id="room_id"
                    placeholder="Entrez l'ID de la salle de streaming"
                    value={formData.room_id}
                    onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                  />
                </div>

                {/* Admin role choice */}
                {isAdmin && (
                  <div className="space-y-2">
                    <Label>Votre rôle dans ce duel</Label>
                    <Select
                      value={formData.admin_role}
                      onValueChange={(value: "manager" | "self") => setFormData({ ...formData, admin_role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager (arbitre du duel)</SelectItem>
                        <SelectItem value="self">Administrateur (sans rôle de manager)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {formData.admin_role === "manager" 
                        ? "Vous serez assigné comme manager/arbitre du duel" 
                        : "Aucun manager ne sera assigné automatiquement"}
                    </p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                    Créer le Duel
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {endedDuels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Gestion des Replays
                </CardTitle>
                <CardDescription>
                  Publiez ou retirez les replays des duels terminés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {endedDuels.map((duel) => (
                    <div key={duel.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-semibold">
                          {duel.artist1_name} vs {duel.artist2_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(duel.ended_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={duel.hasReplay ? "default" : "secondary"}>
                          {duel.hasReplay ? "En ligne" : "Hors ligne"}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`replay-${duel.id}`} className="text-sm">
                            Publier
                          </Label>
                          <Switch
                            id={`replay-${duel.id}`}
                            checked={duel.hasReplay}
                            onCheckedChange={(checked) => handlePublishReplay(duel.id, checked)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Sélectionnez deux artistes différents pour organiser un duel.</p>
              <p>• Utilisez la barre de recherche pour trouver rapidement un artiste.</p>
              <p>• Après un duel, vous pouvez choisir de publier ou non le replay.</p>
              <p>• Les artistes sélectionnés recevront une notification pour le duel.</p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DuelManagement;