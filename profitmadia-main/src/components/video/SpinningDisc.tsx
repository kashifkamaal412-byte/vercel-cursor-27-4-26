import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SpinningDiscProps {
  avatarUrl?: string | null;
  username?: string | null;
  onClick: () => void;
}

export const SpinningDisc = ({ avatarUrl, username, onClick }: SpinningDiscProps) => {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="relative flex items-center justify-center"
    >
      {/* Outer ring - vinyl record look */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-[3px] shadow-lg">
        <div className="w-full h-full rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 p-[2px] relative overflow-hidden">
          {/* Grooves effect */}
          <div className="absolute inset-0 rounded-full border border-white/5" />
          <div className="absolute inset-[3px] rounded-full border border-white/5" />
          
          {/* Center avatar - spinning */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-full h-full rounded-full overflow-hidden"
          >
            <Avatar className="w-full h-full">
              <AvatarImage src={avatarUrl || undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-[8px] font-bold">
                {username?.[0]?.toUpperCase() || "♪"}
              </AvatarFallback>
            </Avatar>
          </motion.div>
        </div>
      </div>
      
      {/* Music note indicator */}
      <motion.div
        animate={{ y: [-2, 2, -2], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
      >
        <span className="text-[8px] text-primary-foreground">♪</span>
      </motion.div>
    </motion.button>
  );
};
