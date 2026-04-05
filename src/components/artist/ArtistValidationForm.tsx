import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ArtistValidationFormProps {
  userId: string;
  existingRequest?: {
    id: string;
    status: string;
    description: string;
  } | null;
  onRequestSubmitted?: () => void;
}

export const ArtistValidationForm = ({ userId, existingRequest, onRequestSubmitted }: ArtistValidationFormProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [socialLinks, setSocialLinks] = useState({
    instagram: "", tiktok: "", youtube: "", twitter: "", facebook: "", spotify: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast({ title: t("artValidError"), description: t("artValidFillDesc"), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("artist_requests")
        .insert({
          user_id: userId,
          description: description.trim(),
          justification_document_url: documentUrl || null,
          social_links: socialLinks
        });

      if (error) throw error;
      toast({ title: t("artValidSubmitted"), description: t("artValidSubmittedDesc") });
      onRequestSubmitted?.();
    } catch (error: any) {
      toast({ title: t("artValidError"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (existingRequest) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {existingRequest.status === "pending" ? (
              <><Clock className="w-5 h-5 text-yellow-500" />{t("artValidPending")}</>
            ) : existingRequest.status === "approved" ? (
              <><CheckCircle className="w-5 h-5 text-green-500" />{t("artValidApproved")}</>
            ) : (
              <><Clock className="w-5 h-5 text-red-500" />{t("artValidRejected")}</>
            )}
          </CardTitle>
          <CardDescription>
            {existingRequest.status === "pending" 
              ? t("artValidPendingDesc")
              : existingRequest.status === "approved"
              ? t("artValidApprovedDesc")
              : t("artValidRejectedDesc")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("artValidTitle")}</CardTitle>
        <CardDescription>{t("artValidDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="description">{t("artValidPresent")}</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("artValidPresentPlaceholder")} className="min-h-[120px]" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentUrl">{t("artValidDocLabel")}</Label>
            <Input id="documentUrl" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder={t("artValidDocPlaceholder")} />
            <p className="text-xs text-muted-foreground">{t("artValidDocHint")}</p>
          </div>

          <div className="space-y-4">
            <Label>{t("artValidSocial")}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["instagram", "tiktok", "youtube", "spotify", "twitter", "facebook"] as const).map((key) => (
                <div key={key}>
                  <Label htmlFor={key} className="text-sm text-muted-foreground">{key === "twitter" ? "X (Twitter)" : key.charAt(0).toUpperCase() + key.slice(1)}</Label>
                  <Input id={key} value={socialLinks[key]} onChange={(e) => setSocialLinks({...socialLinks, [key]: e.target.value})} placeholder={key === "youtube" || key === "spotify" || key === "facebook" ? `URL` : "@..."} />
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            {loading ? t("artValidSubmitting") : t("artValidSubmitBtn")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};