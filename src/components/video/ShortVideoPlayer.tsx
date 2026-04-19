import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ArrowLeft, Pause, Loader2, MessageCircle, Share2, Bookmark, Gift } from "lucide-react";
import { Video, useVideoActions } from "@/hooks/useVideos";
import { RealVideoInfo } from "./RealVideoInfo";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { GiftSheet } from "@/components/gifts/GiftSheet";
import { GiftAnimation } from "@/components/gifts/GiftAnimation";
import { useGifts } from "@/hooks/useGifts";
import { Gift as GiftType, premiumGiftVideoMap } from "@/data/giftData";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useGiftAnimation } from "@/contexts/GiftAnimationContext";

interface ShortVideoPlayerProps {
  video: Video;
  onBack: () => void;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

export const ShortVideoPlayer = ({ video, onBack }: ShortVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { likeVideo, unlikeVideo, checkLiked, saveVideo, unsaveVideo, checkSaved } = useVideoActions();
  const { sendGift, sending } = useGifts();
  const { triggerGiftAnimation } = useGiftAnimation();

  const [isPlaying, setIsPlaying] = useState(true);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [showLikeHeart, setShowLikeHeart] = useState(false);
  const [heartKey, setHeartKey] = useState(0); // For multiple heart animations
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(video.like_count || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSpeedMode, setIsSpeedMode] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(video.save_count || 0);
  const [giftSheetOpen, setGiftSheetOpen] = useState(false);
  const [animatingGift, setAnimatingGift] = useState<GiftType | null>(null);
  const [giftCount, setGiftCount] = useState(video.gift_count || 0);
  const [showComments, setShowComments] = useState(false);

  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    if (user) {
      checkLiked(video.id).then(setIsLiked);
      checkSaved(video.id).then(setIsSaved);
    }
  }, [video.id, user]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const handleTimeUpdate = () => {
      if (v.duration) {
        setProgress((v.currentTime / v.duration) * 100);
      }
    };

    const handleLoadedData = () => {
      setIsLoading(false);
      v.play().catch(() => setIsPlaying(false));
    };

