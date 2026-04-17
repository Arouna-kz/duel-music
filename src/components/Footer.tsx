import { Facebook, Instagram, Youtube, Download } from "lucide-react";
import logoImg from "@/assets/logo-tr.png";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePricingEnabled } from "@/hooks/usePlatformConfig";

const PricingLink = () => {
  const { t } = useLanguage();
  const { data: enabled } = usePricingEnabled();
  if (enabled === false) return null;
  return (
    <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
      {t("pricing")}
    </Link>
  );
};

// X (formerly Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="currentColor"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const Footer = () => {
  const { t, language } = useLanguage();

  return (
    <footer className="bg-card border-t border-border/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center">
              <img src={logoImg} alt="Duel Music" className="h-10" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("footerTagline")}
            </p>
            <div className="flex gap-3">
              <a 
                href="#" 
                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Facebook className="w-4 h-4 text-primary" />
              </a>
              <a 
                href="#" 
                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <XIcon className="w-4 h-4 text-primary" />
              </a>
              <a 
                href="#" 
                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Instagram className="w-4 h-4 text-primary" />
              </a>
              <a 
                href="#" 
                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Youtube className="w-4 h-4 text-primary" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">{t("footerPlatform")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/duels" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("duels")}
                </Link>
              </li>
              <li>
                <Link to="/lives" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("lives")}
                </Link>
              </li>
              <li>
                <Link to="/lifestyle" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("lifestyle")}
                </Link>
              </li>
              <li>
                <Link to="/replays" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("replays")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">{t("footerResources")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/help" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("helpCenter")}
                </Link>
              </li>
              <li>
                <PricingLink />
              </li>
              <li>
                <Link to="/blog" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("blog")}
                </Link>
              </li>
              <li>
                <Link to="/api" className="text-muted-foreground hover:text-primary transition-colors">
                  API
                </Link>
              </li>
              <li>
                <Link to="/technical-doc" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("technicalDoc")}
                </Link>
              </li>
              <li>
                <Link to="/user-guide" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("userGuide")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">{t("footerLegal")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("termsOfUse")}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("cookies")}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("contact")}
                </Link>
              </li>
              <li>
                <Link
                  to="/install"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {language === "fr" ? "Télécharger l'app" : "Download app"}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-4 text-center text-sm text-muted-foreground">
          <p>
            © 2025 Duel Music {language === "fr" ? "par" : "by"}{" "}
            <span className="font-semibold text-foreground">Synergy Network</span>. {t("allRightsReserved")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;