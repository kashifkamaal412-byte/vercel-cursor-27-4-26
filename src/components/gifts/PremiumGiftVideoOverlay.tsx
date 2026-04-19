import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGiftAnimation } from "@/contexts/GiftAnimationContext";
import { premiumGiftVideoMap } from "@/data/giftData";

// Cinematic particles
const CinematicParticles = ({ color, count = 40 }: { color: string; count?: number }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 3,
        delay: Math.random() * 1,
        duration: Math.random() * 2 + 1.5,
      })),
    [count]
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          initial={{ x: "50%", y: "50%", scale: 0, opacity: 0 }}
          animate={{
            x: `${p.x}%`,
            y: `${p.y}%`,
            scale: [0, 1.5, 0],
            opacity: [0, 1, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          style={{
            width: p.size,
            height: p.size,
            background: color,
            boxShadow: `0 0 ${p.size * 4}px ${color}`,
          }}
        />
      ))}
    </div>
  );
};

// Floating emoji ring effect for free gifts
const FloatingEmojiRing = ({ emoji, count = 8 }: { emoji: string; count?: number }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const radius = 35;
        return (
          <motion.span
            key={i}
            className="absolute text-4xl md:text-5xl"
            style={{ left: "50%", top: "50%" }}
            initial={{ 
              x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 
            }}
            animate={{
              x: [0, Math.cos(angle) * radius * 4, Math.cos(angle + 0.5) * radius * 5],
              y: [0, Math.sin(angle) * radius * 4, Math.sin(angle + 0.5) * radius * 5 - 50],
              scale: [0, 1.2, 0.6],
              opacity: [0, 1, 0],
              rotate: [0, 180 + i * 30, 360],
            }}
            transition={{ 
              duration: 2.5, 
              delay: 0.2 + i * 0.08, 
              ease: "easeOut" 
            }}
          >
            {emoji}
          </motion.span>
        );
      })}
    </div>
  );
};

