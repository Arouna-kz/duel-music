import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Search, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { COUNTRIES } from "@/data/countries";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import WelcomeOnboarding from "@/components/onboarding/WelcomeOnboarding";
import { useLanguage } from "@/contexts/LanguageContext";

// Simple email regex validator
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const Auth = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupEmailTouched, setSignupEmailTouched] = useState(false);
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryCode, setCountryCode] = useState("FR");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState("");

  const isSignupEmailValid = EMAIL_REGEX.test(signupEmail);
  const showEmailError = signupEmailTouched && signupEmail.length > 0 && !isSignupEmailValid;
  const showEmailSuccess = signupEmailTouched && isSignupEmailValid;

  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES.find(c => c.code === "FR")!;

  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dial.includes(countrySearch)
  );

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      setResetSent(true);
      toast({
        title: t("resetEmailSent"),
        description: t("resetEmailSentDesc"),
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const redirectByRole = async (userId: string) => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (roles && roles.length > 0) {
      const userRole = roles[0].role;
      if (userRole === "admin") {
        navigate("/admin");
      } else {
        navigate("/profile");
      }
    } else {
      navigate("/profile");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        redirectByRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setTimeout(() => {
          redirectByRole(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      toast({
        title: t("loginSuccess"),
        description: t("loginWelcome"),
      });
    } catch (error: any) {
      toast({
        title: t("loginError"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Password strength calculator
  const getPasswordStrength = (password: string): { level: "weak" | "medium" | "strong"; score: number } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { level: "weak", score };
    if (score <= 3) return { level: "medium", score };
    return { level: "strong", score };
  };

  const passwordStrength = getPasswordStrength(signupPassword);
  const strengthColors = {
    weak: "bg-destructive",
    medium: "bg-yellow-500",
    strong: "bg-green-500",
  };
  const strengthWidths = { weak: "w-1/3", medium: "w-2/3", strong: "w-full" };
  const strengthLabels = { weak: t("passwordWeak"), medium: t("passwordMedium"), strong: t("passwordStrong") };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSignupEmailValid) {
      setSignupEmailTouched(true);
      toast({
        title: t("invalidEmail"),
        description: t("invalidEmailDesc"),
        variant: "destructive",
      });
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast({
        title: t("error"),
        description: t("passwordsMismatchToast"),
        variant: "destructive",
      });
      return;
    }

    if (!acceptedTerms) {
      toast({
        title: t("acceptTermsRequired"),
        description: t("acceptTermsDesc"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error, data } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            full_name: signupName,
            role: "fan",
            phone: signupPhone ? `${selectedCountry.dial}${signupPhone}` : null,
            country_code: countryCode,
            phone_country_code: selectedCountry.dial,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      if (data.user) {
        setOnboardingName(signupName);
        setShowOnboarding(true);
      }
    } catch (error: any) {
      toast({
        title: t("signupError"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showOnboarding) {
    return <WelcomeOnboarding userName={onboardingName} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md p-8 bg-card/50 backdrop-blur-lg border-border/50 shadow-elegant animate-fade-in">
        {/* Back to home */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("backToHome")}
          </Link>
        </div>

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <img src={logoImg} alt="Duel Music" className="w-8 h-8" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Duel Music
            </span>
          </Link>
          <p className="text-muted-foreground">
            {t("joinCommunity")}
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">{t("loginTab")}</TabsTrigger>
            <TabsTrigger value="signup">{t("signupTab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="votremail@exemple.com"
                  className="bg-background/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-background/50"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:shadow-glow transition-all"
                disabled={loading}
              >
                {loading ? t("loggingIn") : t("loginAction")}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full text-sm"
                onClick={() => setShowForgotPassword(true)}
              >
                {t("forgotPassword")}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">{t("fullName")}</Label>
                <Input
                  id="signup-name"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="John Doe"
                  className="bg-background/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">{t("email")}</Label>
                <div className="relative">
                  <Input
                    id="signup-email"
                    type="email"
                    value={signupEmail}
                    onChange={(e) => {
                      setSignupEmail(e.target.value);
                      if (!signupEmailTouched) setSignupEmailTouched(true);
                    }}
                    onBlur={() => setSignupEmailTouched(true)}
                    placeholder="votremail@exemple.com"
                    className={`bg-background/50 pr-10 ${
                      showEmailError
                        ? "border-destructive focus-visible:ring-destructive"
                        : showEmailSuccess
                        ? "border-green-500 focus-visible:ring-green-500"
                        : ""
                    }`}
                    required
                  />
                  {showEmailSuccess && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" />
                  )}
                  {showEmailError && (
                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive pointer-events-none" />
                  )}
                </div>
                {showEmailError && (
                   <p className="text-xs text-destructive">
                    {t("invalidEmailHint")}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">{t("password")}</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-background/50 pr-10"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {signupPassword.length > 0 && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strengthColors[passwordStrength.level]} ${strengthWidths[passwordStrength.level]}`}
                      />
                    </div>
                    <p className={`text-xs font-medium ${
                      passwordStrength.level === "weak" ? "text-destructive" :
                      passwordStrength.level === "medium" ? "text-yellow-500" : "text-green-500"
                    }`}>
                      {t("passwordStrength")} : {strengthLabels[passwordStrength.level]}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">{t("confirmPassword")}</Label>
                <div className="relative">
                  <Input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`bg-background/50 pr-10 ${
                      signupConfirmPassword.length > 0 && signupConfirmPassword !== signupPassword
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {signupConfirmPassword.length > 0 && signupConfirmPassword !== signupPassword && (
                  <p className="text-xs text-destructive">{t("passwordsMismatch")}</p>
                )}
              </div>

              {/* Country + Phone */}
              <div className="space-y-2">
                <Label>{t("phoneOptional")}</Label>
                <div className="flex gap-2">
                  {/* Country selector with search */}
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-36 shrink-0 bg-background/50 justify-start text-left font-normal text-sm px-3"
                      >
                        <span className="truncate">{selectedCountry.dial} {selectedCountry.code}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0 bg-card border-border" align="start">
                      <div className="p-2 border-b border-border">
                        <div className="relative">
                           <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder={t("searchCountry")}
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-sm bg-background/50 border border-border rounded-md outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredCountries.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">{t("noResults")}</p>
                        ) : (
                          filteredCountries.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => {
                                setCountryCode(country.code);
                                setCountrySearch("");
                                setCountryOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left ${
                                countryCode === country.code ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                              }`}
                            >
                              <span>{country.name}</span>
                              <span className="text-muted-foreground ml-2 shrink-0">{country.dial}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Input
                    id="signup-phone"
                    type="tel"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    placeholder="612345678"
                    className="bg-background/50 flex-1"
                  />
                </div>
              </div>

              {/* Terms & Privacy */}
              <div className="flex items-start gap-3 pt-1">
                <Checkbox
                  id="accept-terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="accept-terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                  {t("acceptTermsLabel")}{" "}
                  <Link to="/privacy" className="text-primary hover:underline" target="_blank">
                    {t("privacyPolicyLink")}
                  </Link>{" "}
                  {t("andThe")}{" "}
                  <Link to="/terms" className="text-primary hover:underline" target="_blank">
                    {t("termsLink")}
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:shadow-glow transition-all"
                disabled={loading}
              >
                {loading ? t("creatingAccount") : t("createAccount")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {showForgotPassword && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold">{t("resetPassword")}</h3>
            {resetSent ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  {t("resetEmailSentInfo")} {forgotEmail}
                </p>
                <Button onClick={() => { setShowForgotPassword(false); setResetSent(false); }}>
                  {t("backToLogin")}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">{t("email")}</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="votremail@exemple.com"
                    className="bg-background/50"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? t("sending") : t("sendResetLink")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Auth;
