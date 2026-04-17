import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, UserCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface FollowArtistButtonProps {
  artistId: string;
  currentUserId: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "ghost" | "default";
}

export const FollowArtistButton = ({
  artistId,
  currentUserId,
  size = "sm",
  variant = "outline",
}: FollowArtistButtonProps) => {
  const { t } = useLanguage();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("artist_followers")
        .select("id")
        .eq("artist_id", artistId)
        .eq("follower_id", currentUserId)
        .maybeSingle();
      setIsFollowing(!!data);
    };
    check();
  }, [artistId, currentUserId]);

  const toggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    if (isFollowing) {
      await supabase
        .from("artist_followers")
        .delete()
        .eq("artist_id", artistId)
        .eq("follower_id", currentUserId);
      setIsFollowing(false);
    } else {
      await supabase
        .from("artist_followers")
        .insert({ artist_id: artistId, follower_id: currentUserId });
      setIsFollowing(true);
    }
    setLoading(false);
  };

  return (
    <Button
      size={size}
      variant={isFollowing ? "secondary" : variant}
      onClick={toggleFollow}
      disabled={loading}
      className="gap-1"
    >
    {isFollowing ? (
        <>
          <UserCheck className="w-3.5 h-3.5" />
          {t("following")}
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5" />
          {t("follow")}
        </>
      )}
    </Button>
  );
};