    const handleError = () => {
      setIsLoading(false);
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    v.addEventListener("timeupdate", handleTimeUpdate);
    v.addEventListener("loadeddata", handleLoadedData);
    v.addEventListener("error", handleError);
    v.addEventListener("waiting", handleWaiting);
    v.addEventListener("canplay", handleCanPlay);

    return () => {
      v.removeEventListener("timeupdate", handleTimeUpdate);
      v.removeEventListener("loadeddata", handleLoadedData);
      v.removeEventListener("error", handleError);
      v.removeEventListener("waiting", handleWaiting);
      v.removeEventListener("canplay", handleCanPlay);
    };
  }, [video.id]);

  // Hide progress bar after 3 seconds
  const hideProgressBar = useCallback(() => {
    if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    progressTimeoutRef.current = setTimeout(() => {
      setShowProgressBar(false);
    }, 3000);
  }, []);

  const pauseIconTimerRef = useRef<NodeJS.Timeout | null>(null);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    if (pauseIconTimerRef.current) clearTimeout(pauseIconTimerRef.current);

    if (v.paused) {
      v.play().catch(console.log);
      setIsPlaying(true);
      setShowPauseIcon(false);
    } else {
      v.pause();
      setIsPlaying(false);
      setShowPauseIcon(true);
      // Auto-hide pause icon after 3 seconds while video stays paused
      pauseIconTimerRef.current = setTimeout(() => setShowPauseIcon(false), 3000);
    }
    setShowProgressBar(true);
    hideProgressBar();
  }, [hideProgressBar]);

  const handleLikeToggle = useCallback(async () => {
    if (!user) return;
    if (isLiked) {
      await unlikeVideo(video.id);
      setLikeCount((prev) => Math.max(0, prev - 1));
    } else {
      await likeVideo(video.id);
      setLikeCount((prev) => prev + 1);
    }
    setIsLiked(!isLiked);
  }, [user, isLiked, video.id, likeVideo, unlikeVideo]);

  const handleDoubleTapLike = useCallback(async () => {
    if (!user) return;
    // Show heart animation with unique key for each tap
    setHeartKey((prev) => prev + 1);
    setShowLikeHeart(true);
    setTimeout(() => setShowLikeHeart(false), 600);

    // Toggle like (only once per double tap)
    await handleLikeToggle();
  }, [user, handleLikeToggle]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleDoubleTapLike();
    } else {
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= DOUBLE_TAP_DELAY) {
          togglePlay();
        }
      }, DOUBLE_TAP_DELAY);
    }

    lastTapRef.current = now;
  }, [handleDoubleTapLike, togglePlay]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    if (videoRef.current && videoRef.current.duration) {
      videoRef.current.currentTime = percentage * videoRef.current.duration;
    }
    setShowProgressBar(true);
    hideProgressBar();
  };

  const handleLongPressStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      const v = videoRef.current;
      if (v) {
        v.playbackRate = 2.0;
        setIsSpeedMode(true);
      }
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    const v = videoRef.current;
    if (v) {
      v.playbackRate = 1.0;
      setIsSpeedMode(false);
    }
  }, []);

  const handleLike = async () => {
    if (!user) return;
    await handleLikeToggle();
  };

  const handleSave = async () => {
    if (!user) return;
    if (isSaved) {
      setIsSaved(false);
      setSaveCount((prev) => prev - 1);
      await unsaveVideo(video.id);
    } else {
      setIsSaved(true);
      setSaveCount((prev) => prev + 1);
      await saveVideo(video.id);
      toast.success("Video saved!");
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: video.caption || "Check out this video!",
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    }
  };

  const handleSendGift = useCallback(
    async (gift: GiftType, quantity: number) => {
      if (!user) return;
      if (gift.isPremium) {
        triggerGiftAnimation(gift, user.email?.split("@")[0] || "You", quantity);
      } else {
        setAnimatingGift(gift);
      }
      const success = await sendGift(gift, quantity, video.id, video.user_id);
      if (success) {
        setGiftCount((prev) => prev + gift.value * quantity);
        toast.success(`Sent ${quantity}x ${gift.name} to creator!`);
      }
    },
    [user, sendGift, video.id, video.user_id, triggerGiftAnimation],
  );

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-12 left-4 z-50 p-2 rounded-full bg-black/50 backdrop-blur-xl border border-white/10"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      {/* Speed mode indicator */}
      <AnimatePresence>
        {isSpeedMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-primary/80 backdrop-blur-sm"
          >
            <span className="text-xs font-bold text-white">2x Speed</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video */}
      <div
        className="relative w-full h-full"
        onClick={handleTap}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
      >
        <video
          ref={videoRef}
          src={video.video_url}
          poster={video.thumbnail_url || undefined}
          className="w-full h-full object-contain"
          loop
          playsInline
          muted={false}
          preload="auto"
        />

        {/* Loading */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/30"
            >
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pause indicator - semi-transparent, auto-hides after 3s */}
        <AnimatePresence>
          {showPauseIcon && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.6, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                <Pause className="w-8 h-8 text-white/80 fill-white/80" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Double-tap heart animation with counter */}
        <AnimatePresence mode="wait">
          {showLikeHeart && (
            <motion.div
              key={heartKey}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1.2 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-28 h-28 text-white fill-red-500 drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons - Right side */}
      <div className="absolute right-4 bottom-28 flex flex-col items-center gap-5 z-40">
        <AuthGuard action="like videos">
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleLike} className="flex flex-col items-center gap-1">
            <Heart
              className={`w-7 h-7 drop-shadow-lg ${isLiked ? "text-white fill-white" : "text-white"}`}
              strokeWidth={1.5}
            />
            <span className="text-xs font-semibold text-white drop-shadow-md">{formatNumber(likeCount)}</span>
          </motion.button>
        </AuthGuard>

        <AuthGuard action="comment">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center gap-1"
          >
            <MessageCircle className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-white drop-shadow-md">
              {formatNumber(video.comment_count || 0)}
            </span>
          </motion.button>
        </AuthGuard>

        <AuthGuard action="save videos">
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleSave} className="flex flex-col items-center gap-1">
            <Bookmark
              className={`w-7 h-7 drop-shadow-lg ${isSaved ? "text-white fill-white" : "text-white"}`}
              strokeWidth={1.5}
            />
            <span className="text-xs font-semibold text-white drop-shadow-md">{formatNumber(saveCount)}</span>
          </motion.button>
        </AuthGuard>

        <motion.button whileTap={{ scale: 0.85 }} onClick={handleShare} className="flex flex-col items-center gap-1">
          <Share2 className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-white drop-shadow-md">Share</span>
        </motion.button>

        <AuthGuard action="send gifts">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setGiftSheetOpen(true)}
            disabled={sending}
            className="flex flex-col items-center gap-1"
          >
            <motion.div
              className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg"
              animate={giftCount > 0 ? { scale: [1, 1.05, 1] } : undefined}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Gift className="w-5 h-5 text-white" strokeWidth={1.5} />
            </motion.div>
            <span className="text-xs font-semibold text-white drop-shadow-md">{formatNumber(giftCount)}</span>
          </motion.button>
        </AuthGuard>
      </div>

      {/* Video info */}
      <RealVideoInfo video={video} />

      {/* Progress Bar - appears on tap, disappears after 3 seconds */}
      <AnimatePresence>
        {showProgressBar && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-14 left-0 right-0 z-40"
          >
            <div
              ref={progressBarRef}
              className="h-2 bg-white/20 cursor-pointer mx-4 rounded-full overflow-hidden"
              onClick={handleProgressClick}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-primary"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gift Sheet */}
      <GiftSheet
        open={giftSheetOpen}
        onOpenChange={setGiftSheetOpen}
        onSendGift={handleSendGift}
        creatorName={video.profile?.username || undefined}
        creatorAvatar={video.profile?.avatar_url || undefined}
      />

      {/* Gift Animation Overlay */}
      <GiftAnimation
        gift={animatingGift}
        senderName={user?.email?.split("@")[0]}
        onComplete={() => setAnimatingGift(null)}
      />
    </div>
  );
};
