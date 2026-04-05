import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ManagerValidationFormProps {
  userId: string;
  existingRequest?: { id: string; status: string } | null;
  onRequestSubmitted?: () => void;
}

export const ManagerValidationForm = ({ userId, existingRequest, onRequestSubmitted }: ManagerValidationFormProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bio.trim() || !experience.trim()) {
      toast({ title: t("commonError"), description: t("mgrValidFillAll"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("manager_requests").insert({ user_id: userId, bio, experience });
      if (error) throw error;
      toast({ title: t("mgrValidSubmitted"), description: t("mgrValidSubmittedDesc") });
      onRequestSubmitted?.();
    } catch (error: any) {
      toast({ title: t("commonError"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (existingRequest) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {existingRequest.status === "pending" ? <><Clock className="w-5 h-5 text-yellow-500" />{t("mgrValidPending")}</> : existingRequest.status === "approved" ? <><CheckCircle className="w-5 h-5 text-green-500" />{t("mgrValidApproved")}</> : <><Clock className="w-5 h-5 text-red-500" />{t("mgrValidRejected")}</>}
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("mgrValidTitle")}</CardTitle>
        <CardDescription>{t("mgrValidDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>{t("mgrValidBio")}</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("mgrValidBioPlaceholder")} required /></div>
          <div><Label>{t("mgrValidExp")}</Label><Textarea value={experience} onChange={(e) => setExperience(e.target.value)} placeholder={t("mgrValidExpPlaceholder")} required /></div>
          <Button type="submit" disabled={loading} className="w-full"><Upload className="w-4 h-4 mr-2" />{loading ? t("mgrValidSubmitting") : t("mgrValidSubmitBtn")}</Button>
        </form>
      </CardContent>
    </Card>
  );
};