import { useState } from "react";
import { motion } from "framer-motion";
import { Video } from "@/hooks/useVideos";
import { ShortVideoPlayer } from "./ShortVideoPlayer";

interface FullScreenVideoPlayerProps {
  videos: Video[];
  initialIndex: number;
  onClose: () => void;
}

export const FullScreenVideoPlayer = ({ videos, initialIndex, onClose }: FullScreenVideoPlayerProps) => {
  const [currentIndex] = useState(initialIndex);
  const video = videos[currentIndex];

  if (!video) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
    >
      <ShortVideoPlayer video={video} onBack={onClose} />
    </motion.div>
  );
};
