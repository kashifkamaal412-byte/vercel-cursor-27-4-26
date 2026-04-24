import { motion } from "framer-motion";

const bars = [0, 1, 2, 3, 4];

export const PremiumLoader = ({ text = "Loading..." }: { text?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-6">
    {/* Animated logo pulse */}
    <div className="relative w-16 h-16">
      <motion.div
        className="absolute inset-0 rounded-2xl bg-primary/20"
        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 rounded-2xl bg-primary/30"
        animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0.2, 0.7] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      />
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
        <span className="text-primary-foreground font-black text-xl">P</span>
      </div>
    </div>

    {/* Audio bars animation */}
    <div className="flex items-end gap-1 h-8">
      {bars.map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-primary"
          animate={{ height: ["8px", "28px", "12px", "24px", "8px"] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>

    <motion.p
      className="text-sm text-muted-foreground font-medium"
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      {text}
    </motion.p>
  </div>
);

export const PostCardSkeleton = () => (
  <div className="bg-card rounded-none md:rounded-2xl overflow-hidden md:border md:border-border/20 animate-pulse">
    <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
      <div className="w-11 h-11 rounded-full bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-28 bg-muted rounded" />
        <div className="h-3 w-20 bg-muted rounded" />
      </div>
      <div className="w-20 h-8 bg-muted rounded-full" />
    </div>
    <div className="px-4 pb-3 space-y-2">
      <div className="h-3.5 w-full bg-muted rounded" />
      <div className="h-3.5 w-3/4 bg-muted rounded" />
    </div>
    <div className="w-full aspect-[4/3] bg-muted" />
    <div className="px-4 py-2.5">
      <div className="flex justify-between">
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="h-3 w-32 bg-muted rounded" />
      </div>
    </div>
    <div className="mx-4 h-px bg-muted" />
    <div className="flex gap-2 px-2 py-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex-1 h-10 bg-muted rounded-lg" />
      ))}
    </div>
  </div>
);
