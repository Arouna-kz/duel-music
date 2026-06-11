import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Vote, Trophy, X, Minus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUiPreferences } from "@/hooks/useUiPreferences";
import { formatTz } from "@/lib/datetime";

interface VoteRow {
  id: string;
  duel_id: string | null;
  artist_id: string;
  amount: number; // total credits spent on this vote line
  created_at: string;
  duel_status?: string | null;
  duel_winner_id?: string | null;
  artist1_id?: string | null;
  artist2_id?: string | null;
  artist1_name?: string | null;
  artist2_name?: string | null;
  voted_artist_name?: string | null;
  artist_total_for_duel?: number;
  opponent_total_for_duel?: number;
}

/**
 * Detailed history of votes cast by the current user.
 * For each vote line we show: quantity (votes), unit price (credits), total cost,
 * the artist supported, and the outcome on the duel (won / lost / pending) with
 * the share this vote represented in the supported artist's final score.
 */
export const MyVotesHistory = () => {
  const { language, t } = useLanguage();
  const { prefs } = useUiPreferences();
  const tz = prefs.timezone;
  const [rows, setRows] = useState<VoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricePerVote, setPricePerVote] = useState<number>(1);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: cfg } = await supabase
      .from("platform_settings").select("value").eq("key", "vote_config").maybeSingle();
    const ppv = (cfg?.value as any)?.price_per_vote;
    const unit = Number(ppv) > 0 ? Number(ppv) : 1;
    setPricePerVote(unit);

    const { data: votes } = await supabase
      .from("duel_votes")
      .select("id, duel_id, artist_id, amount, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!votes || votes.length === 0) { setRows([]); setLoading(false); return; }

    const duelIds = [...new Set(votes.map((v: any) => v.duel_id).filter(Boolean))];
    const artistIds = [...new Set(votes.map((v: any) => v.artist_id))];

    const [{ data: duels }, { data: profiles }] = await Promise.all([
      duelIds.length
        ? supabase.from("duels").select("id, status, winner_id, artist1_id, artist2_id").in("id", duelIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("profiles").select("id, full_name").in("id", artistIds.concat(
        // also pull duel opponents
        []
      )),
    ]);

    // pull both artists names
    const allArtistIds = new Set<string>(artistIds);
    (duels || []).forEach((d: any) => {
      allArtistIds.add(d.artist1_id);
      allArtistIds.add(d.artist2_id);
    });
    const { data: allProfiles } = await supabase.from("profiles").select("id, full_name").in("id", [...allArtistIds]);
    const nameMap = new Map((allProfiles || []).map((p: any) => [p.id, p.full_name || "—"]));
    const duelMap = new Map((duels || []).map((d: any) => [d.id, d]));

    // Aggregate totals for each (duel,artist) pair to compute share / opponent total
    const totalsKey = (duelId: string, artistId: string) => `${duelId}::${artistId}`;
    const totals = new Map<string, number>();
    for (const d of duels || []) {
      const { data: agg } = await supabase
        .from("duel_votes")
        .select("artist_id, amount")
        .eq("duel_id", d.id);
      (agg || []).forEach((r: any) => {
        const k = totalsKey(d.id, r.artist_id);
        totals.set(k, (totals.get(k) || 0) + Number(r.amount));
      });
    }

    const mapped: VoteRow[] = votes.map((v: any) => {
      const d: any = v.duel_id ? duelMap.get(v.duel_id) : null;
      const artistTotal = d ? (totals.get(totalsKey(d.id, v.artist_id)) || 0) : 0;
      const opponentId = d ? (d.artist1_id === v.artist_id ? d.artist2_id : d.artist1_id) : null;
      const opponentTotal = d && opponentId ? (totals.get(totalsKey(d.id, opponentId)) || 0) : 0;
      return {
        id: v.id,
        duel_id: v.duel_id,
        artist_id: v.artist_id,
        amount: Number(v.amount),
        created_at: v.created_at,
        duel_status: d?.status ?? null,
        duel_winner_id: d?.winner_id ?? null,
        artist1_id: d?.artist1_id ?? null,
        artist2_id: d?.artist2_id ?? null,
        artist1_name: d ? (nameMap.get(d.artist1_id) as string) : null,
        artist2_name: d ? (nameMap.get(d.artist2_id) as string) : null,
        voted_artist_name: nameMap.get(v.artist_id) as string,
        artist_total_for_duel: artistTotal,
        opponent_total_for_duel: opponentTotal,
      };
    });

    setRows(mapped);
    setLoading(false);
  };

  const fmt = (dt: string) => formatTz(dt, "dd MMM yyyy HH:mm", { timezone: tz, language });

  const tr = {
    fr: {
      title: "Historique de mes votes",
      subtitle: "Détail de chaque vote, prix unitaire, coût total et impact sur le résultat",
      empty: "Vous n'avez encore voté pour aucun duel.",
      colDate: "Date",
      colArtist: "Artiste soutenu",
      colQty: "Votes",
      colUnit: "Prix unitaire",
      colTotal: "Coût total",
      colImpact: "Impact",
      pending: "En cours",
      won: "Gagné",
      lost: "Perdu",
      noWinner: "Sans gagnant",
      shareOf: "de ses voix",
      vs: "vs",
      summary: "Total dépensé en votes",
    },
    en: {
      title: "My vote history",
      subtitle: "Each vote line with unit price, total cost and impact on the result",
      empty: "You have not voted in any duel yet.",
      colDate: "Date",
      colArtist: "Artist backed",
      colQty: "Votes",
      colUnit: "Unit price",
      colTotal: "Total cost",
      colImpact: "Impact",
      pending: "Ongoing",
      won: "Won",
      lost: "Lost",
      noWinner: "No winner",
      shareOf: "of their votes",
      vs: "vs",
      summary: "Total spent on votes",
    },
  }[language === "en" ? "en" : "fr"];

  const grandTotal = rows.reduce((acc, r) => acc + r.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Vote className="w-5 h-5" />{tr.title}</CardTitle>
        <CardDescription>{tr.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Vote className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>{tr.empty}</p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                {tr.summary}: <span className="ml-1 font-bold">{Math.round(grandTotal)} crédits</span>
              </Badge>
              <Badge variant="secondary" className="text-xs">
                1 vote = {pricePerVote} crédit(s)
              </Badge>
            </div>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-2">
                {rows.map((r) => {
                  const qty = Math.max(1, Math.round(r.amount / pricePerVote));
                  const isPending = r.duel_status !== "ended" && r.duel_status !== "completed";
                  const won = !isPending && r.duel_winner_id === r.artist_id;
                  const noWinner = !isPending && !r.duel_winner_id;
                  const totalForVoted = r.artist_total_for_duel || 0;
                  const share = totalForVoted > 0 ? (r.amount / totalForVoted) * 100 : 0;
                  return (
                    <div key={r.id} className="border border-border rounded-lg p-3 bg-card/50">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">{r.voted_artist_name}</span>
                            {r.artist1_name && r.artist2_name && (
                              <span className="text-xs text-muted-foreground">
                                ({r.artist1_name} {tr.vs} {r.artist2_name})
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{fmt(r.created_at)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {isPending ? (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-500">{tr.pending}</Badge>
                          ) : won ? (
                            <Badge className="bg-green-500 text-white"><Trophy className="w-3 h-3 mr-1" />{tr.won}</Badge>
                          ) : noWinner ? (
                            <Badge variant="secondary"><Minus className="w-3 h-3 mr-1" />{tr.noWinner}</Badge>
                          ) : (
                            <Badge variant="destructive"><X className="w-3 h-3 mr-1" />{tr.lost}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="rounded-md bg-muted/40 px-2 py-1">
                          <p className="text-[10px] uppercase text-muted-foreground">{tr.colQty}</p>
                          <p className="font-bold">{qty}</p>
                        </div>
                        <div className="rounded-md bg-muted/40 px-2 py-1">
                          <p className="text-[10px] uppercase text-muted-foreground">{tr.colUnit}</p>
                          <p className="font-bold">{pricePerVote} cr.</p>
                        </div>
                        <div className="rounded-md bg-muted/40 px-2 py-1">
                          <p className="text-[10px] uppercase text-muted-foreground">{tr.colTotal}</p>
                          <p className="font-bold">{Math.round(r.amount)} cr.</p>
                        </div>
                        <div className="rounded-md bg-muted/40 px-2 py-1">
                          <p className="text-[10px] uppercase text-muted-foreground">{tr.colImpact}</p>
                          <p className="font-bold">{share.toFixed(1)}% {tr.shareOf}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MyVotesHistory;
