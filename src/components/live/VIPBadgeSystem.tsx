import { motion, AnimatePresence } from "framer-motion";
import { Crown, Star, Gem, Sparkles, Shield, Flame, Zap, Heart } from "lucide-react";

// VIP Level badge config
export interface ViewerLevel {
  level: number;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  minGifts: number;
}

export const VIEWER_LEVELS: ViewerLevel[] = [
  { level: 1, name: "New", color: "text-white/60", bgColor: "bg-white/5", borderColor: "border-white/10", icon: Star, minGifts: 0 },
  { level: 2, name: "Fan", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", icon: Heart, minGifts: 10 },
  { level: 3, name: "Super Fan", color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30", icon: Sparkles, minGifts: 50 },
  { level: 4, name: "VIP", color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", icon: Crown, minGifts: 200 },
  { level: 5, name: "Diamond", color: "text-cyan-400", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30", icon: Gem, minGifts: 500 },
  { level: 6, name: "Legend", color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", icon: Flame, minGifts: 1000 },
];

export const getViewerLevel = (totalGifts: number): ViewerLevel => {
  return [...VIEWER_LEVELS].reverse().find(l => totalGifts >= l.minGifts) || VIEWER_LEVELS[0];
};

// VIP Badge Component
interface VIPBadgeProps {
  totalGifts: number;
  size?: "sm" | "md" | "lg";
}

export const VIPBadge = ({ totalGifts, size = "sm" }: VIPBadgeProps) => {
  const level = getViewerLevel(totalGifts);
  const Icon = level.icon;

  const sizeClasses = {
    sm: "h-4 px-1.5 text-[8px] gap-0.5",
    md: "h-5 px-2 text-[10px] gap-1",
    lg: "h-6 px-2.5 text-xs gap-1",
  };

  const iconSizes = { sm: 8, md: 10, lg: 12 };

  if (level.level <= 1) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center rounded-full font-bold ${level.bgColor} ${level.borderColor} border ${level.color} ${sizeClasses[size]}`}
    >
      <Icon size={iconSizes[size]} />
      <span>Lv.{level.level}</span>
    </motion.div>
  );
};

// Animated VIP Entrance Effect
interface VIPEntranceEffectProps {
  userName: string;
  level: ViewerLevel;
  onComplete: () => void;
}

export const VIPEntranceEffect = ({ userName, level, onComplete }: VIPEntranceEffectProps) => {
  const Icon = level.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: -400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: "spring", damping: 15 }}
        onAnimationComplete={() => setTimeout(onComplete, 2500)}
        className="absolute left-3 z-45 pointer-events-none"
        style={{ top: "25%" }}
      >
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full ${level.bgColor} border ${level.borderColor} backdrop-blur-xl`}>
          {/* Sparkle trail */}
          {level.level >= 4 && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1.2, 0],
                    opacity: [0, 1, 0],
                    x: -20 - i * 15,
                    y: Math.sin(i) * 15,
                  }}
                  transition={{ duration: 1.5, delay: i * 0.1, repeat: 1 }}
                  className={`absolute left-0 w-1.5 h-1.5 rounded-full ${
                    level.level >= 5 ? "bg-cyan-400" : "bg-yellow-400"
                  }`}
                />
              ))}
            </>
          )}

          <motion.div
            animate={level.level >= 4 ? { rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 1.5, repeat: 1 }}
          >
            <Icon className={`w-5 h-5 ${level.color}`} />
          </motion.div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${level.color}`}>{userName}</span>
              <span className={`text-[9px] font-bold ${level.color} opacity-70`}>{level.name}</span>
            </div>
            <p className="text-[10px] text-white/40">
              {level.level >= 5 ? "✨ A legend has arrived!" : level.level >= 4 ? "👑 VIP entered the room" : "joined the stream"}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Fan Club Badge
interface FanClubBadgeProps {
  isMember: boolean;
  creatorName?: string;
}

export const FanClubBadge = ({ isMember, creatorName }: FanClubBadgeProps) => {
  if (!isMember) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="inline-flex items-center gap-0.5 h-4 px-1.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-400"
    >
      <Heart className="w-2 h-2 fill-pink-400" />
      <span className="text-[7px] font-bold">FAN</span>
    </motion.div>
  );
};

// Daily Ranking Leaderboard Widget
interface DailyRankingProps {
  rankings: Array<{
    userId: string;
    name: string;
    avatar: string;
    score: number;
    rank: number;
  }>;
}

export const DailyRankingWidget = ({ rankings }: DailyRankingProps) => {
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-black/80 backdrop-blur-xl rounded-2xl p-3 border border-yellow-500/15"
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <Crown className="w-4 h-4 text-yellow-400" />
        <span className="text-xs font-bold text-white">Today's Top Gifters</span>
      </div>

      <div className="space-y-1.5">
        {rankings.slice(0, 5).map((r, i) => (
          <motion.div
            key={r.userId}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span className="text-sm w-5 text-center">{i < 3 ? medals[i] : `${i + 1}`}</span>
            <img
              src={r.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.userId}`}
              className="w-6 h-6 rounded-full object-cover border border-white/10"
              alt=""
            />
            <span className="text-[11px] font-semibold text-white flex-1 truncate">{r.name}</span>
            <span className="text-[10px] font-bold text-yellow-400">{r.score.toLocaleString()}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
