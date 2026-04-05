import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Bell, Music, Swords, Gift, Vote, FileCheck, Users, Radio, Settings2, Smartphone, BellOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface EmailPrefs {
  email_concerts: boolean;
  email_duels: boolean;
  email_gifts: boolean;
  email_votes: boolean;
  email_requests: boolean;
  email_assignments: boolean;
  email_system: boolean;
  email_lives: boolean;
}

const defaultPrefs: EmailPrefs = {
  email_concerts: true,
  email_duels: true,
  email_gifts: true,
  email_votes: true,
  email_requests: true,
  email_assignments: true,
  email_system: true,
  email_lives: true,
};

interface EmailNotificationPreferencesProps {
  userRoles: string[];
}

export const EmailNotificationPreferences = ({ userRoles }: EmailNotificationPreferencesProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState<EmailPrefs>(defaultPrefs);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const prefItems = [
    { key: "email_concerts" as keyof EmailPrefs, label: t("profileEmailConcerts"), description: t("profileEmailConcertsDesc"), icon: Music, roles: ["fan", "artist", "manager"] },
    { key: "email_duels" as keyof EmailPrefs, label: t("profileEmailDuels"), description: t("profileEmailDuelsDesc"), icon: Swords, roles: ["fan", "artist", "manager"] },
    { key: "email_lives" as keyof EmailPrefs, label: t("profileEmailLives"), description: t("profileEmailLivesDesc"), icon: Radio, roles: ["fan", "artist", "manager"] },
    { key: "email_gifts" as keyof EmailPrefs, label: t("profileEmailGifts"), description: t("profileEmailGiftsDesc"), icon: Gift, roles: ["artist", "manager"] },
    { key: "email_votes" as keyof EmailPrefs, label: t("profileEmailVotes"), description: t("profileEmailVotesDesc"), icon: Vote, roles: ["artist"] },
    { key: "email_requests" as keyof EmailPrefs, label: t("profileEmailRequests"), description: t("profileEmailRequestsDesc"), icon: FileCheck, roles: ["artist", "manager", "fan"] },
    { key: "email_assignments" as keyof EmailPrefs, label: t("profileEmailAssignments"), description: t("profileEmailAssignmentsDesc"), icon: Users, roles: ["artist", "manager"] },
    { key: "email_system" as keyof EmailPrefs, label: t("profileEmailSystem"), description: t("profileEmailSystemDesc"), icon: Settings2, roles: ["fan", "artist", "manager", "admin"], locked: true },
  ];

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setPushSupported(supported);
    if (supported && Notification.permission === "granted") {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => setPushEnabled(!!sub));
      });
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data, error } = await supabase.from("email_notification_preferences").select("*").eq("user_id", user.id).single();
      if (data) {
        setPrefs({
          email_concerts: data.email_concerts, email_duels: data.email_duels, email_gifts: data.email_gifts,
          email_votes: data.email_votes, email_requests: data.email_requests, email_assignments: data.email_assignments,
          email_system: data.email_system, email_lives: data.email_lives,
        });
      } else if (error?.code === "PGRST116") {
        await supabase.from("email_notification_preferences").insert({ user_id: user.id });
      }
      setLoaded(true);
    };
    load();
  }, []);

  const handleToggle = async (key: keyof EmailPrefs, value: boolean) => {
    if (!userId) return;
    setSaving(true);
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    const { error } = await supabase.from("email_notification_preferences").upsert({ user_id: userId, ...newPrefs }, { onConflict: "user_id" });
    if (error) {
      setPrefs(prefs);
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    } else {
      const item = prefItems.find(p => p.key === key);
      toast({ title: t("profileEmailSaved"), description: `${t("profileEmailSavedDesc")} "${item?.label}" ${value ? t("profileEmailEnabled") : t("profileEmailDisabledWord")}.` });
    }
    setSaving(false);
  };

  const handlePushToggle = async (enable: boolean) => {
    setPushLoading(true);
    try {
      if (enable) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: undefined });
          if (userId) {
            const subJson = sub.toJSON();
            await supabase.from("push_subscriptions").upsert({ user_id: userId, endpoint: sub.endpoint, p256dh: subJson.keys?.p256dh || "", auth: subJson.keys?.auth || "" }, { onConflict: "user_id" });
          }
          setPushEnabled(true);
          toast({ title: t("profilePushActivated"), description: t("profilePushActivatedDesc") });
        } else {
          toast({ title: t("profilePushPermDenied"), description: t("profilePushPermDeniedDesc"), variant: "destructive" });
        }
      } else {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        if (userId) await supabase.from("push_subscriptions").delete().eq("user_id", userId);
        setPushEnabled(false);
        toast({ title: t("profilePushDeactivated"), description: t("profilePushDeactivatedDesc") });
      }
    } catch (err) {
      console.error("Push toggle error:", err);
      toast({ title: t("error"), description: t("profilePushError"), variant: "destructive" });
    }
    setPushLoading(false);
  };

  const visibleItems = prefItems.filter(item => item.roles.some(r => userRoles.includes(r)));

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      {pushSupported && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{t("profilePushTitle")}</CardTitle>
                <CardDescription>{t("profilePushDesc")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${pushEnabled ? "border-border bg-accent/20" : "border-border/50 bg-muted/20"}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${pushEnabled ? "bg-primary/10" : "bg-muted"}`}>
                  {pushEnabled ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div>
                  <span className="font-medium text-sm">{pushEnabled ? t("profilePushEnabled") : t("profilePushDisabled")}</span>
                  <p className="text-xs text-muted-foreground">{pushEnabled ? t("profilePushEnabledDesc") : t("profilePushDisabledDesc")}</p>
                </div>
              </div>
              <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} disabled={pushLoading} />
            </div>
            {Notification.permission === "denied" && (
              <p className="text-xs text-destructive mt-2">{t("profilePushDenied")}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("profileEmailTitle")}</CardTitle>
              <CardDescription>{t("profileEmailDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const enabled = prefs[item.key];
            return (
              <div key={item.key} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${enabled ? "border-border bg-accent/20" : "border-border/50 bg-muted/20"}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${enabled ? "bg-primary/10" : "bg-muted"}`}>
                    <Icon className={`w-4 h-4 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.label}</span>
                      {"locked" in item && item.locked && <Badge variant="secondary" className="text-xs py-0">{t("profileEmailRequired")}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(val) => !("locked" in item && item.locked) && handleToggle(item.key, val)}
                  disabled={("locked" in item && item.locked) || saving}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};