// Get config for premium gifts
const getPremiumEmojiConfig = (giftId: string) => {
  if (giftId.includes("lion")) return { particleColor: "hsl(40 90% 50%)", glow: "hsl(35 80% 50% / 0.6)", secondaryEmoji: "🔥", shakeIntensity: 12 };
  if (giftId.includes("dragon")) return { particleColor: "hsl(15 90% 55%)", glow: "hsl(15 80% 50% / 0.6)", secondaryEmoji: "🔥", shakeIntensity: 15 };
  if (giftId.includes("jet") || giftId.includes("plane")) return { particleColor: "hsl(200 70% 60%)", glow: "hsl(200 60% 50% / 0.5)", secondaryEmoji: "☁️", shakeIntensity: 0 };
  if (giftId.includes("car") || giftId.includes("lambo") || giftId.includes("supercar")) return { particleColor: "hsl(0 80% 55%)", glow: "hsl(0 70% 50% / 0.5)", secondaryEmoji: "💨", shakeIntensity: 8 };
  if (giftId.includes("yacht")) return { particleColor: "hsl(200 80% 60%)", glow: "hsl(200 70% 50% / 0.4)", secondaryEmoji: "🌊", shakeIntensity: 0 };
  if (giftId.includes("rocket") || giftId.includes("space")) return { particleColor: "hsl(25 90% 55%)", glow: "hsl(25 80% 50% / 0.6)", secondaryEmoji: "💨", shakeIntensity: 10 };
  if (giftId.includes("pegasus")) return { particleColor: "hsl(280 70% 65%)", glow: "hsl(280 60% 55% / 0.6)", secondaryEmoji: "✨", shakeIntensity: 0 };
  if (giftId.includes("treasure")) return { particleColor: "hsl(45 100% 50%)", glow: "hsl(45 90% 50% / 0.7)", secondaryEmoji: "💰", shakeIntensity: 8 };
  if (giftId.includes("castle")) return { particleColor: "hsl(200 80% 70%)", glow: "hsl(200 70% 60% / 0.6)", secondaryEmoji: "✨", shakeIntensity: 6 };
  if (giftId.includes("robot")) return { particleColor: "hsl(200 60% 60%)", glow: "hsl(200 50% 55% / 0.5)", secondaryEmoji: "⚡", shakeIntensity: 0 };
  if (giftId.includes("diamond")) return { particleColor: "hsl(195 80% 70%)", glow: "hsl(195 70% 60% / 0.6)", secondaryEmoji: "💎", shakeIntensity: 0 };
  if (giftId.includes("throne")) return { particleColor: "hsl(45 80% 55%)", glow: "hsl(45 70% 50% / 0.5)", secondaryEmoji: "👑", shakeIntensity: 0 };
  if (giftId.includes("crown")) return { particleColor: "hsl(45 90% 55%)", glow: "hsl(45 80% 50% / 0.5)", secondaryEmoji: "✨", shakeIntensity: 0 };
  if (giftId.includes("watch")) return { particleColor: "hsl(40 80% 55%)", glow: "hsl(40 70% 50% / 0.4)", secondaryEmoji: "⌚", shakeIntensity: 0 };
  if (giftId.includes("glamour")) return { particleColor: "hsl(50 80% 55%)", glow: "hsl(50 70% 50% / 0.5)", secondaryEmoji: "🥂", shakeIntensity: 0 };
  if (giftId.includes("handbag")) return { particleColor: "hsl(330 60% 55%)", glow: "hsl(330 50% 50% / 0.4)", secondaryEmoji: "✨", shakeIntensity: 0 };
  if (giftId.includes("rose") || giftId.includes("golden")) return { particleColor: "hsl(45 90% 55%)", glow: "hsl(45 80% 50% / 0.5)", secondaryEmoji: "🌹", shakeIntensity: 0 };
  if (giftId.includes("heart")) return { particleColor: "hsl(45 90% 55%)", glow: "hsl(45 80% 50% / 0.5)", secondaryEmoji: "💛", shakeIntensity: 0 };
  return { particleColor: "hsl(45 90% 55%)", glow: "hsl(45 80% 50% / 0.5)", secondaryEmoji: "✨", shakeIntensity: 0 };
};

