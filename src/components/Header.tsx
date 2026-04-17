import { Button } from "@/components/ui/button";
import { Menu, Moon, Sun, User, Gift, ChevronDown, Download, Wallet, Eye, EyeOff } from "lucide-react";
import logoImg from "@/assets/logo-tr.png";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/notifications/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load wallet balance
  useEffect(() => {
    if (!user) { setWalletBalance(null); return; }
    const loadBalance = async () => {
      const { data } = await supabase.from("user_wallets").select("balance").eq("user_id", user.id).maybeSingle();
      setWalletBalance(data?.balance ?? 0);
    };
    loadBalance();
    // Realtime wallet updates
    const channel = supabase
      .channel(`wallet-header-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_wallets", filter: `user_id=eq.${user.id}` }, (payload: any) => {
        setWalletBalance(payload.new?.balance ?? 0);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Load show/hide preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("showWalletBalance");
    if (saved !== null) setShowBalance(saved === "true");
  }, []);

  const toggleBalanceVisibility = () => {
    const next = !showBalance;
    setShowBalance(next);
    localStorage.setItem("showWalletBalance", String(next));
  };

  const navLinks = [
    { to: "/duels", label: t("duels") },
    { to: "/lives", label: t("lives") },
    { to: "/concerts", label: t("concerts") },
    { to: "/lifestyle", label: t("lifestyle") },
  ];

  const moreLinks = [
    { to: "/leaderboard", label: t("leaderboard") },
    { to: "/artists", label: t("artists") },
  ];

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  const navLinkClass = (to: string) =>
    `transition-colors ${isActive(to) ? "text-primary font-semibold" : "text-foreground/80 hover:text-foreground"}`;

  const langFlag = language === "fr" ? "🇫🇷" : "🇬🇧";
  const langLabel = language === "fr" ? "FR" : "EN";

  const WalletDisplay = ({ className = "" }: { className?: string }) => {
    if (!user || walletBalance === null) return null;
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Link to="/wallet" className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
          <Wallet className="w-4 h-4 text-primary" />
          {showBalance ? (
            <span className="text-xs font-bold text-primary">{walletBalance}</span>
          ) : (
            <span className="text-xs font-bold text-primary">•••</span>
          )}
        </Link>
        <button onClick={toggleBalanceVisibility} className="p-1 rounded-full hover:bg-muted transition-colors">
          {showBalance ? <EyeOff className="w-3 h-3 text-muted-foreground" /> : <Eye className="w-3 h-3 text-muted-foreground" />}
        </button>
      </div>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center group">
          <img src={logoImg} alt="Duel Music" className="h-10 transition-transform group-hover:scale-105" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} className={navLinkClass(link.to)}>
              {link.label}
            </Link>
          ))}
          {moreLinks.map(link => (
            <Link key={link.to} to={link.to} className={navLinkClass(link.to)}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Medium screen nav */}
        <div className="hidden md:flex lg:hidden items-center gap-4">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} className={`${navLinkClass(link.to)} text-sm`}>
              {link.label}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-foreground/80 gap-1 text-sm">
                {t("more")} <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              {moreLinks.map(link => (
                <DropdownMenuItem key={link.to} asChild className="cursor-pointer">
                  <Link to={link.to}>{link.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <WalletDisplay />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-foreground gap-1 px-2">
                <span className="text-base">{langFlag}</span>
                <span className="text-xs font-semibold">{langLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => setLanguage("fr")} className={`cursor-pointer ${language === "fr" ? "bg-primary/10 text-primary font-semibold" : ""}`}>
                🇫🇷 Français
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("en")} className={`cursor-pointer ${language === "en" ? "bg-primary/10 text-primary font-semibold" : ""}`}>
                🇬🇧 English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-foreground"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/gift-shop">
                <Button variant="ghost" size="icon">
                  <Gift className="w-5 h-5" />
                </Button>
              </Link>
              <NotificationBell />
              <Link to="/profile">
                <Button className="bg-gradient-primary hover:shadow-glow transition-all" size="icon">
                  <User className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <Link to="/auth">
              <Button className="bg-gradient-primary hover:shadow-glow transition-all">
                {t("login")}
              </Button>
            </Link>
          )}
        </div>

        <div className="flex md:hidden items-center gap-1">
          {user && <WalletDisplay />}
          {user && (
            <Link to="/gift-shop">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Gift className="w-5 h-5 text-primary" />
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </Button>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-card border-t border-border animate-fade-in">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            {[...navLinks, ...moreLinks].map(link => (
              <Link key={link.to} to={link.to} className={`py-2 ${isActive(link.to) ? "text-primary font-semibold" : "text-foreground/80 hover:text-foreground"}`} onClick={() => setIsMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2 border-t border-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-foreground gap-1">
                    <span className="text-base">{langFlag}</span>
                    <span className="text-xs font-semibold">{langLabel}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border">
                  <DropdownMenuItem onClick={() => setLanguage("fr")} className={`cursor-pointer ${language === "fr" ? "bg-primary/10 text-primary font-semibold" : ""}`}>
                    🇫🇷 Français
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("en")} className={`cursor-pointer ${language === "en" ? "bg-primary/10 text-primary font-semibold" : ""}`}>
                    🇬🇧 English
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="text-foreground">
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </div>
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              {user ? (
                <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full bg-gradient-primary">
                    <User className="w-4 h-4 mr-2" />
                    {t("myProfileBtn")}
                  </Button>
                </Link>
              ) : (
                <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full bg-gradient-primary">
                    {t("login")}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
