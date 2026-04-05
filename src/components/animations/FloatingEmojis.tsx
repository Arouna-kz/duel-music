import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

export interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  scale: number;
}

export const REACTION_EMOJIS = [
  { emoji: "❤️", label: "Cœur" },
  { emoji: "🔥", label: "Feu" },
  { emoji: "😍", label: "Amour" },
  { emoji: "👏", label: "Bravo" },
  { emoji: "🎵", label: "Musique" },
  { emoji: "💎", label: "Diamant" },
  { emoji: "🎶", label: "Notes" },
  { emoji: "⚡", label: "Éclair" },
  { emoji: "🌟", label: "Étoile" },
  { emoji: "😂", label: "Rire" },
];

export const useFloatingEmojis = () => {
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);

  const addEmoji = useCallback((emoji: string) => {
    const id = Date.now() + Math.random();
    const item: FloatingEmoji = {
      id,
      emoji,
      x: Math.random() * 50 - 25,
      scale: 0.7 + Math.random() * 0.6,
    };
    setEmojis((prev) => [...prev.slice(-20), item]);
    setTimeout(() => {
      setEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 3000);
  }, []);

  return { emojis, addEmoji };
};

/**
 * Hook for broadcasting and receiving emoji reactions in real-time via Supabase broadcast.
 * @param channelName - unique channel name for the room (e.g. `duel-emojis-{id}`)
 */
export const useBroadcastEmojis = (channelName: string | null) => {
  const { emojis, addEmoji } = useFloatingEmojis();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!channelName) return;
    const channel = supabase.channel(channelName)
      .on("broadcast", { event: "emoji_reaction" }, (payload) => {
        addEmoji(payload.payload.emoji);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelName, addEmoji]);

  const broadcastEmoji = useCallback((emoji: string) => {
    addEmoji(emoji); // local display
    channelRef.current?.send({
      type: "broadcast",
      event: "emoji_reaction",
      payload: { emoji },
    });
  }, [addEmoji]);

  return { emojis, broadcastEmoji };
};

interface FloatingEmojisProps {
  emojis: FloatingEmoji[];
}

export const FloatingEmojis = ({ emojis }: FloatingEmojisProps) => {
  return (
    <div className="absolute bottom-16 right-4 w-16 h-72 pointer-events-none z-30 overflow-hidden">
      <AnimatePresence>
        {emojis.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 1, y: 0, x: 0, scale: 0 }}
            animate={{
              opacity: [1, 1, 0.7, 0],
              y: -280,
              x: [0, item.x, item.x * 0.3],
              scale: [0, item.scale, item.scale * 0.9, 0],
              rotate: [0, item.x > 0 ? 15 : -15, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3, ease: "easeOut" }}
            className="absolute bottom-0 left-1/2 -translate-x-1/2"
          >
            <span className="text-2xl drop-shadow-lg select-none" style={{ fontSize: `${item.scale * 28}px` }}>
              {item.emoji}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

interface EmojiReactionBarProps {
  onReact: (emoji: string) => void;
  compact?: boolean;
}

export const EmojiReactionBar = ({ onReact, compact = false }: EmojiReactionBarProps) => {
  const displayEmojis = compact ? REACTION_EMOJIS.slice(0, 6) : REACTION_EMOJIS;

  return (
    <div className={`flex items-center gap-1 ${compact ? "justify-center" : "flex-wrap justify-center gap-2"}`}>
      {displayEmojis.map((item) => (
        <motion.button
          key={item.emoji}
          whileTap={{ scale: 1.4 }}
          whileHover={{ scale: 1.2 }}
          onClick={() => onReact(item.emoji)}
          className={`${compact ? "w-9 h-9 text-lg" : "w-10 h-10 text-xl"} rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center active:bg-primary/20 transition-colors`}
          title={item.label}
        >
          {item.emoji}
        </motion.button>
      ))}
    </div>
  );
};
