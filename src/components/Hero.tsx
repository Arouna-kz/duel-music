import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Sparkles, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import heroBackground from "@/assets/hero-bg.jpg";
import duelIcon from "@/assets/duel-icon.png";
import { supabase } from "@/integrations/supabase/client";

const Hero = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState({ artists: 0, fans: 0, votes: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      // Use a SECURITY DEFINER function to bypass RLS for accurate counts
      const { data } = await supabase.rpc("get_platform_stats");

      if (data) {
        const stats = data as any;
        setStats({
          artists: stats.artists || 0,
          fans: stats.fans || 0,
          votes: stats.votes || 0,
        });
      }
    };

    fetchStats();
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K+`;
    return num.toString();
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-gradient-hero"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/30 to-background" />
      
      <div className="container mx-auto px-4 relative z-10 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-primary/20 shadow-glow mb-6">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm text-foreground/80">{t("heroTitle")}</span>
          </div>

          <img 
            src={duelIcon} 
            alt="Duel Music" 
            className="w-24 h-24 mx-auto drop-shadow-glow-strong animate-scale-in"
          />

          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span 
              className="bg-gradient-primary bg-clip-text text-transparent"
              style={{
                WebkitTextStroke: '1px hsl(var(--foreground) / 0.3)',
                paintOrder: 'stroke fill',
                filter: 'drop-shadow(0 2px 8px hsl(var(--background) / 0.8))',
              }}
            >
              {t("heroSubtitle")}
            </span>
          </h1>

          <p 
            className="text-xl md:text-2xl max-w-2xl mx-auto font-semibold"
            style={{
              color: 'hsl(var(--foreground))',
              textShadow: '0 0 20px hsl(var(--background)), 0 0 40px hsl(var(--background)), 0 2px 4px hsl(var(--background) / 0.9)',
            }}
          >
            {t("heroDescription")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Link to="/auth">
              <Button 
                size="lg" 
                className="bg-gradient-primary hover:shadow-glow-strong transition-all text-lg px-8 group"
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                {t("startNow")}
              </Button>
            </Link>
            <Link to="/duels">
              <Button 
                size="lg" 
                variant="outline" 
                className="border-primary/30 hover:border-primary hover:bg-primary/10 text-lg px-8 group"
              >
                <Trophy className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                {t("watchDuels")}
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-8 pt-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{formatNumber(stats.artists)}</div>
              <div className="text-sm text-muted-foreground">Artistes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">{formatNumber(stats.fans)}</div>
              <div className="text-sm text-muted-foreground">Fans</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-electric-blue">{formatNumber(stats.votes)}</div>
              <div className="text-sm text-muted-foreground">Votes</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
