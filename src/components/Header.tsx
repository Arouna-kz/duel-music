import { Button } from "@/components/ui/button";
import { Music2, Menu, Moon, Sun, User, Gift, ChevronDown, Download } from "lucide-react";
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

  const navLinks = [
    { to: "/duels", label: t("duels") },
    { to: "/lives", label: t("lives") },
    { to: "/concerts", label: t("concerts") },
    { to: "/lifestyle", label: t("lifestyle") },
  ];

  const moreLinks = [
    { to: "/replays", label: t("replays") },
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Music2 className="w-8 h-8 text-primary transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 blur-lg bg-primary/30 group-hover:bg-primary/50 transition-all" />
          </div>
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Duel Music
          </span>
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

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="w-6 h-6" />
        </Button>
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