// FREE gift animation configs - each free gift gets unique visual
const getFreeGiftConfig = (giftId: string) => {
  const configs: Record<string, { particleColor: string; glow: string; bgGradient: string; animStyle: string }> = {
    f_rose: { particleColor: "hsl(350 80% 60%)", glow: "hsl(350 70% 55% / 0.5)", bgGradient: "from-rose-500/20 to-pink-600/10", animStyle: "float" },
    f_teddy: { particleColor: "hsl(30 70% 55%)", glow: "hsl(30 60% 50% / 0.4)", bgGradient: "from-amber-500/15 to-orange-600/10", animStyle: "bounce" },
    f_hearts: { particleColor: "hsl(340 80% 60%)", glow: "hsl(340 70% 55% / 0.5)", bgGradient: "from-pink-500/20 to-rose-600/10", animStyle: "float" },
    f_star: { particleColor: "hsl(45 90% 55%)", glow: "hsl(45 80% 50% / 0.5)", bgGradient: "from-yellow-500/20 to-amber-600/10", animStyle: "sparkle" },
    f_giftbox: { particleColor: "hsl(280 60% 60%)", glow: "hsl(280 50% 55% / 0.4)", bgGradient: "from-purple-500/15 to-violet-600/10", animStyle: "bounce" },
    f_money: { particleColor: "hsl(140 70% 50%)", glow: "hsl(140 60% 45% / 0.4)", bgGradient: "from-green-500/15 to-emerald-600/10", animStyle: "float" },
    f_pinkcar: { particleColor: "hsl(330 70% 60%)", glow: "hsl(330 60% 55% / 0.4)", bgGradient: "from-pink-500/15 to-fuchsia-600/10", animStyle: "zoom" },
    f_cake: { particleColor: "hsl(20 80% 60%)", glow: "hsl(20 70% 55% / 0.4)", bgGradient: "from-orange-500/15 to-amber-600/10", animStyle: "bounce" },
    f_books: { particleColor: "hsl(220 60% 55%)", glow: "hsl(220 50% 50% / 0.3)", bgGradient: "from-blue-500/15 to-indigo-600/10", animStyle: "float" },
    f_balloons: { particleColor: "hsl(200 70% 60%)", glow: "hsl(200 60% 55% / 0.4)", bgGradient: "from-sky-500/15 to-blue-600/10", animStyle: "float" },
    f_puppy: { particleColor: "hsl(30 60% 50%)", glow: "hsl(30 50% 45% / 0.4)", bgGradient: "from-amber-500/10 to-yellow-600/10", animStyle: "bounce" },
    f_candy: { particleColor: "hsl(300 60% 60%)", glow: "hsl(300 50% 55% / 0.4)", bgGradient: "from-fuchsia-500/15 to-pink-600/10", animStyle: "sparkle" },
    f_ring: { particleColor: "hsl(45 90% 60%)", glow: "hsl(45 80% 55% / 0.5)", bgGradient: "from-yellow-500/20 to-amber-600/10", animStyle: "sparkle" },
    f_angel: { particleColor: "hsl(210 60% 70%)", glow: "hsl(210 50% 65% / 0.4)", bgGradient: "from-sky-400/15 to-blue-500/10", animStyle: "float" },
    f_dolphin: { particleColor: "hsl(195 70% 55%)", glow: "hsl(195 60% 50% / 0.4)", bgGradient: "from-cyan-500/15 to-teal-600/10", animStyle: "zoom" },
    f_unicorn: { particleColor: "hsl(280 70% 65%)", glow: "hsl(280 60% 60% / 0.5)", bgGradient: "from-violet-500/15 to-purple-600/10", animStyle: "sparkle" },
    f_crown: { particleColor: "hsl(45 90% 55%)", glow: "hsl(45 80% 50% / 0.5)", bgGradient: "from-yellow-500/20 to-amber-600/10", animStyle: "sparkle" },
    f_treasure: { particleColor: "hsl(45 80% 50%)", glow: "hsl(45 70% 45% / 0.4)", bgGradient: "from-amber-500/15 to-yellow-600/10", animStyle: "sparkle" },
    f_gem: { particleColor: "hsl(195 80% 65%)", glow: "hsl(195 70% 60% / 0.5)", bgGradient: "from-cyan-500/15 to-sky-600/10", animStyle: "sparkle" },
    f_corgi: { particleColor: "hsl(35 70% 55%)", glow: "hsl(35 60% 50% / 0.4)", bgGradient: "from-orange-400/15 to-amber-500/10", animStyle: "bounce" },
    f_mic: { particleColor: "hsl(0 0% 70%)", glow: "hsl(0 0% 65% / 0.3)", bgGradient: "from-gray-400/15 to-slate-500/10", animStyle: "bounce" },
    f_heartnecklace: { particleColor: "hsl(0 80% 55%)", glow: "hsl(0 70% 50% / 0.5)", bgGradient: "from-red-500/20 to-rose-600/10", animStyle: "sparkle" },
    f_sword: { particleColor: "hsl(220 50% 55%)", glow: "hsl(220 40% 50% / 0.4)", bgGradient: "from-slate-500/15 to-gray-600/10", animStyle: "shake" },
    f_rocket: { particleColor: "hsl(25 80% 55%)", glow: "hsl(25 70% 50% / 0.5)", bgGradient: "from-orange-500/15 to-red-600/10", animStyle: "zoom" },
    f_panda: { particleColor: "hsl(0 0% 55%)", glow: "hsl(0 0% 50% / 0.3)", bgGradient: "from-gray-400/10 to-slate-500/10", animStyle: "bounce" },
    f_strawberry: { particleColor: "hsl(350 80% 55%)", glow: "hsl(350 70% 50% / 0.4)", bgGradient: "from-red-500/15 to-pink-600/10", animStyle: "float" },
    f_champagne: { particleColor: "hsl(45 80% 60%)", glow: "hsl(45 70% 55% / 0.4)", bgGradient: "from-yellow-400/15 to-amber-500/10", animStyle: "sparkle" },
    f_dog: { particleColor: "hsl(30 50% 50%)", glow: "hsl(30 40% 45% / 0.3)", bgGradient: "from-amber-400/10 to-orange-500/10", animStyle: "bounce" },
    f_magic: { particleColor: "hsl(270 70% 60%)", glow: "hsl(270 60% 55% / 0.5)", bgGradient: "from-purple-500/15 to-indigo-600/10", animStyle: "sparkle" },
    f_flower: { particleColor: "hsl(330 60% 60%)", glow: "hsl(330 50% 55% / 0.4)", bgGradient: "from-pink-400/15 to-rose-500/10", animStyle: "float" },
  };
  return configs[giftId] || { particleColor: "hsl(280 60% 60%)", glow: "hsl(280 50% 55% / 0.4)", bgGradient: "from-purple-500/15 to-violet-600/10", animStyle: "bounce" };
};

