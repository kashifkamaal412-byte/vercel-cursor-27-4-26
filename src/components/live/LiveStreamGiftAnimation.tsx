import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export interface StreamGift {
  id: string;
  senderName: string;
  giftName: string;
  giftValue: number;
  giftImage?: string;
  emoji?: string;
}

interface LiveStreamGiftAnimationProps {
  gift: StreamGift | null;
}

// Premium gift background scenes
const giftScenes: Record<string, { bg: string; animation: string }> = {
  dragon: { bg: "from-orange-900/80 via-red-900/60 to-black/80", animation: "🐉" },
  lion: { bg: "from-amber-900/80 via-green-900/60 to-black/80", animation: "🦁" },
  car: { bg: "from-gray-900/80 via-blue-900/60 to-black/80", animation: "🏎️" },
  supercar: { bg: "from-gray-900/80 via-blue-900/60 to-black/80", animation: "🏎️" },
  lamborghini: { bg: "from-yellow-900/80 via-gray-900/60 to-black/80", animation: "🏎️" },
  jet: { bg: "from-sky-900/80 via-blue-900/60 to-black/80", animation: "✈️" },
  privatejet: { bg: "from-sky-900/80 via-indigo-900/60 to-black/80", animation: "✈️" },
  yacht: { bg: "from-cyan-900/80 via-blue-900/60 to-black/80", animation: "🛥️" },
  rocket: { bg: "from-indigo-900/80 via-purple-900/60 to-black/80", animation: "🚀" },
  spacerocket: { bg: "from-indigo-900/80 via-purple-900/60 to-black/80", animation: "🚀" },
  castle: { bg: "from-purple-900/80 via-pink-900/60 to-black/80", animation: "🏰" },
  throne: { bg: "from-yellow-900/80 via-amber-900/60 to-black/80", animation: "👑" },
  diamond: { bg: "from-cyan-900/80 via-white/20 to-black/80", animation: "💎" },
  watch: { bg: "from-amber-900/80 via-yellow-900/60 to-black/80", animation: "⌚" },
  pegasus: { bg: "from-white/30 via-sky-900/60 to-black/80", animation: "🦄" },
  robot: { bg: "from-gray-900/80 via-cyan-900/60 to-black/80", animation: "🤖" },
};

const getGiftScene = (giftName: string) => {
  const key = giftName.toLowerCase().replace(/\s+/g, "");
  return giftScenes[key] || null;
};

export const LiveStreamGiftAnimation = ({ gift }: LiveStreamGiftAnimationProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (gift) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [gift]);

  if (!gift) return null;

  const scene = getGiftScene(gift.giftName);
  const isPremium = scene !== null || gift.giftValue >= 100;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Premium full-screen cinematic overlay */}
          {isPremium && scene && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={`absolute inset-0 z-40 bg-gradient-to-b ${scene.bg} pointer-events-none`}
            >
              {/* Flying emoji animation */}
              <motion.div
                initial={{ x: -100, y: "60%", scale: 0.5, opacity: 0 }}
                animate={{
                  x: ["0%", "30%", "70%", "110%"],
                  y: ["60%", "30%", "20%", "40%"],
                  scale: [0.5, 2, 2.5, 1],
                  opacity: [0, 1, 1, 0],
                  rotate: [0, -10, 10, 0],
                }}
                transition={{ duration: 3, ease: "easeInOut" }}
                className="absolute text-7xl"
              >
                {scene.animation}
              </motion.div>

              {/* Sparkle particles */}
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: Math.random() * 300 - 150,
                    y: Math.random() * -200 - 50,
                  }}
                  transition={{ duration: 2, delay: 0.5 + i * 0.15, ease: "easeOut" }}
                  className="absolute left-1/2 top-1/2 w-2 h-2 bg-yellow-400 rounded-full"
                />
              ))}
            </motion.div>
          )}

          {/* Gift banner (always shown) */}
          <motion.div
            initial={{ x: -400, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 400, opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="absolute left-4 z-50 flex items-center gap-3 bg-black/70 backdrop-blur-md rounded-full px-4 py-2.5 border border-primary/40"
            style={{ top: "35%" }}
          >
            {gift.giftImage ? (
              <motion.img
                src={gift.giftImage}
                className="w-12 h-12 rounded-full object-cover"
                alt={gift.giftName}
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: 3 }}
              />
            ) : (
              <motion.div
                className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-2xl"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                {gift.emoji || (scene?.animation ?? "🎁")}
              </motion.div>
            )}
            <div>
              <p className="text-xs font-bold text-white">{gift.senderName}</p>
              <p className="text-sm text-primary font-semibold">
                sent {gift.giftName} {gift.giftValue > 0 && `× ${gift.giftValue}`}
              </p>
            </div>

            {/* Coin burst */}
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.8, 1] }}
              transition={{ duration: 0.8, repeat: 2 }}
              className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full"
            >
              +{gift.giftValue}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
