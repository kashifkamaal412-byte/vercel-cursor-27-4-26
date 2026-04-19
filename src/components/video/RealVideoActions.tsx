import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, Bookmark, Gift, Download, MoreVertical } from "lucide-react";
import { Video } from "@/hooks/useVideos";
import { ThreeDotMenu } from "./ThreeDotMenu";
import { useSavedVideos } from "@/hooks/useSavedVideos";
import { useDownloadManager } from "@/hooks/useDownloadManager";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { GiftSheet } from "@/components/gifts/GiftSheet";
import { GiftAnimation } from "@/components/gifts/GiftAnimation";
import { useGifts } from "@/hooks/useGifts";
import { Gift as GiftType, premiumGiftVideoMap } from "@/data/giftData";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SpinningDisc } from "./SpinningDisc";
import { useGiftAnimation } from "@/contexts/GiftAnimationContext";

interface RealVideoActionsProps {
  video: Video;
  isLiked: boolean;
  likeCount: number;
  onLike: () => void;
  onCommentClick: () => void;
  onShareClick?: () => void;
  onLikeLongPress?: () => void;
  onSoundClick?: () => void;
  commentsDisabled?: boolean;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

export const RealVideoActions = ({
  video,
  isLiked,
  likeCount,
  onLike,
  onCommentClick,
  onShareClick,
  onLikeLongPress,
  onSoundClick,
  commentsDisabled,
}: RealVideoActionsProps) => {
  const { user } = useAuth();
  const { isSaved, toggleSave } = useSavedVideos();
  const { sendGift, sending } = useGifts();
  const { downloadVideo, isDownloaded, getProgress } = useDownloadManager();
  const { triggerGiftAnimation } = useGiftAnimation();

  const videoIsSaved = isSaved(video.id);
  const videoIsDownloaded = isDownloaded(video.id);
  const [saveCount, setSaveCount] = useState(video.save_count);
  const [giftSheetOpen, setGiftSheetOpen] = useState(false);
  const [animatingGift, setAnimatingGift] = useState<GiftType | null>(null);
  const [giftCount, setGiftCount] = useState(video.gift_count || 0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const likeLongPressRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressingLike, setIsLongPressingLike] = useState(false);
  const [showFloatingHearts, setShowFloatingHearts] = useState(false);
  const [likeJustTriggered, setLikeJustTriggered] = useState(false);
  const [saveJustTriggered, setSaveJustTriggered] = useState(false);
  const [shareJustTriggered, setShareJustTriggered] = useState(false);
  const [commentJustTriggered, setCommentJustTriggered] = useState(false);
  const [giftJustTriggered, setGiftJustTriggered] = useState(false);
  const [downloadJustTriggered, setDownloadJustTriggered] = useState(false);

  const triggerMicroAnimation = (setter: (v: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), 400);
  };

