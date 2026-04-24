import { Music, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";
import { VideoData } from "@/data/mockVideos";

interface VideoInfoProps {
  video: VideoData;
}

export const VideoInfo = ({ video }: VideoInfoProps) => {
  return (
    <div className="space-y-3">
      {/* Username */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2"
      >
        <span className="font-bold text-lg text-foreground">@{video.username}</span>
        {video.isVerified && (
          <BadgeCheck className="w-5 h-5 text-primary fill-primary/20" />
        )}
      </motion.div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="text-sm text-foreground/90 leading-relaxed max-w-[280px]"
      >
        {video.description}
      </motion.p>

      {/* Tags */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-2"
      >
        {video.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs text-primary font-medium hover:text-primary/80 cursor-pointer"
          >
            #{tag}
          </span>
        ))}
      </motion.div>

      {/* Music */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-2 glass-light px-3 py-2 rounded-full w-fit"
      >
        <Music className="w-4 h-4 text-foreground" />
        <div className="overflow-hidden max-w-[200px]">
          <motion.span
            animate={{ x: [0, -100, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="text-xs text-foreground/80 whitespace-nowrap inline-block"
          >
            {video.music}
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
};
