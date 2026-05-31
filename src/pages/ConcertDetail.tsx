import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Calendar, MapPin, Ticket, Users, CheckCircle, UserPlus, UserCheck } from "lucide-react";
import { formatTz } from "@/lib/datetime";
import { useUiPreferences } from "@/hooks/useUiPreferences";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { ConcertReminder } from "@/components/concert/ConcertReminder";
import { FollowArtistButton } from "@/components/artist/FollowArtistButton";
import { PriceBadge } from "@/components/profile/PriceBadge";
import { useCurrencyFormatter } from "@/hooks/useCurrency";
import { DedicationDialog } from "@/components/concert/DedicationDialog";
import SEO from "@/components/seo/SEO";

const ConcertDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const { prefs } = useUiPreferences();
  const tz = prefs.timezone;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { setCurrentUserId(user?.id || null); });
  }, []);

  const { data: concert, isLoading } = useQuery({
    queryKey: ["concert", id],
    queryFn: async () => {
      const { data: artistConcert } = await supabase.from("artist_concerts").select("*").eq("id", id).maybeSingle();
      if (artistConcert) {
        const { data: artistProfile } = await supabase.from("artist_profiles").select("stage_name").eq("user_id", artistConcert.artist_id).maybeSingle();
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", artistConcert.artist_id).maybeSingle();
        return {
          id: artistConcert.id, title: artistConcert.title, artist_id: artistConcert.artist_id,
          artist_name: artistProfile?.stage_name || profile?.full_name || t("artistDefault"),
          description: artistConcert.description, scheduled_date: artistConcert.scheduled_date,
          scheduled_time: new Date(artistConcert.scheduled_date).toLocaleTimeString(language === "fr" ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
          location: t("online"), ticket_price: artistConcert.ticket_price, max_tickets: artistConcert.max_tickets,
          stream_url: artistConcert.stream_url, status: artistConcert.status, image_url: artistConcert.cover_image_url, is_artist_concert: true,
          allows_dedications: (artistConcert as any).allows_dedications ?? true,
          allows_sponsor_ads: (artistConcert as any).allows_sponsor_ads ?? true,
        };
      }
      const { data, error } = await supabase.from("concerts").select("*").eq("id", id).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data ? { ...data, is_artist_concert: false } : null;
    },
  });

  const { data: existingTicket } = useQuery({
    queryKey: ["user-ticket", id, currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data, error } = await supabase.from("concert_tickets").select("*").eq("concert_id", id).eq("user_id", currentUserId).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!currentUserId,
  });

  const { data: ticketCount } = useQuery({
    queryKey: ["concert-tickets", id],
    queryFn: async () => {
      const { count, error } = await supabase.from("concert_tickets").select("*", { count: "exact", head: true }).eq("concert_id", id);
      if (error) throw error;
      return count || 0;
    },
  });

  const isOrganizer = currentUserId && concert?.artist_id === currentUserId;
  const hasTicket = !!existingTicket;
  const isFree = concert?.ticket_price === 0;

  const purchaseTicket = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("loginToBuy"));
      // Use wallet RPC: deducts credits, creates ticket and distributes revenue atomically
      const { data, error } = await supabase.rpc("purchase_concert_ticket_from_wallet", {
        p_user_id: user.id,
        p_concert_id: id!,
      });
      if (error) throw new Error(error.message);
      const result = data as { success?: boolean; error?: string };
      if (!result?.success) {
        const { purchaseErrorKey } = await import("@/lib/purchaseErrors");
        throw new Error(t(purchaseErrorKey(result?.error)));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concert-tickets", id] });
      queryClient.invalidateQueries({ queryKey: ["user-ticket", id] });
      if (isFree) toast.success(t("ticketBooked"));
    },
    onError: (error: Error) => { toast.error(error.message || t("purchaseErrorGeneric")); },
  });

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
    return (<div className="min-h-screen bg-background"><Header /><main className="container mx-auto px-4 pt-24 pb-16"><p className="text-center text-muted-foreground">{t("concertNotFound")}</p></main><Footer /></div>);
  }

  const availableTickets = concert.max_tickets ? concert.max_tickets - (ticketCount || 0) : null;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${concert.title || "Concert"} — Duel Music`}
        description={(concert.description || `Concert en direct sur Duel Music`).slice(0, 160)}
        path={`/concert/${concert.id}`}
        image={concert.image_url || undefined}
        type="video.other"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "MusicEvent",
          name: concert.title,
          description: concert.description || undefined,
          image: concert.image_url || undefined,
          startDate: (concert as any).scheduled_date || undefined,
          eventStatus: concert.status === "live" ? "https://schema.org/EventScheduled" : undefined,
          location: { "@type": "VirtualLocation", url: `https://rhythm-remix-arena.lovable.app/concert/${concert.id}/live` },
        }}
      />
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <Button variant="ghost" onClick={() => navigate("/concerts")} className="mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />{t("back")}
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="h-96 rounded-lg bg-cover bg-center" style={{ backgroundImage: concert.image_url ? `url(${concert.image_url})` : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))' }} />

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge variant={concert.status === "live" ? "default" : "secondary"}>
                  {concert.status === "live" ? t("liveStatusLive") : concert.status === "ended" ? t("liveStatusEnded") : t("liveStatusUpcoming")}
                </Badge>
                {concert.status === "upcoming" && <ConcertReminder concertId={concert.id} concertTitle={concert.title} scheduledDate={concert.scheduled_date} />}
              </div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">{concert.title}</h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => concert.artist_id && navigate(`/artist/${concert.artist_id}`)}
                  className="text-2xl text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  {concert.artist_name}
                </button>
                {currentUserId && concert.artist_id && currentUserId !== concert.artist_id && (
                  <FollowArtistButton artistId={concert.artist_id} currentUserId={currentUserId} />
                )}
              </div>
            </div>

            {concert.description && <p className="text-muted-foreground">{concert.description}</p>}

            <Card className="bg-card/50 border-border">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-primary" /><div><p className="text-sm text-muted-foreground">{t("dateTime")}</p><p className="font-semibold">{formatTz(concert.scheduled_date, "dd MMMM yyyy", { timezone: tz, language })} • {concert.scheduled_time}</p></div></div>
                <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-primary" /><div><p className="text-sm text-muted-foreground">{t("venue")}</p><p className="font-semibold">{concert.location}</p></div></div>
                <div className="flex items-center gap-3"><Ticket className="w-5 h-5 text-primary" /><div><p className="text-sm text-muted-foreground">{t("ticketPrice")}</p><div className="mt-1"><PriceBadge credits={Number(concert.ticket_price) || 0} /></div></div></div>
                {availableTickets !== null && (
                  <div className="flex items-center gap-3"><Users className="w-5 h-5 text-primary" /><div><p className="text-sm text-muted-foreground">{t("availableSeats")}</p><p className="font-semibold">{availableTickets} / {concert.max_tickets}</p></div></div>
                )}
              </CardContent>
            </Card>

            {concert.status === "live" ? (
              <Button size="lg" className="w-full bg-red-500 hover:bg-red-600 transition-all text-lg" onClick={() => navigate(`/concert/${concert.id}/live`)}>
                {t("joinLive")}
              </Button>
            ) : concert.status === "upcoming" ? (
              <>
                {isOrganizer ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-primary"><CheckCircle className="w-5 h-5" /><span className="font-semibold">{t("youAreOrganizer")}</span></div>
                    <Button size="lg" className="w-full bg-gradient-primary hover:shadow-glow transition-all text-lg" onClick={() => navigate(`/concert/${concert.id}/live`)}>{t("manageConcert")}</Button>
                  </div>
                ) : hasTicket ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-500"><CheckCircle className="w-5 h-5" /><span className="font-semibold">{t("youHaveTicket")}</span></div>
                    <Button size="lg" className="w-full bg-gradient-primary hover:shadow-glow transition-all text-lg" onClick={() => navigate(`/concert/${concert.id}/live`)}>{t("accessConcert")}</Button>
                  </div>
                ) : (
                  <Button size="lg" className="w-full bg-gradient-primary hover:shadow-glow transition-all text-lg" onClick={() => purchaseTicket.mutate()} disabled={purchaseTicket.isPending || availableTickets === 0 || !currentUserId}>
                    {!currentUserId ? t("loginToBook") : purchaseTicket.isPending ? t("processing") : availableTickets === 0 ? t("soldOut") : isFree ? t("bookFree") : `${t("buyTicketPrice")} (${Number(concert.ticket_price).toLocaleString()} Crédits)`}
                  </Button>
                )}
              </>
            ) : (
              <Button size="lg" className="w-full" disabled>{t("concertEnded")}</Button>
            )}

            {(concert as any).is_artist_concert && (concert as any).allows_dedications && !isOrganizer && currentUserId && concert.status !== "ended" && (
              <DedicationDialog concertId={concert.id} artistName={concert.artist_name} />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ConcertDetail;
