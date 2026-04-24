import { Cake } from 'lucide-react';
import { motion } from 'framer-motion';

interface AccountAgeBadgeProps {
  createdAt: string | null;
}

export const AccountAgeBadge = ({ createdAt }: AccountAgeBadgeProps) => {
  if (!createdAt) return null;

  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let displayText = '';
  if (diffDays < 1) {
    displayText = 'New member';
  } else if (diffDays < 30) {
    displayText = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    displayText = `${months} month${months > 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingMonths = Math.floor((diffDays % 365) / 30);
    displayText = `${years}y${remainingMonths > 0 ? ` ${remainingMonths}m` : ''}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30"
    >
      <Cake className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-xs font-medium text-amber-300">{displayText}</span>
    </motion.div>
  );
};
