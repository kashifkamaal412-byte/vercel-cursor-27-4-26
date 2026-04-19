import { Heart, MessageCircle, Share2, Bookmark, Music } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VideoData } from "@/data/mockVideos";

interface VideoActionsProps {
  video: VideoData;
  onCommentClick: () => void;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

export const VideoActions = ({ video, onCommentClick }: VideoActionsProps) => {
  const [isLiked, setIsLiked] = useState(video.isLiked);
  const [likeCount, setLikeCount] = useState(video.likes);
  const [isSaved, setIsSaved] = useState(false);
  const [showHearts, setShowHearts] = useState(false);

  const handleLike = () => {
    if (!isLiked) {
      setShowHearts(true);
      setTimeout(() => setShowHearts(false), 1000);
    }
    setIsLiked(!isLiked);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const actionItems = [
    {
      icon: Heart,
      count: likeCount,
      action: handleLike,
      isActive: isLiked,
      activeColor: "text-accent",
    },
    {
      icon: MessageCircle,
      count: video.comments,
      action: onCommentClick,
      isActive: false,
    },
    {
      icon: Share2,
      count: video.shares,
      action: () => {},
      isActive: false,
    },
    {
      icon: Bookmark,
      count: null,
      action: () => setIsSaved(!isSaved),
      isActive: isSaved,
      activeColor: "text-primary",
    },
  ];

  return (
    <div className="flex flex-col items-center gap-5">
      {/* User Avatar */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        <Avatar className="w-12 h-12 border-2 border-primary glow-primary">
          <AvatarImage src={video.userAvatar} />
          <AvatarFallback className="bg-muted text-foreground">
            {video.username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 gradient-primary w-5 h-5 rounded-full flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">+</span>
        </div>
      </motion.div>

      {/* Action Buttons */}
      {actionItems.map((item, index) => (
        <motion.button
          key={index}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={item.action}
          className="flex flex-col items-center gap-1"
        >
          <div
            className={`p-2 rounded-full glass transition-all duration-300 ${
              item.isActive ? item.activeColor || "" : ""
            }`}
          >
            <item.icon
              className={`w-7 h-7 transition-all duration-300 ${
                item.isActive
                  ? `${item.activeColor || "text-primary"} ${item.icon === Heart ? "fill-current animate-heart-burst" : ""}`
                  : "text-foreground"
              }`}
            />
          </div>
          {item.count !== null && (
            <span className="text-xs font-medium text-foreground/80">
              {formatNumber(item.count)}
            </span>
          )}
        </motion.button>
      ))}

      {/* Music Disc */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 rounded-full bg-gradient-to-br from-muted to-card border-2 border-glass-border flex items-center justify-center"
      >
        <Music className="w-5 h-5 text-foreground" />
      </motion.div>

      {/* Floating Hearts Animation */}
      <AnimatePresence>
        {showHearts && (
          <>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 1, y: 0, x: 0, scale: 0 }}
                animate={{
                  opacity: 0,
                  y: -100 - Math.random() * 50,
                  x: (Math.random() - 0.5) * 100,
                  scale: 1 + Math.random() * 0.5,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="absolute bottom-1/2"
              >
                <Heart className="w-6 h-6 text-accent fill-current" />
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
