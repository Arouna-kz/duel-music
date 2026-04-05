import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

interface FloatingHeart {
  id: number;
  x: number;
  scale: number;
  color: string;
}

const HEART_COLORS = [
  "text-red-500",
  "text-pink-500",
  "text-rose-400",
  "text-red-400",
  "text-pink-400",
];

export const useFloatingHearts = () => {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);

  const addHeart = useCallback(() => {
    const id = Date.now() + Math.random();
    const heart: FloatingHeart = {
      id,
      x: Math.random() * 60 - 30,
      scale: 0.6 + Math.random() * 0.8,
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
    };
    setHearts((prev) => [...prev.slice(-15), heart]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, 2500);
  }, []);

  return { hearts, addHeart };
};

interface FloatingHeartsProps {
  hearts: FloatingHeart[];
}

export const FloatingHearts = ({ hearts }: FloatingHeartsProps) => {
  return (
    <div className="absolute bottom-16 right-4 w-16 h-64 pointer-events-none z-30 overflow-hidden">
      <AnimatePresence>
        {hearts.map((heart) => (
          <motion.div
            key={heart.id}
            initial={{ opacity: 1, y: 0, x: 0, scale: 0 }}
            animate={{
              opacity: [1, 1, 0.8, 0],
              y: -250,
              x: [0, heart.x, heart.x * 0.5],
              scale: [0, heart.scale, heart.scale * 0.8, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="absolute bottom-0 left-1/2"
          >
            <Heart
              className={`w-6 h-6 ${heart.color} fill-current drop-shadow-lg`}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