  const handleSave = async () => {
    if (!user) return;
    const wasSaved = videoIsSaved;
    setSaveCount((prev) => prev + (wasSaved ? -1 : 1));
    const success = await toggleSave(video.id);
    if (success) {
      toast.success(wasSaved ? "Removed from saved" : "Video saved!");
    } else {
      setSaveCount((prev) => prev + (wasSaved ? 1 : -1));
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

  const handleDownload = async () => {
    if (videoIsDownloaded || isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    const success = await downloadVideo(video, (prog) => {
      setDownloadProgress(prog);
    });
    if (success) {
      toast.success("Downloaded for offline viewing");
    } else {
      toast.error("Download failed");
    }
    setIsDownloading(false);
  };

  const handleGiftClick = () => {
    if (!user) return;
    setGiftSheetOpen(true);
  };

  const handleSendGift = useCallback(
    async (gift: GiftType, quantity: number) => {
      if (!user) return;
      // ALL gifts (premium AND free) use the global fullscreen overlay
      triggerGiftAnimation(gift, user.email?.split("@")[0] || "You", quantity);
      const success = await sendGift(gift, quantity, video.id, video.user_id);
      if (success) {
        setGiftCount((prev) => prev + quantity);
        toast.success(`Sent ${quantity}x ${gift.name} to creator!`);
      }
    },
    [user, sendGift, video.id, video.user_id, triggerGiftAnimation],
  );

  const handleAnimationComplete = useCallback(() => {
    setAnimatingGift(null);
  }, []);

  const handleLikeTouchStart = useCallback(() => {
    likeLongPressRef.current = setTimeout(() => {
      setIsLongPressingLike(true);
      onLikeLongPress?.();
    }, 1000);
  }, [onLikeLongPress]);

  const handleLikeTouchEnd = useCallback(() => {
    if (likeLongPressRef.current) {
      clearTimeout(likeLongPressRef.current);
      likeLongPressRef.current = null;
    }
    setIsLongPressingLike(false);
  }, []);

  useEffect(() => {
    return () => {
      if (likeLongPressRef.current) {
        clearTimeout(likeLongPressRef.current);
      }
    };
  }, []);

  return (
    <>
      <div className="flex flex-col items-center gap-3 relative">
        {/* Floating Hearts on Like */}
        <AnimatePresence>
          {showFloatingHearts && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={`float-heart-${i}`}
                  initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
                  animate={{
                    opacity: 0,
                    y: -(80 + Math.random() * 60),
                    x: (Math.random() - 0.5) * 60,
                    scale: 0.8 + Math.random() * 0.4,
                    rotate: (Math.random() - 0.5) * 40,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, delay: i * 0.06, ease: "easeOut" }}
                  className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none z-50"
                >
                  <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Like */}
        <AuthGuard action="like videos">
          <motion.button
            whileTap={{ scale: 0.75 }}
            animate={likeJustTriggered ? { scale: [1, 1.4, 0.9, 1.15, 1] } : { scale: 1 }}
            transition={likeJustTriggered ? { duration: 0.45, ease: "easeOut" } : { duration: 0.15 }}
            onClick={() => {
              onLike();
              triggerMicroAnimation(setLikeJustTriggered);
              if (!isLiked) {
                setShowFloatingHearts(true);
                setTimeout(() => setShowFloatingHearts(false), 1000);
              }
            }}
            onTouchStart={handleLikeTouchStart}
            onTouchEnd={handleLikeTouchEnd}
            onMouseDown={handleLikeTouchStart}
            onMouseUp={handleLikeTouchEnd}
            onMouseLeave={handleLikeTouchEnd}
            className="flex flex-col items-center gap-0.5"
          >
            <Heart
              className={`w-5 h-5 drop-shadow-lg transition-all duration-200 ${isLiked ? "text-red-600 fill-red-600" : "text-white"}`}
              strokeWidth={1.5}
            />
            <span className="text-[10px] font-semibold text-white drop-shadow-md tabular-nums">
              {formatNumber(likeCount)}
            </span>
          </motion.button>
        </AuthGuard>

        {/* Comment */}
        {!commentsDisabled ? (
          <AuthGuard action="comment">
            <motion.button
              whileTap={{ scale: 0.75 }}
              animate={
                commentJustTriggered
                  ? { scale: [1, 1.15, 0.95, 1.05, 1], rotate: [0, -8, 8, -4, 0] }
                  : { scale: 1, rotate: 0 }
              }
              transition={commentJustTriggered ? { duration: 0.4, ease: "easeOut" } : { duration: 0.15 }}
              onClick={() => {
                onCommentClick();
                triggerMicroAnimation(setCommentJustTriggered);
              }}
              className="flex flex-col items-center gap-0.5"
            >
              <MessageCircle className="w-5 h-5 text-white drop-shadow-lg" strokeWidth={1.5} />
              <span className="text-[10px] font-semibold text-white drop-shadow-md tabular-nums">
                {formatNumber(video.comment_count)}
              </span>
            </motion.button>
          </AuthGuard>
        ) : (
          <div className="flex flex-col items-center gap-0.5 opacity-40">
            <MessageCircle className="w-5 h-5 text-white/50 drop-shadow-lg" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold text-white/50 drop-shadow-md">Off</span>
          </div>
        )}

        {/* Save */}
        <AuthGuard action="save videos">
          <motion.button
            whileTap={{ scale: 0.75 }}
            animate={saveJustTriggered ? { scale: [1, 1.2, 0.9, 1.1, 1], y: [0, -4, 0] } : { scale: 1 }}
            transition={saveJustTriggered ? { duration: 0.4, ease: "easeOut" } : { duration: 0.15 }}
            onClick={() => {
              handleSave();
              triggerMicroAnimation(setSaveJustTriggered);
            }}
            className="flex flex-col items-center gap-0.5"
          >
            <Bookmark
              className={`w-5 h-5 drop-shadow-lg transition-all duration-200 ${videoIsSaved ? "text-red-400 fill-yellow-400" : "text-white"}`}
              strokeWidth={1.5}
            />
            <span className="text-[10px] font-semibold text-white drop-shadow-md tabular-nums">
              {formatNumber(saveCount)}
            </span>
          </motion.button>
        </AuthGuard>

        {/* Share */}
        <motion.button
          whileTap={{ scale: 0.75 }}
          animate={
            shareJustTriggered
              ? { scale: [1, 1.15, 0.95, 1.05, 1], rotate: [0, 15, -10, 5, 0] }
              : { scale: 1, rotate: 0 }
          }
          transition={shareJustTriggered ? { duration: 0.4, ease: "easeOut" } : { duration: 0.15 }}
          onClick={() => {
            (onShareClick || handleShare)();
            triggerMicroAnimation(setShareJustTriggered);
          }}
          className="flex flex-col items-center gap-0.5"
        >
          <Share2 className="w-5 h-5 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-[10px] font-semibold text-white drop-shadow-md">
            {formatNumber(video.share_count || 0)}
          </span>
        </motion.button>

        {/* Gift */}
        <AuthGuard action="send gifts">
          <motion.button
            whileTap={{ scale: 0.75 }}
            animate={giftJustTriggered ? { scale: [1, 1.3, 0.85, 1.15, 1], rotate: [0, -10, 10, -5, 0] } : { scale: 1 }}
            transition={giftJustTriggered ? { duration: 0.5, ease: "easeOut" } : { duration: 0.15 }}
            onClick={() => {
              handleGiftClick();
              triggerMicroAnimation(setGiftJustTriggered);
            }}
            disabled={sending}
            className="flex flex-col items-center gap-0.5"
          >
            <motion.div
              className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-br from-pink-500 to-red-500 shadow-lg shadow-red-500/30"
              animate={giftCount > 0 ? { scale: [1, 1.05, 1] } : undefined}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Gift className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
            </motion.div>
            <span className="text-[10px] font-semibold text-white drop-shadow-md">{formatNumber(giftCount || 0)}</span>
          </motion.button>
        </AuthGuard>

        {/* Download */}
        <motion.button
          whileTap={{ scale: 0.75 }}
          animate={downloadJustTriggered ? { scale: [1, 1.15, 0.95, 1.05, 1], y: [0, 3, -2, 0] } : { scale: 1 }}
          transition={downloadJustTriggered ? { duration: 0.4, ease: "easeOut" } : { duration: 0.15 }}
          onClick={() => {
            handleDownload();
            triggerMicroAnimation(setDownloadJustTriggered);
          }}
          disabled={isDownloading}
          aria-label="Download video"
          className="flex flex-col items-center gap-0.5 relative"
        >
          {isDownloading ? (
            <div className="relative w-5 h-5 flex items-center justify-center">
              <svg className="w-5 h-5 -rotate-90">
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={0.3}
                  strokeWidth={2}
                  className="text-white"
                />
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray={50.27}
                  strokeDashoffset={50.27 - (downloadProgress / 100) * 50.27}
                  className="transition-all duration-150"
                />
              </svg>
              <span className="absolute text-[6px] font-bold text-primary">{Math.round(downloadProgress)}</span>
            </div>
          ) : videoIsDownloaded ? (
            <Download className="w-5 h-5 text-primary drop-shadow-lg" strokeWidth={1.5} />
          ) : (
            <Download className="w-5 h-5 text-white drop-shadow-lg" strokeWidth={1.5} />
          )}
          <span className="text-[10px] font-semibold text-white drop-shadow-md">
            {videoIsDownloaded ? "Saved" : isDownloading ? `${Math.round(downloadProgress)}%` : ""}
          </span>
        </motion.button>

        {/* Three Dot Menu */}
        <ThreeDotMenu video={video} onShare={onShareClick} />

        {/* Spinning Sound Disc */}
        <SpinningDisc
          avatarUrl={video.profile?.avatar_url}
          username={video.profile?.username}
          onClick={() => onSoundClick?.()}
        />
      </div>

      <GiftSheet
        open={giftSheetOpen}
        onOpenChange={setGiftSheetOpen}
        onSendGift={handleSendGift}
        creatorName={video.profile?.username || undefined}
        creatorAvatar={video.profile?.avatar_url || undefined}
      />

      <GiftAnimation
        gift={animatingGift}
        senderName={user?.email?.split("@")[0]}
        onComplete={handleAnimationComplete}
      />
    </>
  );
};
