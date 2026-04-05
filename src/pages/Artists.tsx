import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Music, Mic } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface Artist {
  id: string;
  user_id: string;
  stage_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  full_name: string | null;
  followers_count: number;
}

const Artists = () => {
  const { t } = useLanguage();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadArtists();
  }, []);

  const loadArtists = async () => {
    try {
      const { data: artistProfiles, error } = await supabase
        .from("artist_profiles")
        .select("id, user_id, stage_name, avatar_url, bio")
        .eq("is_public", true);

      if (error) throw error;

      if (artistProfiles && artistProfiles.length > 0) {
        const userIds = artistProfiles.map(a => a.user_id);
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        const { data: followers } = await supabase
          .from("artist_followers")
          .select("artist_id");

        const followerCounts = new Map<string, number>();
        followers?.forEach(f => {
          const count = followerCounts.get(f.artist_id) || 0;
          followerCounts.set(f.artist_id, count + 1);
        });

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const enrichedArtists = artistProfiles.map(artist => ({
          ...artist,
          full_name: profileMap.get(artist.user_id)?.full_name || null,
          avatar_url: artist.avatar_url || profileMap.get(artist.user_id)?.avatar_url,
          followers_count: followerCounts.get(artist.user_id) || 0
        }));

        setArtists(enrichedArtists);
      }
    } catch (error) {
      console.error("Error loading artists:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArtists = artists.filter(artist => {
    const name = artist.stage_name || artist.full_name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <Badge className="mb-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              <Mic className="w-4 h-4 mr-1" />
              {t("artistsBadge")}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {t("discoverArtists")}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("discoverArtistsDesc")}
            </p>
          </motion.div>

          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchArtist")}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredArtists.length === 0 ? (
            <div className="text-center py-20">
              <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {searchQuery ? t("noArtistFound") : t("noArtistAvailable")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredArtists.map((artist, index) => (
                <motion.div
                  key={artist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link to={`/artist/${artist.user_id}`}>
                    <Card className="overflow-hidden hover:border-primary transition-all hover:shadow-lg group cursor-pointer">
                      <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 relative">
                        <Avatar className="w-full h-full rounded-none">
                          <AvatarImage 
                            src={artist.avatar_url || ""} 
                            className="object-cover"
                          />
                          <AvatarFallback className="w-full h-full rounded-none text-6xl">
                            {(artist.stage_name || artist.full_name || "A")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-bold text-lg truncate">
                          {artist.stage_name || artist.full_name || t("artistDefault")}
                        </h3>
                        {artist.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {artist.bio}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant="secondary" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {artist.followers_count} {t("followers")}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Artists;
