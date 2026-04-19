import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Music2, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { Video, useVideoActions } from "@/hooks/useVideos";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth/AuthGuard";

interface RealVideoInfoProps {
  video: Video;
}

// Parse text and make links clickable
const RenderTextWithLinks = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return (
    <>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className="text-primary underline" onClick={(e) => e.stopPropagation()}>
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

export const RealVideoInfo = ({ video }: RealVideoInfoProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { followUser, unfollowUser, checkFollowing } = useVideoActions();
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (user && video.user_id !== user.id) {
      checkFollowing(video.user_id).then(setIsFollowing);
    }
  }, [user, video.user_id, checkFollowing]);

  const handleUsernameClick = () => navigate(`/profile/${video.user_id}`);

  const handleFollow = async () => {
    if (!user) return;
    if (isFollowing) {
      setIsFollowing(false);
      await unfollowUser(video.user_id);
    } else {
      setIsFollowing(true);
      await followUser(video.user_id);
      toast.success("Now a fan!");
    }
  };

  const fullDescription = video.description || video.caption || "";
  const hasLongContent = fullDescription.length > 80 || video.external_link || video.location;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="absolute bottom-[70px] left-4 right-20 z-10 space-y-2"
    >
      {/* Creator Info Row */}
      <div className="flex items-center gap-2">
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleUsernameClick}>
          <Avatar className="w-11 h-11 ring-2 ring-white/30">
            <AvatarImage src={video.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-bold">
              {video.profile?.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </motion.button>

        <button onClick={handleUsernameClick} className="group">
          <span className="text-base font-bold text-white drop-shadow-lg group-hover:underline">
            {video.profile?.username || "user"}
          </span>
        </button>

        {user?.id !== video.user_id && (
          <AuthGuard action="become a fan">
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleFollow}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                isFollowing ? "bg-white/20 text-white border border-white/30" : "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
              }`}>
              {isFollowing ? "Following" : "Follow"}
            </motion.button>
          </AuthGuard>
        )}
      </div>

      {/* Caption & Description */}
      <div className="space-y-1">
        {video.caption && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className={`text-sm text-white leading-relaxed drop-shadow-lg ${!showMore ? "line-clamp-2" : ""}`}>
            <RenderTextWithLinks text={video.caption} />
          </motion.p>
        )}

        {/* Expanded content */}
        {showMore && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-1.5">
            {video.description && video.description !== video.caption && (
              <p className="text-xs text-white/80 leading-relaxed">
                <RenderTextWithLinks text={video.description} />
              </p>
            )}
            {video.external_link && (
              <a href={video.external_link} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary underline block" onClick={(e) => e.stopPropagation()}>
                {video.external_link}
              </a>
            )}
            {video.location && (
              <div className="flex items-center gap-1 text-xs text-white/70">
                <MapPin className="w-3 h-3" /> {video.location}
              </div>
            )}
          </motion.div>
        )}

        {/* More/Less button */}
        {hasLongContent && (
          <button onClick={() => setShowMore(!showMore)} className="text-xs text-white/60 flex items-center gap-0.5">
            {showMore ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
          </button>
        )}

        {/* Tags */}
        {video.tags && video.tags.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="flex flex-wrap gap-1.5">
            {video.tags.slice(0, 4).map((tag, index) => (
              <span key={index} className="text-sm text-primary font-medium hover:underline cursor-pointer">#{tag}</span>
            ))}
          </motion.div>
        )}

        {/* Music */}
        {video.music_title && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center gap-2 max-w-[200px]">
            <Music2 className="w-3.5 h-3.5 text-white/70 flex-shrink-0" strokeWidth={1.5} />
            <div className="overflow-hidden">
              <motion.span animate={{ x: [0, -60, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="text-xs text-white/70 whitespace-nowrap">
                {video.music_title}
              </motion.span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
