import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface ConcertReminderProps {
  concertId: string;
  concertTitle: string;
  scheduledDate: string;
}

export const ConcertReminder = ({ concertId, concertTitle, scheduledDate }: ConcertReminderProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [hasReminder, setHasReminder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkReminder();
  }, [concertId]);

  const checkReminder = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);
    const { data } = await supabase
      .from("concert_reminders")
      .select("id")
      .eq("concert_id", concertId)
      .eq("user_id", user.id)
      .maybeSingle();
    setHasReminder(!!data);
    setLoading(false);
  };

  const toggleReminder = async () => {
    if (!userId) {
      toast({ title: t("loginRequired"), description: t("loginForReminder"), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (hasReminder) {
        await supabase.from("concert_reminders").delete().eq("concert_id", concertId).eq("user_id", userId);
        setHasReminder(false);
        toast({ title: t("reminderDisabled"), description: t("reminderDisabledDesc") });
      } else {
        await supabase.from("concert_reminders").insert({ concert_id: concertId, user_id: userId, reminder_type: "30min" });
        setHasReminder(true);
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "concert_reminder",
          title: t("reminderActivated"),
          message: `${t("reminderActivatedNotif")} "${concertTitle}"`,
          data: { concert_id: concertId, scheduled_date: scheduledDate }
        });
        toast({ title: t("reminderActivated"), description: t("reminderActivatedDesc") });
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }
      }
    } catch (error) {
      toast({ title: t("errorTitle"), description: t("reminderError"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Bell className="w-4 h-4 mr-2 animate-pulse" />
        {t("reminderLoading")}
      </Button>
    );
  }

  return (
    <Button 
      onClick={toggleReminder}
      variant={hasReminder ? "secondary" : "outline"}
      size="sm"
      className={hasReminder ? "border-green-500" : ""}
    >
      {hasReminder ? (
        <>
          <Check className="w-4 h-4 mr-2 text-green-500" />
          {t("reminderOn")}
        </>
      ) : (
        <>
          <Bell className="w-4 h-4 mr-2" />
          {t("remindMe")}
        </>
      )}
    </Button>
  );
};
