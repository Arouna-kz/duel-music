import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export const AdminAnnouncementsManager = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [sending, setSending] = useState(false);

  const TARGETS = [
    { value: "all", label: t("annTargetAll") },
    { value: "fan", label: t("annTargetFan") },
    { value: "artist", label: t("annTargetArtist") },
    { value: "manager", label: t("annTargetManager") },
    { value: "moderator", label: t("annTargetMod") },
  ];

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: t("commonRequiredFields"), description: t("annRequiredDesc"), variant: "destructive" });
      return;
    }
    setSending(true);
    const { data, error } = await (supabase as any).rpc("admin_broadcast_announcement", {
      p_title: title.trim(),
      p_message: message.trim(),
      p_target_role: target,
    });
    setSending(false);
    const r = data as any;
    if (error || !r?.success) {
      toast({ title: t("commonError"), description: r?.message || error?.message || t("annSendErr"), variant: "destructive" });
      return;
    }
    toast({ title: t("annSentTitle"), description: `${r.recipients} ${t("annSentDescPrefix")}` });
    setTitle(""); setMessage("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          {t("annTitle")}
        </CardTitle>
        <CardDescription>
          {t("annDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>{t("annTarget")}</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TARGETS.map(tg => <SelectItem key={tg.value} value={tg.value}>{tg.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("annTitleField")}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("annTitlePh")} maxLength={120} />
        </div>
        <div>
          <Label>{t("annMessage")}</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("annMessagePh")} rows={4} maxLength={500} />
          <p className="text-[10px] text-muted-foreground mt-1">{message.length}/500 {t("annChars")}</p>
        </div>
        <Button onClick={send} disabled={sending || !title.trim() || !message.trim()} className="w-full bg-gradient-primary">
          <Send className="w-4 h-4 mr-2" />
          {sending ? t("annSending") : t("annSendBtn")}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminAnnouncementsManager;
