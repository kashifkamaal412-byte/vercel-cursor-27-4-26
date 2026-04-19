import { motion } from 'framer-motion';

interface ActivityStatusProps {
  status: string | null;
}

const statusConfig = {
  active: { label: 'Active', color: 'bg-emerald-500', pulse: true },
  away: { label: 'Away', color: 'bg-amber-500', pulse: false },
  offline: { label: 'Offline', color: 'bg-slate-500', pulse: false },
};

export const ActivityStatus = ({ status }: ActivityStatusProps) => {
  const displayStatus = (status as keyof typeof statusConfig) || 'active';
  const config = statusConfig[displayStatus] || statusConfig.active;

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="relative">
        <div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
        {config.pulse && (
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute inset-0 rounded-full ${config.color}`}
          />
        )}
      </div>
      <span className="text-xs text-muted-foreground">{config.label}</span>
    </div>
  );
};
