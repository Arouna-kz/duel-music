import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Music, Swords, DollarSign } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const COLORS = ["#9b87f5", "#F97316", "#10B981", "#EAB308", "#EC4899"];

interface StatsData {
  usersPerDay: { date: string; count: number }[];
  duelsPerWeek: { week: string; count: number }[];
  roleDistribution: { name: string; value: number }[];
  revenueData: { month: string; amount: number }[];
  topArtists: { name: string; votes: number }[];
}

const AdminStats = () => {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<StatsData>({
    usersPerDay: [],
    duelsPerWeek: [],
    roleDistribution: [],
    revenueData: [],
    topArtists: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const locale = language === "fr" ? "fr-FR" : "en-US";
      const usersPerDay = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toLocaleDateString(locale, { weekday: "short" });
        const count = profiles?.filter(p => {
          const d = new Date(p.created_at);
          return d.toDateString() === date.toDateString();
        }).length || 0;
        usersPerDay.push({ date: dateStr, count });
      }

      const { data: duels } = await supabase
        .from("duels")
        .select("created_at")
        .gte("created_at", new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString());

      const duelsPerWeek = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
        const count = duels?.filter(d => {
          const date = new Date(d.created_at);
          return date >= weekStart && date < weekEnd;
        }).length || 0;
        duelsPerWeek.push({ week: `${language === "fr" ? "S" : "W"}${4 - i}`, count });
      }

      const { data: roles } = await supabase.from("user_roles").select("role");
      const roleCounts: Record<string, number> = {};
      roles?.forEach(r => {
        roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
      });
      const roleDistribution = Object.entries(roleCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

      const { data: votes } = await supabase
        .from("duel_votes")
        .select("artist_id, amount");

      const artistVotes: Record<string, number> = {};
      votes?.forEach(v => {
        artistVotes[v.artist_id] = (artistVotes[v.artist_id] || 0) + Number(v.amount);
      });

      const artistIds = Object.keys(artistVotes);
      const { data: artistProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", artistIds);

      const topArtists = Object.entries(artistVotes)
        .map(([id, votes]) => ({
          name: artistProfiles?.find(p => p.id === id)?.full_name || (language === "fr" ? "Artiste" : "Artist"),
          votes
        }))
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 5);

      const revenueData = [
        { month: language === "fr" ? "Jan" : "Jan", amount: 12500 },
        { month: language === "fr" ? "Fév" : "Feb", amount: 18000 },
        { month: language === "fr" ? "Mar" : "Mar", amount: 22000 },
        { month: language === "fr" ? "Avr" : "Apr", amount: 19500 },
        { month: language === "fr" ? "Mai" : "May", amount: 28000 },
        { month: language === "fr" ? "Juin" : "Jun", amount: 32000 },
      ];

      setStats({ usersPerDay, duelsPerWeek, roleDistribution, revenueData, topArtists });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">{t("adminStatsLoading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-primary" />
              {t("adminStatsRegistrations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.usersPerDay}>
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Swords className="w-5 h-5 text-accent" />
              {t("adminStatsDuels")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.duelsPerWeek}>
                <XAxis dataKey="week" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Music className="w-5 h-5 text-green-500" />
              {t("adminStatsRoles")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.roleDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.roleDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-yellow-500" />
              {t("adminStatsRevenue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.revenueData}>
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => [`${value} FCFA`, t("adminStatsRevenueLabel")]} />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t("adminStatsTopArtists")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.topArtists} layout="vertical">
              <XAxis type="number" fontSize={12} />
              <YAxis type="category" dataKey="name" fontSize={12} width={100} />
              <Tooltip />
              <Bar dataKey="votes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStats;
