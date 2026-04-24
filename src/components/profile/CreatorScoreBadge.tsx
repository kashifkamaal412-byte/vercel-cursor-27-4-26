import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface CreatorScoreBadgeProps {
  score: number | null;
}

export const CreatorScoreBadge = ({ score }: CreatorScoreBadgeProps) => {
  const displayScore = score ?? 0;
  
  const getScoreColor = () => {
    if (displayScore >= 80) return 'from-emerald-500 to-cyan-500';
    if (displayScore >= 60) return 'from-blue-500 to-indigo-500';
    if (displayScore >= 40) return 'from-violet-500 to-purple-500';
    if (displayScore >= 20) return 'from-orange-500 to-amber-500';
    return 'from-slate-500 to-slate-400';
  };

  const getScoreLabel = () => {
    if (displayScore >= 80) return 'Elite';
    if (displayScore >= 60) return 'Pro';
    if (displayScore >= 40) return 'Rising';
    if (displayScore >= 20) return 'Active';
    return 'Starter';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-2"
    >
      <div className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${getScoreColor()} bg-opacity-20`}>
        <Zap className="w-3.5 h-3.5 text-white" />
        <span className="text-xs font-bold text-white">{displayScore}</span>
        <span className="text-xs font-medium text-white/80">{getScoreLabel()}</span>
      </div>
    </motion.div>
  );
};
