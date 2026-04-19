import { motion, AnimatePresence } from "framer-motion";
import { Gift } from "@/data/giftData";
import { useEffect, useState, useMemo } from "react";

interface GiftAnimationProps {
  gift: Gift | null;
  senderName?: string;
  onComplete: () => void;
}

// Cinematic particle system for premium gifts
const CinematicParticles = ({ color, count = 30 }: { color: string; count?: number }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 6 + 2,
        delay: Math.random() * 0.8,
        duration: Math.random() * 2 + 1.5,
      })),
    [count]
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          initial={{ x: "50vw", y: "50vh", scale: 0, opacity: 0 }}
          animate={{
            x: `${p.x}vw`,
            y: `${p.y}vh`,
            scale: [0, 1.2, 0],
            opacity: [0, 0.9, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          style={{
            width: p.size,
            height: p.size,
            background: color,
            boxShadow: `0 0 ${p.size * 3}px ${color}`,
          }}
        />
      ))}
    </div>
  );
};

// Screen shake effect
const ScreenShake = ({ intensity = 5, children }: { intensity?: number; children: React.ReactNode }) => (
  <motion.div
    animate={{
      x: [0, -intensity, intensity, -intensity / 2, intensity / 2, 0],
      y: [0, intensity / 2, -intensity / 2, intensity / 3, 0],
    }}
    transition={{ duration: 0.6, delay: 0.3, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

// Get cinematic animation config per gift type
const getCinematicConfig = (gift: Gift) => {
  const id = gift.id;

  // Lion - walks in and roars
  if (id.includes("lion")) {
    return {
      emoji: gift.emoji,
      main: {
        initial: { x: "-100vw", scale: 2, opacity: 0 },
        animate: { x: ["100vw", "0vw", "0vw", "0vw"], scale: [2, 2.5, 3, 2.5], opacity: 1 },
        transition: { duration: 4, times: [0, 0.4, 0.7, 1], ease: "easeInOut" },
      },
      shake: true,
      shakeIntensity: 12,
      particleColor: "hsl(40 90% 50%)",
      particleCount: 40,
      duration: 7000,
      glow: "hsl(35 80% 50% / 0.5)",
      secondaryEmoji: "🔥",
    };
  }

  // Dragon - fire breathing
  if (id.includes("dragon")) {
    return {
      emoji: gift.emoji,
      main: {
        initial: { y: "-100vh", scale: 0, rotate: -30, opacity: 0 },
        animate: {
          y: ["-50vh", "0vh", "0vh", "0vh"],
          scale: [0.5, 2, 2.8, 2.2],
          rotate: [-30, 0, 10, 0],
          opacity: 1,
        },
        transition: { duration: 4.5, ease: "easeOut" },
      },
      shake: true,
      shakeIntensity: 15,
      particleColor: "hsl(15 90% 55%)",
      particleCount: 50,
      duration: 7000,
      glow: "hsl(15 80% 50% / 0.5)",
      secondaryEmoji: "🔥",
    };
  }

  // Jets / planes - fly across
  if (id.includes("jet") || id.includes("plane")) {
    return {
      emoji: gift.emoji,
      main: {
        initial: { x: "-120vw", y: "30vh", scale: 1.5, rotate: -10, opacity: 0 },
        animate: {
          x: ["-120vw", "0vw", "120vw"],
          y: ["30vh", "-5vh", "-30vh"],
          scale: [1.5, 2.5, 1.5],
          rotate: [-10, 0, 10],
          opacity: [0, 1, 0],
        },
        transition: { duration: 4, ease: "easeInOut" },
      },
      shake: false,
      particleColor: "hsl(200 70% 60%)",
      particleCount: 35,
      duration: 6000,
      glow: "hsl(200 60% 50% / 0.4)",
      trail: true,
    };
  }

  // Cars - drive across with lighting
  if (id.includes("car") || id.includes("lambo") || id.includes("supercar")) {
    return {
      emoji: gift.emoji,
      main: {
        initial: { x: "-120vw", y: "10vh", scale: 2, opacity: 0 },
        animate: {
          x: ["-120vw", "-20vw", "0vw", "0vw", "120vw"],
          y: ["10vh", "10vh", "10vh", "10vh", "10vh"],
          scale: [2, 2.5, 3, 3, 2],
          opacity: [0, 1, 1, 1, 0],
        },
        transition: { duration: 4.5, times: [0, 0.25, 0.5, 0.75, 1], ease: "easeInOut" },
      },
      shake: true,
      shakeIntensity: 6,
      particleColor: "hsl(0 80% 55%)",
      particleCount: 25,
      duration: 6000,
      glow: "hsl(0 70% 50% / 0.4)",
    };
  }

  // Yacht - sails majestically
  if (id.includes("yacht")) {
    return {
      emoji: gift.emoji,
      main: {
        initial: { x: "120vw", scale: 2, opacity: 0 },
        animate: {
          x: ["120vw", "0vw", "0vw", "-120vw"],
          scale: [2, 2.5, 2.5, 2],
          opacity: [0, 1, 1, 0],
        },
        transition: { duration: 5, ease: "easeInOut" },
      },
      shake: false,
      particleColor: "hsl(200 80% 60%)",
      particleCount: 20,
      duration: 6000,
      glow: "hsl(200 70% 50% / 0.3)",
    };
  }

  // Rocket - blast off
  if (id.includes("rocket") || id.includes("space")) {
    return {
      emoji: gift.emoji,
      main: {
        initial: { y: "100vh", scale: 2, opacity: 0 },
        animate: {
          y: ["100vh", "0vh", "0vh", "-100vh"],
          scale: [2, 3, 3, 2],
          opacity: [0, 1, 1, 0],
          rotate: [0, 0, 5, 0],
        },
        transition: { duration: 4, ease: "easeIn" },
      },
      shake: true,
      shakeIntensity: 10,
      particleColor: "hsl(25 90% 55%)",
      particleCount: 45,
      duration: 7000,
      glow: "hsl(25 80% 50% / 0.5)",
      secondaryEmoji: "💨",
    };
  }

  // Pegasus - flies majestically
  if (id.includes("pegasus")) {
    return {
      emoji: "🦄",
      main: {
        initial: { x: "-100vw", y: "20vh", scale: 2, opacity: 0 },
        animate: {
          x: ["-100vw", "0vw", "0vw", "100vw"],
          y: ["20vh", "-10vh", "0vh", "-30vh"],
          scale: [2, 3, 3.5, 2.5],
          opacity: [0, 1, 1, 0],
        },
        transition: { duration: 6, ease: "easeInOut" },
      },
      shake: false,
      particleColor: "hsl(280 70% 65%)",
      particleCount: 40,
      duration: 8000,
      glow: "hsl(280 60% 55% / 0.5)",
      secondaryEmoji: "✨",
    };
  }

  // Treasure chest
  if (id.includes("treasure")) {
    return {
      emoji: gift.emoji,
      main: {
        initial: { y: "50vh", scale: 0, rotate: -20, opacity: 0 },
        animate: {
          y: ["50vh", "0vh", "0vh"],
          scale: [0, 3, 2.5],
          rotate: [-20, 0, 0],
          opacity: 1,
        },
        transition: { duration: 3, ease: "easeOut" },
      },
      shake: true,
      shakeIntensity: 8,
      particleColor: "hsl(45 100% 50%)",
      particleCount: 60,
      duration: 8000,
      glow: "hsl(45 90% 50% / 0.6)",
      secondaryEmoji: "💰",
    };
  }

  // Castle
  if (id.includes("castle")) {
    return {
      emoji: gift.emoji,
      main: {
        initial: { y: "100vh", scale: 0, opacity: 0 },
        animate: {
          y: ["100vh", "0vh"],
          scale: [0, 3],
          opacity: 1,
        },
        transition: { duration: 3.5, ease: "easeOut" },
      },
      shake: true,
      shakeIntensity: 6,
      particleColor: "hsl(200 80% 70%)",
      particleCount: 35,
      duration: 7000,
      glow: "hsl(200 70% 60% / 0.5)",
    };
  }

  // Robot butler
  if (id.includes("robot")) {
    return {
      emoji: gift.emoji,
      main: {
        initial: { x: "100vw", scale: 2, opacity: 0 },
        animate: {
          x: ["100vw", "0vw"],
          scale: [2, 2.5],
          opacity: 1,
        },
        transition: { duration: 2.5, ease: "easeOut" },
      },
      shake: false,
      particleColor: "hsl(200 60% 60%)",
      particleCount: 20,
      duration: 6000,
      glow: "hsl(200 50% 55% / 0.4)",
    };
  }

  // Default for sparkle-type premium gifts
  return {
    emoji: gift.emoji,
    main: {
      initial: { scale: 0, opacity: 0, rotate: -45 },
      animate: {
        scale: [0, 2.5, 2, 2.2, 2],
        opacity: 1,
        rotate: [-45, 0, 15, -15, 0],
      },
      transition: { duration: 2, ease: "easeOut" },
    },
    shake: false,
    particleColor: "hsl(45 90% 55%)",
    particleCount: 25,
    duration: gift.animationDuration ? gift.animationDuration * 1000 : gift.isPremium ? 5000 : 2500,
    glow: "hsl(45 80% 50% / 0.4)",
  };
};

// Standard (non-cinematic) animation for simple gifts
const getStandardVariants = (type: Gift["animationType"]) => {
  const map: Record<string, any> = {
    bounce: {
      initial: { scale: 0, y: 100, opacity: 0 },
      animate: { scale: [0, 1.8, 1.4, 1.6, 1.4], y: [100, -20, 0, -10, 0], opacity: 1 },
      exit: { scale: 0, opacity: 0, y: -50 },
    },
    float: {
      initial: { scale: 0, y: 200, opacity: 0 },
      animate: { scale: [0, 1.6, 1.4], y: [200, -30, 0], opacity: 1 },
      exit: { y: -100, opacity: 0, scale: 0.5 },
    },
    spin: {
      initial: { scale: 0, rotate: 0, opacity: 0 },
      animate: { scale: [0, 1.8, 1.4], rotate: [0, 360, 720], opacity: 1 },
      exit: { scale: 0, rotate: 1080, opacity: 0 },
    },
    shake: {
      initial: { scale: 0, x: 0, opacity: 0 },
      animate: { scale: [0, 1.6, 1.4], x: [0, -20, 20, -15, 15, -10, 10, 0], opacity: 1 },
      exit: { scale: 0, opacity: 0 },
    },
    zoom: {
      initial: { scale: 0, x: -200, opacity: 0 },
      animate: { scale: [0.5, 2, 1.6], x: [-200, 50, 0], opacity: 1 },
      exit: { x: 200, opacity: 0, scale: 0.5 },
    },
    sparkle: {
      initial: { scale: 0, opacity: 0, rotate: -45 },
      animate: { scale: [0, 2, 1.6, 1.8, 1.6], opacity: 1, rotate: [-45, 0, 15, -15, 0] },
      exit: { scale: 2.5, opacity: 0 },
    },
  };
  return map[type] || map.bounce;
};

export const GiftAnimation = ({ gift, senderName, onComplete }: GiftAnimationProps) => {
  const [phase, setPhase] = useState<"playing" | "done">("playing");

  useEffect(() => {
    if (!gift) return;
    setPhase("playing");

    const isCinematic = gift.animationType === "cinematic";
    const config = isCinematic ? getCinematicConfig(gift) : null;
    const dur = config?.duration || (gift.isPremium ? 5000 : 2500);

    const timer = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, dur);
    return () => clearTimeout(timer);
  }, [gift, onComplete]);

  if (!gift || phase === "done") return null;

  const isCinematic = gift.animationType === "cinematic";

  if (isCinematic) {
    const config = getCinematicConfig(gift);
    const content = (
      <motion.div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
        {/* Backdrop glow */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          exit={{ opacity: 0 }}
          style={{
            background: `radial-gradient(circle at center, ${config.glow} 0%, transparent 60%)`,
          }}
        />

        {/* Particles */}
        <CinematicParticles color={config.particleColor} count={config.particleCount} />

        {/* Secondary emojis (fire, smoke, sparkles etc.) */}
        {config.secondaryEmoji && (
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 8 }, (_, i) => (
              <motion.span
                key={i}
                className="absolute text-4xl"
                initial={{
                  x: `${30 + Math.random() * 40}vw`,
                  y: `${30 + Math.random() * 40}vh`,
                  opacity: 0,
                  scale: 0,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  y: `${Math.random() * 80}vh`,
                }}
                transition={{ duration: 2, delay: 0.5 + i * 0.2, ease: "easeOut" }}
              >
                {config.secondaryEmoji}
              </motion.span>
            ))}
          </div>
        )}

        {/* Main emoji */}
        <motion.div
          className="flex flex-col items-center"
          initial={config.main.initial}
          animate={config.main.animate}
          transition={config.main.transition as any}
        >
          <span className="text-8xl md:text-9xl filter drop-shadow-2xl">{config.emoji}</span>
        </motion.div>

        {/* Gift info */}
        <motion.div
          className="absolute bottom-24 left-0 right-0 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
        >
          <p className="text-xl font-bold" style={{ color: "hsl(40 80% 60%)" }}>{gift.name}</p>
          {senderName && (
            <p className="text-sm mt-1" style={{ color: "hsl(40 30% 60%)" }}>
              from <span className="font-semibold" style={{ color: "hsl(40 60% 80%)" }}>{senderName}</span>
            </p>
          )}
          <motion.span
            className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold"
            style={{
              background: "hsl(40 80% 50% / 0.2)",
              color: "hsl(40 80% 55%)",
              border: "1px solid hsl(40 80% 50% / 0.3)",
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 2, type: "spring" }}
          >
            {formatNumber(gift.value)} PKR
          </motion.span>
        </motion.div>
      </motion.div>
    );

    return (
      <AnimatePresence>
        {config.shake ? <ScreenShake intensity={config.shakeIntensity || 8}>{content}</ScreenShake> : content}
      </AnimatePresence>
    );
  }

  // Standard animation for non-cinematic gifts
  const variants = getStandardVariants(gift.animationType);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Subtle backdrop */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          style={{
            background: gift.isPremium
              ? "radial-gradient(circle at center, hsl(45 100% 50% / 0.25) 0%, transparent 55%)"
              : "radial-gradient(circle at center, hsl(280 70% 60% / 0.15) 0%, transparent 45%)",
          }}
        />

        {/* Sparkle particles */}
        {gift.isPremium && <CinematicParticles color="hsl(45 90% 55%)" count={20} />}

        {/* Main gift */}
        <motion.div
          className="flex flex-col items-center"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: gift.isPremium ? 1.5 : 0.8, ease: "easeOut" }}
        >
          <motion.span
            className="text-8xl md:text-9xl filter drop-shadow-2xl"
            animate={
              gift.isPremium
                ? {
                    filter: [
                      "drop-shadow(0 0 20px hsl(45 100% 60%))",
                      "drop-shadow(0 0 40px hsl(45 100% 60%))",
                      "drop-shadow(0 0 20px hsl(45 100% 60%))",
                    ],
                  }
                : undefined
            }
            transition={{ repeat: Infinity, duration: 1 }}
          >
            {gift.emoji}
          </motion.span>
          <motion.div
            className="mt-4 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-xl font-bold" style={{ color: gift.isPremium ? "hsl(40 80% 60%)" : "hsl(0 0% 95%)" }}>
              {gift.name}
            </p>
            {senderName && (
              <p className="text-sm mt-1" style={{ color: "hsl(0 0% 60%)" }}>
                from <span className="font-medium" style={{ color: "hsl(0 0% 90%)" }}>{senderName}</span>
              </p>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(0) + "K";
  return num.toLocaleString();
};
