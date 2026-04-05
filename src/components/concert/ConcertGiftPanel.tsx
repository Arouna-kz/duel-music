import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { GiftAnimationWithSound } from "@/components/animations/GiftAnimationWithSound";
import { StandardGiftNotification } from "@/components/animations/StandardGiftNotification";

interface ConcertGiftPanelProps {
  concertId: string;
  artistId?: string;
  artistName?: string;
}

const ConcertGiftPanel = ({
  concertId,
  artistId,
  artistName = "Artiste",
}: ConcertGiftPanelProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [gifts, setGifts] = useState<any[]>([]);
  const [selectedGift, setSelectedGift] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationData, setAnimationData] = useState<{
    eventId: string;
    giftName: string;
    giftImage: string;
    senderName: string;
    recipientName: string;
    price: number;
  } | null>(null);
  const animChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Failsafe: force-hide animation after max duration
  const showAnimationSafe = (data: typeof animationData) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setAnimationData(data);
    setShowAnimation(true);
    const maxDuration = (data && data.price >= 10)
      ? (data.price >= 50 ? 6500 : 5500)
      : 3500;
    hideTimerRef.current = setTimeout(() => {
      setShowAnimation(false);
      hideTimerRef.current = null;
    }, maxDuration);
  };

  useEffect(() => {
    const fetchUserGifts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: userGifts } = await supabase
          .from("user_gifts")
          .select("gift_id, quantity, virtual_gifts(*)")
          .eq("user_id", user.id)
          .gt("quantity", 0);

        if (userGifts) {
          const giftsWithQuantity = userGifts.map((ug: any) => ({
            ...ug.virtual_gifts,
            quantity: ug.quantity
          }));
          setGifts(giftsWithQuantity);
        }
      } else {
        const { data } = await supabase
          .from("virtual_gifts")
          .select("*")
          .order("price");
        if (data) setGifts(data.map(g => ({ ...g, quantity: 0 })));
      }
    };

    fetchUserGifts();

    const animChannel = supabase
      .channel(`gift-anim-${concertId}`, { config: { broadcast: { self: true, ack: true } } })
      .on("broadcast", { event: "gift_animation" }, (payload) => {
        const p = payload.payload;
        const eid = p.eventId;
        // Skip if already seen (sender already triggered locally)
        if (eid && seenEventIdsRef.current.has(eid)) return;
        if (eid) {
          seenEventIdsRef.current.add(eid);
          setTimeout(() => seenEventIdsRef.current.delete(eid), 10000);
        }
        showAnimationSafe({
          eventId: eid || crypto.randomUUID(),
          giftName: p.giftName,
          giftImage: p.giftImage,
          senderName: p.senderName,
          recipientName: p.recipientName,
          price: Number(p.price) || 0,
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          animChannelRef.current = animChannel;
        }
      });

    return () => {
      animChannelRef.current = null;
      supabase.removeChannel(animChannel);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [concertId, artistId, artistName]);

  const handleSendGift = async () => {
    if (!selectedGift || !artistId) {
      toast({
        title: t("incompleteSelection"),
        description: t("chooseAGift"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: t("loginRequired"),
        description: t("mustBeLoggedToGift"),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("gift_transactions").insert({
      from_user_id: user.id,
      to_user_id: artistId,
      gift_id: selectedGift,
      live_id: concertId,
    } as any);

    if (error) {
      toast({
        title: t("errorTitle"),
        description: t("cannotSendGift"),
        variant: "destructive",
      });
    } else {
      const giftData = gifts.find(g => g.id === selectedGift);
      
      if (giftData) {
        const { data: profiles } = await supabase.rpc("get_display_profiles", {
          user_ids: [user.id],
        });
        const profile = (profiles as any[])?.[0];
        
        const animPayload = {
          giftName: giftData.name,
          giftImage: giftData.image_url || "🎁",
          senderName: profile?.full_name || t("userDefault"),
          recipientName: artistName,
          price: Number(giftData.price) || 0,
          eventId: crypto.randomUUID(),
        };

        // Mark as seen to prevent duplicate from self-broadcast
        seenEventIdsRef.current.add(animPayload.eventId);
        setTimeout(() => seenEventIdsRef.current.delete(animPayload.eventId), 10000);

        // Sender sees animation immediately
        showAnimationSafe({ ...animPayload });

        // Broadcast to others via the existing channel
        if (animChannelRef.current) {
          animChannelRef.current.send({ type: "broadcast", event: "gift_animation", payload: animPayload });
        }
      }

      setSelectedGift("");
    }

    setLoading(false);
  };

  return (
    <>
      {showAnimation && animationData && (
        animationData.price < 10 ? (
          <StandardGiftNotification
            key={animationData.eventId}
            giftName={animationData.giftName}
            giftImage={animationData.giftImage}
            senderName={animationData.senderName}
            recipientName={animationData.recipientName}
            onComplete={() => {
              if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
              setShowAnimation(false);
            }}
          />
        ) : (
          <GiftAnimationWithSound
            key={animationData.eventId}
            giftName={animationData.giftName}
            giftImage={animationData.giftImage}
            senderName={animationData.senderName}
            recipientName={animationData.recipientName}
            enableSound={animationData.price >= 50}
            onComplete={() => {
              if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
              setShowAnimation(false);
            }}
          />
        )
      )}
      
      <Card className="bg-card border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-lg">{t("sendGift")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {gifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noGiftsOwned")}
            </p>
          ) : (
            <Select value={selectedGift} onValueChange={setSelectedGift}>
              <SelectTrigger>
                <SelectValue placeholder={t("chooseGift")} />
              </SelectTrigger>
              <SelectContent>
                {gifts.map((gift: any) => (
                  <SelectItem key={gift.id} value={gift.id}>
                    {gift.image_url} {gift.name} ({gift.quantity || 0} {t("availableShort")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            onClick={handleSendGift}
            disabled={loading || gifts.length === 0}
            className="w-full bg-gradient-primary hover:shadow-glow"
          >
            {t("sendTo")} {artistName} 🎁
          </Button>
        </CardContent>
      </Card>
    </>
  );
};

export default ConcertGiftPanel;
