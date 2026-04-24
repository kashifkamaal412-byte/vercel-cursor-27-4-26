import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

interface TrustLevelBadgeProps {
  level: number | null;
}

const levelConfig = {
  1: { label: 'Bronze', color: 'from-amber-700 to-amber-600', icon: Shield },
  2: { label: 'Silver', color: 'from-slate-400 to-slate-300', icon: Shield },
  3: { label: 'Gold', color: 'from-yellow-500 to-amber-400', icon: ShieldCheck },
  4: { label: 'Platinum', color: 'from-cyan-400 to-teal-300', icon: ShieldCheck },
  5: { label: 'Diamond', color: 'from-violet-500 to-purple-400', icon: ShieldAlert },
};

export const TrustLevelBadge = ({ level }: TrustLevelBadgeProps) => {
  const displayLevel = Math.min(Math.max(level ?? 1, 1), 5) as 1 | 2 | 3 | 4 | 5;
  const config = levelConfig[displayLevel];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${config.color}`}
    >
      <Icon className="w-3.5 h-3.5 text-white" />
      <span className="text-xs font-semibold text-white">Level {displayLevel}</span>
    </motion.div>
  );
};
