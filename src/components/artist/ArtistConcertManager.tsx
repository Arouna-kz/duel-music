import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Ticket, DollarSign, Users, Video, Play, Trash2, Edit } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { useLanguage } from "@/contexts/LanguageContext";

interface ArtistConcertManagerProps {
  userId: string;
}

interface Concert {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  ticket_price: number;
  max_tickets: number | null;
  tickets_sold: number;
  revenue: number;
  status: string;
  stream_url: string | null;
  cover_image_url: string | null;
}

export const ArtistConcertManager = ({ userId }: ArtistConcertManagerProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingConcert, setEditingConcert] = useState<Concert | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduled_date: "",
    ticket_price: "",
    max_tickets: "",
    cover_image_url: "",
    stream_url: ""
  });

  useEffect(() => {
    loadConcerts();
  }, [userId]);

  const loadConcerts = async () => {
    try {
      const { data, error } = await supabase
        .from("artist_concerts")
        .select("*")
        .eq("artist_id", userId)
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      setConcerts(data || []);
    } catch (error) {
      console.error("Error loading concerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.scheduled_date) {
      toast({
        title: t("commonError"),
        description: t("artConcertRequiredFields"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingConcert) {
        const { error } = await supabase
          .from("artist_concerts")
          .update({
            title: formData.title,
            description: formData.description || null,
            scheduled_date: formData.scheduled_date,
            ticket_price: parseFloat(formData.ticket_price) || 0,
            max_tickets: formData.max_tickets ? parseInt(formData.max_tickets) : null,
            cover_image_url: formData.cover_image_url || null,
            stream_url: formData.stream_url || null
          })
          .eq("id", editingConcert.id);

        if (error) throw error;

        toast({
          title: t("artConcertUpdated"),
          description: t("artConcertUpdatedDesc"),
        });
      } else {
        const { error } = await supabase
          .from("artist_concerts")
          .insert({
            artist_id: userId,
            title: formData.title,
            description: formData.description || null,
            scheduled_date: formData.scheduled_date,
            ticket_price: parseFloat(formData.ticket_price) || 0,
            max_tickets: formData.max_tickets ? parseInt(formData.max_tickets) : null,
            cover_image_url: formData.cover_image_url || null,
            stream_url: formData.stream_url || null
          });

        if (error) throw error;

        toast({
          title: t("artConcertCreated"),
          description: t("artConcertCreatedDesc"),
        });
      }

      setFormData({ title: "", description: "", scheduled_date: "", ticket_price: "", max_tickets: "", cover_image_url: "", stream_url: "" });
      setEditingConcert(null);
      setIsDialogOpen(false);
      loadConcerts();
    } catch (error: any) {
      toast({ title: t("commonError"), description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteConcert = async (concertId: string) => {
    if (!confirm(t("artConcertDeleteConfirm"))) return;
    
    try {
      const { error } = await supabase.from("artist_concerts").delete().eq("id", concertId);
      if (error) throw error;
      toast({ title: t("artConcertDeleted"), description: t("artConcertDeletedDesc") });
      loadConcerts();
    } catch (error: any) {
      toast({ title: t("commonError"), description: error.message, variant: "destructive" });
    }
  };

  const updateConcertStatus = async (concertId: string, status: string) => {
    try {
      const { error } = await supabase.from("artist_concerts").update({ status }).eq("id", concertId);
      if (error) throw error;
      toast({ title: t("artConcertStatusUpdated"), description: `${status}` });
      loadConcerts();
    } catch (error: any) {
      toast({ title: t("commonError"), description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">{t("artConcertUpcoming")}</Badge>;
      case "live":
        return <Badge className="bg-red-500 animate-pulse">{t("artConcertLive")}</Badge>;
      case "ended":
        return <Badge variant="secondary">{t("artConcertEnded")}</Badge>;
      case "cancelled":
        return <Badge variant="destructive">{t("artConcertCancelled")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalRevenue = concerts.reduce((sum, c) => sum + Number(c.revenue), 0);
  const totalTicketsSold = concerts.reduce((sum, c) => sum + c.tickets_sold, 0);

  if (loading) {
    return <div className="text-center py-8">{t("commonLoading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("artConcertTitle")}</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />{t("artConcertPlan")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("artConcertNewTitle")}</DialogTitle>
              <DialogDescription>{t("artConcertNewDesc")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t("artConcertTitleLabel")}</Label>
                  <Input id="title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">{t("artConcertDateLabel")}</Label>
                  <Input id="scheduled_date" type="datetime-local" value={formData.scheduled_date} onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("artConcertDescLabel")}</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder={t("artConcertDescPlaceholder")} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticket_price">{t("artConcertPriceLabel")}</Label>
                  <Input id="ticket_price" type="number" step="0.01" value={formData.ticket_price} onChange={(e) => setFormData({...formData, ticket_price: e.target.value})} placeholder={t("artConcertPricePlaceholder")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_tickets">{t("artConcertMaxTickets")}</Label>
                  <Input id="max_tickets" type="number" value={formData.max_tickets} onChange={(e) => setFormData({...formData, max_tickets: e.target.value})} placeholder={t("artConcertMaxTicketsPlaceholder")} />
                </div>
              </div>

              <ImageUpload value={formData.cover_image_url} onChange={(url) => setFormData({...formData, cover_image_url: url})} label={t("artConcertCoverLabel")} folder="concerts" />

              <div className="space-y-2">
                <Label htmlFor="stream_url">{t("artConcertStreamLabel")}</Label>
                <Input id="stream_url" value={formData.stream_url} onChange={(e) => setFormData({...formData, stream_url: e.target.value})} placeholder={t("artConcertStreamPlaceholder")} />
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? t("artConcertCreating") : t("artConcertCreate")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
          <CardContent className="pt-6 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-3xl font-bold">{concerts.length}</p>
            <p className="text-sm text-muted-foreground">{t("artConcertPlanned")}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardContent className="pt-6 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-3xl font-bold">{totalTicketsSold}</p>
            <p className="text-sm text-muted-foreground">{t("artConcertTicketsSold")}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20">
          <CardContent className="pt-6 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <p className="text-3xl font-bold">{totalRevenue.toFixed(2)}€</p>
            <p className="text-sm text-muted-foreground">{t("artConcertTotalRevenue")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {concerts.map((concert) => (
          <Card key={concert.id} className="overflow-hidden">
            {concert.cover_image_url && (
              <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${concert.cover_image_url})` }} />
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{concert.title}</CardTitle>
                {getStatusBadge(concert.status)}
              </div>
              <CardDescription>
                {new Date(concert.scheduled_date).toLocaleDateString("fr-FR", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {concert.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{concert.description}</p>
              )}
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-lg font-bold">{concert.ticket_price}€</p>
                  <p className="text-xs text-muted-foreground">{t("artConcertPrice")}</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-lg font-bold">{concert.tickets_sold}</p>
                  <p className="text-xs text-muted-foreground">{t("artConcertSold")}</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-lg font-bold">{Number(concert.revenue).toFixed(0)}€</p>
                  <p className="text-xs text-muted-foreground">{t("artConcertRevenue")}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {concert.status === "upcoming" && (
                  <>
                    <Button size="sm" className="flex-1" onClick={() => navigate(`/concert/${concert.id}`)}>
                      <Play className="w-4 h-4 mr-1" />{t("artConcertStartLive")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingConcert(concert);
                      setFormData({
                        title: concert.title,
                        description: concert.description || "",
                        scheduled_date: concert.scheduled_date.slice(0, 16),
                        ticket_price: String(concert.ticket_price),
                        max_tickets: concert.max_tickets ? String(concert.max_tickets) : "",
                        cover_image_url: concert.cover_image_url || "",
                        stream_url: concert.stream_url || ""
                      });
                      setIsDialogOpen(true);
                    }}>
                      {t("artConcertEdit")}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteConcert(concert.id)}>
                      {t("artConcertDelete")}
                    </Button>
                  </>
                )}
                {concert.status === "live" && (
                  <>
                    <Button size="sm" className="flex-1" onClick={() => navigate(`/concert/${concert.id}`)}>
                      <Video className="w-4 h-4 mr-1" />{t("artConcertWatch")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateConcertStatus(concert.id, "ended")}>
                      {t("artConcertEnd")}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {concerts.length === 0 && (
        <Card className="p-8 text-center">
          <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">{t("artConcertEmpty")}</p>
          <p className="text-sm text-muted-foreground mb-4">{t("artConcertEmptyDesc")}</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />{t("artConcertPlan")}
          </Button>
        </Card>
      )}
    </div>
  );
};