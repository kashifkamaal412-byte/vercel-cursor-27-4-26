import { motion } from "framer-motion";
import { Video, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const EmptyFeed = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="relative mb-6"
        >
          <div className="w-24 h-24 rounded-full glass flex items-center justify-center">
            <Video className="w-12 h-12 text-primary" />
          </div>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-2 -right-2"
          >
            <Sparkles className="w-6 h-6 text-accent" />
          </motion.div>
        </motion.div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          No Videos Yet
        </h2>
        <p className="text-muted-foreground mb-8 max-w-xs">
          Be the first to share something amazing! Create and upload your own videos.
        </p>

        <Link to="/create">
          <Button variant="glow" size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Create First Video
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};
