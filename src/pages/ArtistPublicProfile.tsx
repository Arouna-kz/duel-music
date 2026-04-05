import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Instagram, Twitter, Youtube, Facebook, Music, Calendar, Swords, Users, Play } from "lucide-react";
import { ShareButton } from "@/components/sharing/ShareButton";
import { motion } from "framer-motion";
import { ImageZoomDialog } from "@/components/ui/image-zoom-dialog";
interface ArtistProfile {
  id: string;
  user_id: string;
  stage_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  social_links: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    facebook?: string;
    tiktok?: string;
  } | null;
  total_earnings: number | null;
}

interface Concert {
  id: string;
  title: string;
  scheduled_date: string;
  cover_image_url: string | null;
  ticket_price: number;
  status: string;
}

interface Duel {
  id: string;
  scheduled_time: string | null;
  status: string;
}

interface LifestyleVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views_count: number;
  duration: string;
}

const ArtistPublicProfile = () => {
  const { id } = useParams();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [videos, setVideos] = useState<LifestyleVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;

      // Fetch artist profile
      const { data: artistProfile, error } = await supabase
        .from("artist_profiles")
        .select("*")
        .eq("user_id", id)
        .eq("is_public", true)
        .single();

      // If not found as artist, try manager profile
      if (error || !artistProfile) {
        const { data: managerProfile } = await supabase
          .from("manager_profiles")
          .select("*")
          .eq("user_id", id)
          .eq("is_public", true)
          .single();

        if (managerProfile) {
          setProfile({
            id: managerProfile.id,
            user_id: managerProfile.user_id,
            stage_name: managerProfile.display_name,
            bio: managerProfile.bio,
            avatar_url: managerProfile.avatar_url,
            cover_image_url: managerProfile.cover_image_url || null,
            social_links: managerProfile.social_links as ArtistProfile["social_links"],
            total_earnings: null,
          });
        } else {
          setLoading(false);
          return;
        }
      } else {
        setProfile({
          ...artistProfile,
          social_links: artistProfile.social_links as ArtistProfile["social_links"]
        });
      }

      // Fetch user profile for name/avatar fallback
      const { data: userProf } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      
      if (userProf) setUserProfile(userProf);

      // Fetch concerts
      const { data: concertsData } = await supabase
        .from("artist_concerts")
        .select("*")
        .eq("artist_id", id)
        .order("scheduled_date", { ascending: false })
        .limit(6);
      
      if (concertsData) setConcerts(concertsData);

      // Fetch duels
      const { data: duelsData } = await supabase
        .from("duels")
        .select("*")
        .or(`artist1_id.eq.${id},artist2_id.eq.${id}`)
        .order("scheduled_time", { ascending: false })
        .limit(6);
      
      if (duelsData) setDuels(duelsData);

      // Fetch lifestyle videos
      const { data: videosData } = await supabase
        .from("lifestyle_videos")
        .select("*")
        .eq("artist_id", id)
        .order("created_at", { ascending: false })
        .limit(6);
      
      if (videosData) setVideos(videosData);

      // Real follower count
      const { count } = await supabase
        .from("artist_followers")
        .select("*", { count: "exact", head: true })
        .eq("artist_id", id);
      
      setFollowerCount(count || 0);
      
      setLoading(false);
    };

    fetchProfile();
  }, [id]);

  useEffect(() => {
    const checkFollowing = async () => {
      if (!currentUser || !id) return;
      
      const { data } = await supabase
        .from("artist_followers")
        .select("id")
        .eq("artist_id", id)
        .eq("follower_id", currentUser.id)
        .single();
      
      setIsFollowing(!!data);
    };
    
    checkFollowing();
  }, [currentUser, id]);

  const handleFollow = async () => {
    if (!currentUser) {
      return;
    }
    
    if (isFollowing) {
      await supabase
        .from("artist_followers")
        .delete()
        .eq("artist_id", id)
        .eq("follower_id", currentUser.id);
      setIsFollowing(false);
      setFollowerCount(prev => prev - 1);
    } else {
      await supabase
        .from("artist_followers")
        .insert({ artist_id: id, follower_id: currentUser.id });
      setIsFollowing(true);
      setFollowerCount(prev => prev + 1);
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case "instagram": return <Instagram className="w-5 h-5" />;
      case "twitter": return <Twitter className="w-5 h-5" />;
      case "youtube": return <Youtube className="w-5 h-5" />;
      case "facebook": return <Facebook className="w-5 h-5" />;
      default: return <Music className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t("loadingProfile")}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16 text-center">
          <h1 className="text-2xl font-bold mb-4">{t("profileNotFound")}</h1>
          <p className="text-muted-foreground mb-6">{t("profileNotFoundDesc")}</p>
          <Link to="/">
            <Button>{t("backToHome2")}</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const displayName = profile.stage_name || userProfile?.full_name || t("artistDefault");
  const avatarUrl = profile.avatar_url || userProfile?.avatar_url;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Cover Image */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-80 bg-gradient-to-b from-primary/30 to-background"
      >
        {profile.cover_image_url && (
          <ImageZoomDialog src={profile.cover_image_url} alt="Cover">
            <img 
              src={profile.cover_image_url} 
              alt="Cover" 
              className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
            />
          </ImageZoomDialog>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />
      </motion.div>

      <main className="container mx-auto px-4 -mt-24 relative z-10 pb-16">
        {/* Profile Header */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8"
        >
          <ImageZoomDialog src={avatarUrl || ""} alt={displayName}>
            <Avatar className="w-40 h-40 border-4 border-background shadow-xl cursor-zoom-in">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="text-4xl">{displayName[0]}</AvatarFallback>
            </Avatar>
          </ImageZoomDialog>
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-bold mb-2">{displayName}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-4">
              <Badge variant="secondary" className="text-sm">
                <Users className="w-4 h-4 mr-1" />
                {followerCount.toLocaleString()} {t("fansLabel")}
              </Badge>
              <Badge variant="secondary" className="text-sm">
                <Swords className="w-4 h-4 mr-1" />
                {duels.length} {t("duelsLabel")}
              </Badge>
              <Badge variant="secondary" className="text-sm">
                <Calendar className="w-4 h-4 mr-1" />
                {concerts.length} {t("concertsLabel")}
              </Badge>
            </div>
            
            {/* Social Links */}
            {profile.social_links && Object.keys(profile.social_links).length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                {Object.entries(profile.social_links).map(([platform, url]) => url && (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-card hover:bg-primary/20 transition-colors"
                  >
                    {getSocialIcon(platform)}
                  </a>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <ShareButton contentType="artist_profile" contentId={id!} title={displayName} />
            <Button 
              onClick={handleFollow}
              className={isFollowing ? "bg-muted hover:bg-muted/80" : "bg-gradient-primary hover:shadow-glow"}
            >
              {isFollowing ? t("followingBtn") : t("followBtn")}
            </Button>
          </div>
        </motion.div>

        {/* Bio */}
        {profile.bio && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="mb-8">
              <CardContent className="pt-6">
                <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Lifestyle Videos */}
        {videos.length > 0 && (
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Play className="w-6 h-6 text-primary" />
              {t("lifestyleSection")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {videos.map((video) => (
                <Link key={video.id} to={`/video/${video.id}`}>
                  <Card className="overflow-hidden hover:border-primary transition-colors">
                    <div className="aspect-video bg-muted relative">
                      {video.thumbnail_url && (
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {video.duration}
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium truncate">{video.title}</h3>
                      <p className="text-sm text-muted-foreground">{video.views_count.toLocaleString()} {t("viewsLabel")}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Concerts */}
        {concerts.length > 0 && (
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary" />
              {t("upcomingConcerts")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {concerts.map((concert) => (
                <Link key={concert.id} to={`/concert/${concert.id}`}>
                  <Card className="overflow-hidden hover:border-primary transition-colors">
                    <div className="aspect-video bg-muted relative">
                      {concert.cover_image_url && (
                        <img src={concert.cover_image_url} alt={concert.title} className="w-full h-full object-cover" />
                      )}
                      <Badge className="absolute top-2 left-2">{concert.status}</Badge>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium truncate">{concert.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(concert.scheduled_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-sm font-bold text-primary">{concert.ticket_price} €</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Duels */}
        {duels.length > 0 && (
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Swords className="w-6 h-6 text-primary" />
              Duels
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {duels.map((duel) => (
                <Link key={duel.id} to={`/duel/${duel.id}`}>
                  <Card className="hover:border-primary transition-colors p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant={duel.status === "live" ? "default" : "secondary"}>
                          {duel.status === "live" ? t("liveNow") : duel.status === "ended" ? t("ended") : t("upcoming")}
                        </Badge>
                        {duel.scheduled_time && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(duel.scheduled_time).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        {t("seeDuel")}
                      </Button>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ArtistPublicProfile;