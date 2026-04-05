import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, FileText, Briefcase, DollarSign } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Request {
  id: string;
  type: "artist" | "manager" | "withdrawal";
  label: string;
  status: string;
  created_at: string;
  extra?: string;
}

export const RequestTracker = ({ userId }: { userId: string }) => {
  const { t, language } = useLanguage();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: t("profileStatusPending"), icon: <Clock className="w-3 h-3" />, variant: "outline" },
    approved: { label: t("profileStatusApproved"), icon: <CheckCircle className="w-3 h-3" />, variant: "default" },
    completed: { label: t("profileStatusCompleted"), icon: <CheckCircle className="w-3 h-3" />, variant: "default" },
    rejected: { label: t("profileStatusRejected"), icon: <XCircle className="w-3 h-3" />, variant: "destructive" },
  };

  const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    artist: { label: t("profileRequestArtist"), icon: <FileText className="w-4 h-4" />, color: "text-purple-500" },
    manager: { label: t("profileRequestManager"), icon: <Briefcase className="w-4 h-4" />, color: "text-blue-500" },
    withdrawal: { label: t("profileRequestWithdrawal"), icon: <DollarSign className="w-4 h-4" />, color: "text-green-500" },
  };

  const fmt = (dt: string) =>
    new Date(dt).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "long", year: "numeric" });

  useEffect(() => {
    if (!userId) return;
    loadRequests();
  }, [userId]);

  const loadRequests = async () => {
    try {
      const [artistRes, managerRes, withdrawalRes] = await Promise.all([
        supabase.from("artist_requests").select("id, status, created_at, description").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("manager_requests").select("id, status, created_at, bio").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("withdrawal_requests").select("id, status, created_at, amount").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);

      const all: Request[] = [
        ...(artistRes.data || []).map(r => ({ id: r.id, type: "artist" as const, label: t("profileRequestArtistLabel"), status: r.status, created_at: r.created_at })),
        ...(managerRes.data || []).map(r => ({ id: r.id, type: "manager" as const, label: t("profileRequestManagerLabel"), status: r.status, created_at: r.created_at })),
        ...(withdrawalRes.data || []).map(r => ({ id: r.id, type: "withdrawal" as const, label: `${t("profileRequestWithdrawalLabel")} ${r.amount} €`, status: r.status, created_at: r.created_at, extra: `${r.amount} €` })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRequests(all);
    } catch (e) {
      console.error("Error loading requests:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {t("profileRequestTrackerTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {requests.map((req) => {
            const sc = statusConfig[req.status] || { label: req.status, icon: <Clock className="w-3 h-3" />, variant: "outline" as const };
            const tc = typeConfig[req.type];
            return (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50">
                <div className="flex items-center gap-3">
                  <div className={`${tc.color} shrink-0`}>{tc.icon}</div>
                  <div>
                    <p className="text-sm font-medium">{req.label}</p>
                    <p className="text-xs text-muted-foreground">{fmt(req.created_at)}</p>
                  </div>
                </div>
                <Badge variant={sc.variant} className="flex items-center gap-1 shrink-0">
                  {sc.icon}
                  {sc.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};