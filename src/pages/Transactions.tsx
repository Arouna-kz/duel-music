import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileFooter from "@/components/profile/ProfileFooter";
import ProfileSidebar, { ProfileRole } from "@/components/profile/ProfileSidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ClipboardList, ShoppingCart, TrendingUp, Banknote, Coins } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrencyFormatter } from "@/hooks/useCurrency";
import { useUiPreferences } from "@/hooks/useUiPreferences";
import { formatTz } from "@/lib/datetime";

interface CreditPurchase {
  id: string;
  credits_amount: number;
  paid_amount: number;
  currency: string;
  payment_method: string;
  status: string;
  created_at: string;
}

interface RevenueDistribution {
  id: string;
  source_type: string;
  total_credits: number;
  platform_credits: number;
  artist1_credits: number;
  artist2_credits: number;
  manager_credits: number;
  artist1_id: string | null;
  artist2_id: string | null;
  manager_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  processed_at: string | null;
}

interface MyRevenueRow {
  source_id: string;
  event_label: string;
  source_type: string;
  total_received: number;
  tx_count: number;
  last_at: string;
}

const Transactions = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { prefs } = useUiPreferences();
  const tz = prefs.timezone;
  const fmtDt = (d: string) => formatTz(d, "dd MMM yyyy HH:mm", { timezone: tz, language });
  const { formatPrice } = useCurrencyFormatter();
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
  const [outgoing, setOutgoing] = useState<RevenueDistribution[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [myRevenues, setMyRevenues] = useState<MyRevenueRow[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  const canEarn = roles.some((r) => ["artist", "manager", "admin"].includes(r));

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const userRoles = (rolesData || []).map((r: any) => r.role as string);
      setRoles(userRoles);
      const earner = userRoles.some((r) => ["artist", "manager", "admin"].includes(r));

      const requests: any[] = [
        supabase
          .from("credit_purchases")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("revenue_distributions")
          .select("*")
          .eq("payer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ];
      if (earner) {
        requests.push(
          (supabase as any)
            .from("withdrawal_requests")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50)
        );
        requests.push((supabase as any).rpc("get_my_revenues_by_event", { p_period: "all" }));
      }
      const results = await Promise.all(requests);
      setPurchases((results[0]?.data as CreditPurchase[]) || []);
      setOutgoing((results[1]?.data as RevenueDistribution[]) || []);
      if (earner) {
        setWithdrawals(((results[2]?.data as unknown as WithdrawalRequest[]) || []));
        setMyRevenues(((results[3]?.data as unknown as MyRevenueRow[]) || []));
      }
      setLoading(false);
    })();
  }, [navigate]);

  const sourceLabel = (src: string) => t(`ecoSrc_${src}`) || src;

  const statusBadge = (status: string) => {
    const variant =
      status === "completed" ? "default" :
      status === "pending" || status === "processing" ? "secondary" :
      status === "rejected" || status === "failed" ? "destructive" : "outline";
    return <Badge variant={variant as any}>{status}</Badge>;
  };

  const isAdmin = roles.includes("admin");
  const isArtist = roles.includes("artist");
  const isManager = roles.includes("manager");
  const sidebarRole: ProfileRole = isArtist ? "artist" : isManager ? "manager" : "fan";
  const primaryRole = isAdmin ? "admin" : isArtist ? "artist" : isManager ? "manager" : "fan";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ProfileHeader primaryRole={primaryRole as any} showMenuButton onMenuToggle={() => setSidebarOpen((v) => !v)} />
      <main className="flex-1 container mx-auto px-3 sm:px-4 pt-20 pb-8">
        <div className="flex gap-6">
          {isAdmin ? (
            <AdminSidebar
              active="transactions"
              onSelect={(v) => {
                if (v === "transactions") return;
                if (v === "profile") { navigate("/profile"); return; }
                navigate(`/admin?tab=${v}`);
              }}
              stats={{ pendingArtistRequests: 0, pendingManagerRequests: 0, pendingDuelRequests: 0, pendingWithdrawals: 0, activeLives: 0 }}
              open={sidebarOpen}
              onOpenChange={setSidebarOpen}
            />
          ) : (
            <ProfileSidebar
              role={sidebarRole}
              active="transactions"
              onSelect={(v) => {
                if (v === "transactions") return;
                navigate(`/profile?tab=${v}`);
              }}
              open={sidebarOpen}
              onOpenChange={setSidebarOpen}
            />
          )}
          <div className="flex-1 min-w-0 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-primary" />
              {t("txPageTitle")}
            </h1>
            <p className="text-muted-foreground">{t("txPageSubtitle")}</p>
          </div>

          {loading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">{t("commonLoading")}</CardContent></Card>
          ) : (
            <Tabs defaultValue="incoming" className="space-y-6">
              <TabsList className={`grid w-full max-w-3xl ${canEarn ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
                <TabsTrigger value="incoming" className="gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("txTabIncoming")}</span>
                </TabsTrigger>
                <TabsTrigger value="outgoing" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("txTabOutgoing")}</span>
                </TabsTrigger>
                {canEarn && (
                  <TabsTrigger value="my-revenues" className="gap-2">
                    <Coins className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("txTabMyRevenues")}</span>
                  </TabsTrigger>
                )}
                {canEarn && (
                  <TabsTrigger value="withdrawals" className="gap-2">
                    <Banknote className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("txTabWithdrawals")}</span>
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="incoming">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("txIncomingTitle")}</CardTitle>
                    <CardDescription>{t("txIncomingDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {purchases.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">{t("txNoPurchases")}</p>
                    ) : (
                      <ScrollArea className="w-full">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("ecoCreditsCol")}</TableHead>
                              <TableHead>{t("ecoAmount")}</TableHead>
                              <TableHead>{t("ecoMethod")}</TableHead>
                              <TableHead>{t("ecoStatus")}</TableHead>
                              <TableHead>{t("ecoDate")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchases.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell className="font-bold text-primary">+{Number(p.credits_amount).toLocaleString()} {t("creditsUnit")}</TableCell>
                                <TableCell>{Number(p.paid_amount).toFixed(2)} {p.currency}</TableCell>
                                <TableCell><Badge variant="outline">{p.payment_method}</Badge></TableCell>
                                <TableCell>{statusBadge(p.status)}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{fmtDt(p.created_at)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="outgoing">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("txOutgoingTitle")}</CardTitle>
                    <CardDescription>{t("txOutgoingDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {outgoing.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">{t("txNoOutgoing")}</p>
                    ) : (
                      <div className="space-y-3">
                        {outgoing.map((d) => {
                          const total = Number(d.total_credits);
                          const platform = Number(d.platform_credits);
                          const a1 = Number(d.artist1_credits);
                          const a2 = Number(d.artist2_credits);
                          const mgr = Number(d.manager_credits);
                          const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
                          return (
                            <Card key={d.id} className="border-border/60">
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <Badge variant="outline" className="text-xs">{sourceLabel(d.source_type)}</Badge>
                                  <div className="text-right">
                                    <div className="text-sm font-bold">−{total.toLocaleString()} {t("creditsUnit")}</div>
                                    <div className="text-xs text-muted-foreground">~{formatPrice(total)}</div>
                                  </div>
                                </div>
                                <div className="flex h-2 rounded overflow-hidden bg-muted">
                                  {platform > 0 && <div className="bg-primary" style={{ width: `${pct(platform)}%` }} />}
                                  {a1 > 0 && <div className="bg-pink-500" style={{ width: `${pct(a1)}%` }} />}
                                  {a2 > 0 && <div className="bg-purple-500" style={{ width: `${pct(a2)}%` }} />}
                                  {mgr > 0 && <div className="bg-yellow-500" style={{ width: `${pct(mgr)}%` }} />}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /><span className="text-muted-foreground">{t("ecoPlatform")} :</span><span className="font-semibold">{platform.toLocaleString()} {t("creditsUnit")}</span></div>
                                  {a1 > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-500" /><span className="text-muted-foreground">{t("txArtist1")} :</span><span className="font-semibold">{a1.toLocaleString()} {t("creditsUnit")}</span></div>}
                                  {a2 > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /><span className="text-muted-foreground">{t("txArtist2")} :</span><span className="font-semibold">{a2.toLocaleString()} {t("creditsUnit")}</span></div>}
                                  {mgr > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" /><span className="text-muted-foreground">{t("ecoManager")} :</span><span className="font-semibold">{mgr.toLocaleString()} {t("creditsUnit")}</span></div>}
                                </div>
                                <div className="text-xs text-muted-foreground">{fmtDt(d.created_at)}</div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="my-revenues">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("txMyRevenuesTitle")}</CardTitle>
                    <CardDescription>{t("txMyRevenuesDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {myRevenues.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">{t("txMyRevenuesNone")}</p>
                    ) : (
                      <ScrollArea className="w-full">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("txMyRevenuesEvent")}</TableHead>
                              <TableHead>{t("txMyRevenuesSource")}</TableHead>
                              <TableHead className="text-right">{t("txMyRevenuesTotal")}</TableHead>
                              <TableHead className="text-right">{t("txMyRevenuesCount")}</TableHead>
                              <TableHead>{t("txMyRevenuesLast")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {myRevenues.map((r, i) => (
                              <TableRow key={`${r.source_id}-${r.source_type}-${i}`}>
                                <TableCell className="font-medium">{r.event_label}</TableCell>
                                <TableCell><Badge variant="outline" className="text-xs">{sourceLabel(r.source_type)}</Badge></TableCell>
                                <TableCell className="text-right">
                                  <div className="font-bold text-primary">+{Number(r.total_received).toLocaleString()} {t("creditsUnit")}</div>
                                  <div className="text-xs text-muted-foreground">~{formatPrice(Number(r.total_received))}</div>
                                </TableCell>
                                <TableCell className="text-right">{r.tx_count}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{fmtDt(r.last_at)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="withdrawals">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("txWithdrawalsTitle")}</CardTitle>
                    <CardDescription>{t("txWithdrawalsDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {withdrawals.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">{t("txNoWithdrawals")}</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("ecoAmount")}</TableHead>
                            <TableHead>{t("ecoMethod")}</TableHead>
                            <TableHead>{t("ecoStatus")}</TableHead>
                            <TableHead>{t("ecoDate")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {withdrawals.map((w) => (
                            <TableRow key={w.id}>
                              <TableCell className="font-bold">${Number(w.amount).toFixed(2)}</TableCell>
                              <TableCell><Badge variant="outline">{w.payment_method || "—"}</Badge></TableCell>
                              <TableCell>{statusBadge(w.status)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{fmtDt(w.created_at)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
          </div>
        </div>
      </main>
      <ProfileFooter />
    </div>
  );
};

export default Transactions;