// Free gift main emoji animation variants
const getFreeAnimVariants = (style: string) => {
  switch (style) {
    case "float":
      return {
        initial: { scale: 0, y: 100, opacity: 0 },
        animate: { scale: [0, 1.8, 1.4, 1.5, 1.4], y: [100, -30, 0, -15, 0], opacity: 1 },
      };
    case "bounce":
      return {
        initial: { scale: 0, y: -100, opacity: 0 },
        animate: { scale: [0, 2, 1.5, 1.7, 1.5], y: [-100, 20, -10, 5, 0], opacity: 1 },
      };
    case "zoom":
      return {
        initial: { scale: 0, x: -200, opacity: 0 },
        animate: { scale: [0, 2.2, 1.6, 1.8, 1.6], x: [-200, 30, 0], opacity: 1 },
      };
    case "shake":
      return {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: [0, 1.8, 1.5], x: [0, -15, 15, -10, 10, 0], opacity: 1 },
      };
    case "sparkle":
    default:
      return {
        initial: { scale: 0, opacity: 0, rotate: -30 },
        animate: { scale: [0, 2, 1.5, 1.7, 1.5], opacity: 1, rotate: [-30, 15, -10, 0] },
      };
  }
};

export const PremiumGiftVideoOverlay = () => {
  const { activeGift, clearGiftAnimation } = useGiftAnimation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const duckedElements = useRef<{ el: HTMLMediaElement; prevVolume: number }[]>([]);

  const gift = activeGift?.gift ?? null;
  const senderName = activeGift?.senderName ?? "";
  const quantity = activeGift?.quantity ?? 1;

  const videoUrl = gift ? premiumGiftVideoMap[gift.id] : null;
  const hasVideo = !!gift && !!videoUrl;
  const isPremium = gift?.isPremium ?? false;
  const shouldPlay = !!gift;

  const premiumConfig = gift && isPremium ? getPremiumEmojiConfig(gift.id) : null;
  const freeConfig = gift && !isPremium ? getFreeGiftConfig(gift.id) : null;

  const duckBackgroundAudio = useCallback(() => {
    const mediaEls = document.querySelectorAll<HTMLMediaElement>("video, audio");
    duckedElements.current = [];
    mediaEls.forEach((el) => {
      if (el === videoRef.current) return;
      if (!el.paused && el.volume > 0) {
        duckedElements.current.push({ el, prevVolume: el.volume });
        el.volume = Math.max(el.volume * 0.1, 0);
      }
    });
  }, []);

  const restoreBackgroundAudio = useCallback(() => {
    duckedElements.current.forEach(({ el, prevVolume }) => {
      try { el.volume = prevVolume; } catch {}
    });
    duckedElements.current = [];
  }, []);

  useEffect(() => {
    if (!shouldPlay) {
      setVisible(false);
      return;
    }
    setVisible(true);
    duckBackgroundAudio();

    if (hasVideo) {
      const v = videoRef.current;
      if (v) {
        v.currentTime = 0;
        v.play().catch(() => {});
      }
    }
  }, [shouldPlay, gift?.id, duckBackgroundAudio, hasVideo]);

  const handleEnd = useCallback(() => {
    setVisible(false);
    restoreBackgroundAudio();
    clearGiftAnimation();
  }, [restoreBackgroundAudio, clearGiftAnimation]);

  // Auto-dismiss for emoji-only animations
  useEffect(() => {
    if (!visible || hasVideo) return;
    const dur = isPremium
      ? (gift?.animationDuration ? gift.animationDuration * 1000 : 6000)
      : 3500; // Free gifts: shorter but still impactful
    const t = setTimeout(handleEnd, dur);
    return () => clearTimeout(t);
  }, [visible, hasVideo, handleEnd, gift?.animationDuration, isPremium]);

  // Safety timeout for video
  useEffect(() => {
    if (!visible || !hasVideo) return;
    const t = setTimeout(handleEnd, 15000);
    return () => clearTimeout(t);
  }, [visible, hasVideo, handleEnd]);

  if (!shouldPlay) return null;

  const activeConfig = premiumConfig || freeConfig;
  const particleColor = premiumConfig?.particleColor || freeConfig?.particleColor || "hsl(280 60% 60%)";
  const glowColor = premiumConfig?.glow || freeConfig?.glow || "hsl(280 50% 55% / 0.4)";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`gift-${gift!.id}-${Date.now()}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] pointer-events-none"
          style={{ width: "100vw", height: "100vh", top: 0, left: 0 }}
        >
          {/* Backdrop */}
          <motion.div 
            className={`absolute inset-0 ${isPremium ? "bg-black/60" : "bg-black/40"}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />

          {/* Radial glow */}
          <motion.div
            className="absolute inset-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              background: `radial-gradient(circle at 50% 50%, ${glowColor} 0%, transparent 70%)`,
            }}
          />

          {/* Particles */}
          <CinematicParticles color={particleColor} count={isPremium ? 50 : 30} />

          {hasVideo ? (
            /* ─── MP4 Video Mode (Premium only) ─── */
            <div className="absolute inset-0 z-30 flex items-center justify-center">
              <video
                ref={videoRef}
                src={videoUrl!}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted={false}
                onEnded={handleEnd}
                onError={handleEnd}
              />
            </div>
          ) : isPremium ? (
            /* ─── Premium Emoji Cinematic Mode ─── */
            <motion.div
              className="absolute inset-0 z-30 flex items-center justify-center"
              animate={
                premiumConfig?.shakeIntensity
                  ? {
                      x: [0, -premiumConfig.shakeIntensity, premiumConfig.shakeIntensity, -premiumConfig.shakeIntensity / 2, 0],
                      y: [0, premiumConfig.shakeIntensity / 2, -premiumConfig.shakeIntensity / 2, 0],
                    }
                  : {}
              }
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <motion.span
                className="text-[10rem] md:text-[14rem] filter drop-shadow-2xl"
                initial={{ scale: 0, opacity: 0, rotate: -30 }}
                animate={{ scale: [0, 1.5, 1.2, 1.3, 1.2], opacity: 1, rotate: [-30, 10, -5, 0] }}
                transition={{ duration: 2, ease: "easeOut" }}
                style={{ filter: `drop-shadow(0 0 60px ${glowColor})` }}
              >
                {gift!.emoji}
              </motion.span>

              {premiumConfig?.secondaryEmoji && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {Array.from({ length: 12 }, (_, i) => (
                    <motion.span
                      key={i}
                      className="absolute text-5xl md:text-6xl"
                      initial={{ x: `${20 + Math.random() * 60}%`, y: `${20 + Math.random() * 60}%`, opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], y: `${Math.random() * 80}%`, x: `${Math.random() * 100}%` }}
                      transition={{ duration: 2.5, delay: 0.3 + i * 0.2, ease: "easeOut" }}
                    >
                      {premiumConfig.secondaryEmoji}
                    </motion.span>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            /* ─── FREE Gift Fullscreen Animation ─── */
            <motion.div className="absolute inset-0 z-30 flex items-center justify-center">
              {/* Floating emoji ring */}
              <FloatingEmojiRing emoji={gift!.emoji} count={10} />

              {/* Main emoji with unique animation per gift type */}
              <motion.span
                className="text-[8rem] md:text-[11rem] filter drop-shadow-2xl"
                {...getFreeAnimVariants(freeConfig?.animStyle || "bounce")}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{ filter: `drop-shadow(0 0 40px ${glowColor})` }}
              >
                {gift!.emoji}
              </motion.span>
            </motion.div>
          )}

          {/* Sender info banner */}
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 200, delay: 0.4 }}
            className="absolute bottom-28 left-3 right-3 z-50 flex items-center gap-3 rounded-2xl px-5 py-4"
            style={{
              background: "linear-gradient(135deg, hsl(0 0% 0% / 0.8) 0%, hsl(40 30% 8% / 0.9) 100%)",
              border: isPremium ? "1px solid hsl(40 80% 50% / 0.4)" : "1px solid hsl(280 50% 50% / 0.3)",
              backdropFilter: "blur(16px)",
              boxShadow: isPremium 
                ? "0 8px 32px hsl(0 0% 0% / 0.5), 0 0 60px hsl(40 80% 50% / 0.15)"
                : "0 8px 32px hsl(0 0% 0% / 0.5), 0 0 40px hsl(280 50% 50% / 0.1)",
            }}
          >
            <motion.span
              className="text-5xl"
              animate={{ scale: [1, 1.4, 1], rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.6, repeat: isPremium ? 4 : 2 }}
            >
              {gift!.emoji}
            </motion.span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: "hsl(0 0% 85%)" }}>
                {senderName || "Someone"}
              </p>
              <p className="text-base font-semibold" style={{ color: isPremium ? "hsl(40 80% 55%)" : "hsl(280 60% 70%)" }}>
                sent {gift!.name} {quantity > 1 ? `× ${quantity}` : ""}
              </p>
            </div>

            {/* Badge - shows "Free" or coin value */}
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: 2 }}
              className="px-4 py-1.5 rounded-full text-sm font-bold"
              style={isPremium ? {
                background: "linear-gradient(135deg, hsl(45 90% 55%) 0%, hsl(35 85% 45%) 100%)",
                color: "hsl(30 20% 8%)",
                boxShadow: "0 4px 16px hsl(45 90% 55% / 0.4)",
              } : {
                background: "linear-gradient(135deg, hsl(280 60% 55%) 0%, hsl(320 50% 50%) 100%)",
                color: "hsl(0 0% 100%)",
                boxShadow: "0 4px 16px hsl(280 60% 55% / 0.3)",
              }}
            >
              {isPremium ? `+${(gift!.value * quantity).toLocaleString()}` : "Free Gift"}
            </motion.div>
          </motion.div>

          {/* Gift name title - top center */}
          <motion.div
            className="absolute top-16 left-0 right-0 z-50 text-center"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, type: "spring", damping: 15 }}
          >
            <motion.p
              className="text-2xl md:text-3xl font-black tracking-wide"
              style={{
                color: isPremium ? "hsl(40 80% 60%)" : "hsl(280 60% 70%)",
                textShadow: `0 0 30px ${isPremium ? "hsl(40 80% 50% / 0.6)" : "hsl(280 60% 55% / 0.5)"}, 0 4px 8px hsl(0 0% 0% / 0.5)`,
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {gift!.name}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
