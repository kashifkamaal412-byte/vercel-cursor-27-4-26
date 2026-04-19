import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ThumbsUp,
  MessageCircle,
  Share2,
  Gift as GiftIcon,
  AlertCircle,
  RefreshCw,
  Pause,
  Heart,
  Play,
  Send,
  Bookmark,
  Search,
  MoreVertical,
  ChevronLeft,
  X,
  Flag,
  EyeOff,
  Download,
  Link2,
  Copy,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  Lock,
  Globe,
  Bell,
  BellOff,
  UserX,
} from "lucide-react";
import { Video, useVideoActions } from "@/hooks/useVideos";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShareSheet } from "./ShareSheet";
import { GiftSheet } from "@/components/gifts/GiftSheet";
import { GiftAnimation } from "@/components/gifts/GiftAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useNavigate } from "react-router-dom";
import { useGifts } from "@/hooks/useGifts";
import { Gift, premiumGiftVideoMap } from "@/data/giftData";
import { useGiftAnimation } from "@/contexts/GiftAnimationContext";
import { useComments, Comment } from "@/hooks/useComments";
import { DownloadButton } from "@/components/downloads/DownloadButton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PremiumLongVideoCardProps {
  video: Video;
  isActive: boolean;
}

const formatNumber = (num: number | null): string => {
  if (!num) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const timeAgo = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} minutes ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
};

export const PremiumLongVideoCard = ({ video, isActive }: PremiumLongVideoCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showGiftSheet, setShowGiftSheet] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false); // new: comment box appears only when comment button clicked

  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [likeCount, setLikeCount] = useState(video.like_count);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [giftCount, setGiftCount] = useState(video.gift_count || 0);
  const [activeGift, setActiveGift] = useState<Gift | null>(null);
  const [saveCount, setSaveCount] = useState(video.save_count || 0);
  const [commentInput, setCommentInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [is2xSpeed, setIs2xSpeed] = useState(false);
  const longPressTimeoutRef2 = useRef<NodeJS.Timeout | null>(null);
  const progressPointerIdRef = useRef<number | null>(null);
  const [isProgressDragging, setIsProgressDragging] = useState(false);
  const isOwner = user?.id === video.user_id;

  // Animation states for stat buttons
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [saveAnimating, setSaveAnimating] = useState(false);
  const [giftAnimating, setGiftAnimating] = useState(false);

  const { likeVideo, unlikeVideo, checkLiked, followUser, unfollowUser, checkFollowing, deleteVideo } = useVideoActions();
  const { sendGift } = useGifts();
  const { triggerGiftAnimation } = useGiftAnimation();
  const {
    comments,
    loading: commentsLoading,
    addComment,
    editComment,
    deleteComment,
    toggleCommentLike,
    reportComment,
    toggleReplies,
  } = useComments(video.id);

  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      checkLiked(video.id).then(setIsLiked);
      if (video.user_id !== user.id) {
        checkFollowing(video.user_id).then(setIsFollowing);
      }
    }
  }, [user, video.id, video.user_id, checkLiked, checkFollowing]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive && !videoError && !isPaused) {
      el.currentTime = 0;
      el.volume = 1.0;
      el.muted = false;
      el.play()
        .then(() => {
          setIsLoading(false);
          setIsMuted(false);
        })
        .catch(() => {
          el.muted = true;
          setIsMuted(true);
          el.play().catch(() => {});
        });
    } else if (!isActive) {
      el.pause();
    }
  }, [isActive, videoError, video.id, isPaused]);

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
  }, []);

  const handleTap = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      handleDoubleTap();
      lastTapRef.current = 0;
    } else {
      tapTimeoutRef.current = setTimeout(() => {
        const el = videoRef.current;
        if (!el) return;
        if (el.paused) {
          el.play().catch(() => {});
          setIsPaused(false);
        } else {
          el.pause();
          setIsPaused(true);
        }
      }, 300);
      lastTapRef.current = now;
    }
  }, []);

  const handleDoubleTap = useCallback(async () => {
    if (!isLiked) {
      setShowHeartAnimation(true);
      setIsLiked(true);
      setLikeCount((p) => p + 1);
      setLikeAnimating(true);
      await likeVideo(video.id);
      setTimeout(() => setShowHeartAnimation(false), 1000);
      setTimeout(() => setLikeAnimating(false), 400);
    }
  }, [isLiked, likeVideo, video.id]);

  const handleLike = async () => {
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 400);
    if (isLiked) {
      setIsLiked(false);
      setLikeCount((p) => p - 1);
      await unlikeVideo(video.id);
    } else {
      setIsLiked(true);
      setLikeCount((p) => p + 1);
      await likeVideo(video.id);
    }
  };

  const handleFollow = async () => {
    if (!user) return;
    if (isFollowing) {
      await unfollowUser(video.user_id);
      setIsFollowing(false);
    } else {
      await followUser(video.user_id);
      setIsFollowing(true);
    }
  };

  const handleSave = () => {
    setSaveAnimating(true);
    setTimeout(() => setSaveAnimating(false), 400);
    setIsSaved(!isSaved);
    setSaveCount((p) => (isSaved ? p - 1 : p + 1));
  };

  const handleSendGift = async (gift: Gift, quantity: number) => {
    if (gift.isPremium) {
      triggerGiftAnimation(gift, user?.email?.split("@")[0] || "You", quantity);
    } else {
      setActiveGift(gift);
    }
    const success = await sendGift(gift, quantity, video.id, video.user_id);
    if (success) {
      setGiftCount((p) => p + quantity);
      setGiftAnimating(true);
      setTimeout(() => setGiftAnimating(false), 400);
      setShowGiftSheet(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    el.currentTime = percent * duration;
  };

  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setVideoError(false);
    setIsLoading(true);
    setRetryCount((p) => p + 1);
    if (videoRef.current) videoRef.current.load();
  }, []);

  const handleProfileClick = () => navigate(`/user/${video.user_id}`);

  const handleSendComment = async () => {
    if (!commentInput.trim()) return;
    const success = await addComment(commentInput.trim(), replyingTo?.id || null);
    if (success) {
      setCommentInput("");
      setReplyingTo(null);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/video/${video.id}`).then(() => {
      toast.success("Link copied!");
    });
    setShowThreeDotMenu(false);
  };

  const handleTogglePrivacy = async () => {
    if (!user || !isOwner) return;
    const { error } = await supabase
      .from("videos")
      .update({ is_public: !video.is_public })
      .eq("id", video.id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to update privacy");
      return;
    }
    toast.success(video.is_public ? "Video moved to private" : "Video is now public");
    setShowThreeDotMenu(false);
  };

  const handleToggleComments = async () => {
    if (!user || !isOwner) return;
    const { error } = await supabase
      .from("videos")
      .update({ allow_comments: !video.allow_comments })
      .eq("id", video.id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to update comments setting");
      return;
    }
    toast.success(video.allow_comments ? "Comments turned off" : "Comments turned on");
    setShowThreeDotMenu(false);
  };

  const handleDeleteVideo = async () => {
    if (!user || !isOwner) return;
    const ok = await deleteVideo(video.id);
    if (!ok) {
      toast.error("Failed to delete video");
      return;
    }
    toast.success("Video deleted");
    setShowThreeDotMenu(false);
    navigate(-1);
  };

  const handleBlockUser = async () => {
    if (!user || isOwner) return;
    const { error } = await supabase
      .from("blocked_users")
      .insert({ blocker_id: user.id, blocked_id: video.user_id });
    if (error) {
      toast.error("Failed to block user");
      return;
    }
    toast.success("User blocked");
    setShowThreeDotMenu(false);
  };

  const handleCommentLike = async (commentId: string, currentlyLiked: boolean) => {
    await toggleCommentLike(commentId, currentlyLiked);
  };

  const handleCommentDelete = async (commentId: string) => {
    if (confirm("Delete this comment?")) {
      await deleteComment(commentId);
    }
  };

  const handleCommentEdit = async (commentId: string, newText: string) => {
    await editComment(commentId, newText);
  };

  const handleCommentReport = async (commentId: string) => {
    const reason = prompt("Reason for reporting:");
    if (reason) {
      await reportComment(commentId, reason);
      toast.success("Comment reported");
    }
  };

  const toggleCommentReplies = (commentId: string) => {
    toggleReplies(commentId);
  };

  const visibleComments = comments.slice(0, 10); // show first 10, but we'll have infinite scroll later

  return (
    <div className="relative w-full h-full bg-black flex flex-col">
      {/* Fixed top section (video + stats) */}
      <div className="flex-shrink-0 w-full bg-black z-10">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground tracking-wide">Auto Flay Mode</h1>
          <div className="flex items-center gap-3">
            <button>
              <Search className="w-5 h-5 text-foreground" />
            </button>
            <button onClick={() => setShowThreeDotMenu(true)}>
              <MoreVertical className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Creator info */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={handleProfileClick}>
              <Avatar className="w-12 h-12 border-2 border-orange-500 ring-2 ring-orange-500/30">
                <AvatarImage src={video.profile?.avatar_url || ""} />
                <AvatarFallback className="bg-muted text-foreground text-lg">
                  {video.profile?.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="flex-1 min-w-0" onClick={handleProfileClick}>
              <p className="font-bold text-foreground text-[15px] truncate">
                {video.profile?.display_name || video.profile?.username || "Creator"}
              </p>
              <p className="text-xs text-orange-400/80">Total Fans: {formatNumber(video.profile?.total_followers)}</p>
            </div>
            {user && user.id !== video.user_id && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleFollow}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  isFollowing
                    ? "bg-muted text-muted-foreground border border-border"
                    : "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </motion.button>
            )}
          </div>
        </div>

        {/* Title + See More */}
        <div className="px-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-bold text-foreground text-[15px] flex-1 leading-snug">
              {video.caption || "Untitled Video"}
            </h2>
            {(video.description || video.caption) && (
              <button
                onClick={() => setShowDescription(!showDescription)}
                className="text-xs text-orange-400 font-semibold whitespace-nowrap pt-0.5"
              >
                {showDescription ? "HIDE" : "SEE MORE"}
              </button>
            )}
          </div>
        </div>

        {/* Video player */}
        <div className="w-full pb-1">
          <div className="relative w-full aspect-video overflow-hidden bg-black/50"
            onClick={handleTap}
            onMouseDown={() => {
                longPressTimeoutRef2.current = setTimeout(() => {
                const v = videoRef.current;
                if (v && !v.paused) { v.playbackRate = 2; setIs2xSpeed(true); }
              }, 400);
            }}
              onMouseUp={() => { if (longPressTimeoutRef2.current) clearTimeout(longPressTimeoutRef2.current); if (videoRef.current) videoRef.current.playbackRate = 1; setIs2xSpeed(false); }}
              onMouseLeave={() => { if (longPressTimeoutRef2.current) clearTimeout(longPressTimeoutRef2.current); if (videoRef.current) videoRef.current.playbackRate = 1; setIs2xSpeed(false); }}
            onTouchStart={() => {
                longPressTimeoutRef2.current = setTimeout(() => {
                const v = videoRef.current;
                if (v && !v.paused) { v.playbackRate = 2; setIs2xSpeed(true); }
              }, 400);
            }}
              onTouchEnd={() => { if (longPressTimeoutRef2.current) clearTimeout(longPressTimeoutRef2.current); if (videoRef.current) videoRef.current.playbackRate = 1; setIs2xSpeed(false); }}
          >
            <video
              key={`${video.id}-${retryCount}`}
              ref={videoRef}
              src={video.video_url}
              className="w-full h-full object-contain bg-black"
              loop
              playsInline
              muted={isMuted}
              preload="auto"
              onError={() => {
                const v = videoRef.current;
                if (v && v.readyState >= 2) return;
                setVideoError(true);
                setIsLoading(false);
              }}
              onLoadedData={() => {
                setIsLoading(false);
                setVideoError(false);
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) setDuration(videoRef.current.duration);
              }}
              onCanPlay={() => {
                setIsLoading(false);
                setVideoError(false);
              }}
              onPlaying={() => {
                setIsLoading(false);
                setIsPaused(false);
              }}
              onPause={() => setIsPaused(true)}
              onTimeUpdate={() => {
                const v = videoRef.current;
                if (v && v.duration) {
                  setProgress((v.currentTime / v.duration) * 100);
                  setCurrentTime(v.currentTime);
                }
              }}
            />
            {/* 2x Speed indicator */}
            <AnimatePresence>
              {is2xSpeed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm pointer-events-none">
                  <span className="text-xs font-bold text-white">2x Speed ▶▶</span>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Pause overlay */}
            <AnimatePresence>
              {isPaused && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10">
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Heart animation */}
            <AnimatePresence>
              {showHeartAnimation && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1.5 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-2xl" />
                </motion.div>
              )}
            </AnimatePresence>
            {/* Loading */}
            {isLoading && !videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {/* Error */}
            {videoError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
                <AlertCircle className="w-10 h-10 text-orange-500" />
                <p className="text-xs text-muted-foreground">Video couldn't load</p>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 rounded-full bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            )}

            {/* Progress bar - fixed at absolute bottom of video */}
            <div className="absolute left-0 right-0 bottom-0 z-40 pointer-events-auto">
              <div className="px-3 pb-1 pt-4 bg-gradient-to-t from-black/50 to-transparent">
                <div
                  className={`relative w-full flex items-center cursor-pointer touch-none group ${isProgressDragging ? 'h-8' : 'h-5'} transition-all duration-150`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsProgressDragging(true);
                    progressPointerIdRef.current = e.pointerId;
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    if (videoRef.current && duration) videoRef.current.currentTime = pct * duration;
                  }}
                  onPointerMove={(e) => {
                    if (!isProgressDragging) return;
                    if (progressPointerIdRef.current !== null && e.pointerId !== progressPointerIdRef.current) return;
                    e.stopPropagation();
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    if (videoRef.current && duration) videoRef.current.currentTime = pct * duration;
                  }}
                  onPointerUp={(e) => {
                    if (progressPointerIdRef.current !== null && e.pointerId !== progressPointerIdRef.current) return;
                    e.stopPropagation();
                    e.preventDefault();
                    setIsProgressDragging(false);
                    progressPointerIdRef.current = null;
                    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                  }}
                  onPointerCancel={() => {
                    setIsProgressDragging(false);
                    progressPointerIdRef.current = null;
                  }}
                  onLostPointerCapture={() => {
                    setIsProgressDragging(false);
                    progressPointerIdRef.current = null;
                  }}
                >
                  <div className={`absolute left-0 right-0 rounded-full bg-white/20 transition-all duration-150 ${isProgressDragging ? 'h-[6px]' : 'h-[3px]'}`}>
                    <div
                      className="h-full rounded-full bg-orange-500 relative"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {/* Thumb - always visible, expands on drag */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-orange-500 border-2 border-white shadow-lg transition-all duration-150 ${isProgressDragging ? 'w-5 h-5' : 'w-3 h-3'}`}
                    style={{ left: `calc(${progress}% - ${isProgressDragging ? 10 : 6}px)` }}
                  />
                </div>
                <div className="flex justify-between mt-0.5 pb-0.5">
                  <span className="text-[10px] text-white/80 font-mono tabular-nums">{formatTime(currentTime)}</span>
                  <span className="text-[10px] text-white/80 font-mono tabular-nums">{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <AuthGuard fallback={<StatButton icon={ThumbsUp} count={likeCount} />}>
              <StatButton
                icon={ThumbsUp}
                count={likeCount}
                active={isLiked}
                onClick={handleLike}
                bouncing={likeAnimating}
              />
            </AuthGuard>
            <StatButton
              icon={MessageCircle}
              count={video.comment_count}
              onClick={() => setShowCommentInput(!showCommentInput)}
            />
            <StatButton icon={Share2} count={video.share_count} onClick={() => setShowShareSheet(true)} />
            <AuthGuard fallback={<StatButton icon={GiftIcon} count={giftCount} />}>
              <StatButton
                icon={GiftIcon}
                count={giftCount}
                onClick={() => setShowGiftSheet(true)}
                bouncing={giftAnimating}
              />
            </AuthGuard>
            <StatButton
              icon={Bookmark}
              count={saveCount}
              active={isSaved}
              onClick={handleSave}
              bouncing={saveAnimating}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/5" />

        {/* Description (expands) */}
        <AnimatePresence>
          {showDescription && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-3 overflow-hidden"
            >
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {video.description || "No description provided."}
              </p>
              <button onClick={() => setShowDescription(false)} className="text-xs text-orange-400 font-semibold mt-2">
                SEE LESS
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scrollable comments section */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {commentsLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No comments yet</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                videoOwnerId={video.user_id}
                currentUserId={user?.id}
                onLike={handleCommentLike}
                onReply={(c) => {
                  setReplyingTo(c);
                  setShowCommentInput(true);
                }}
                onDelete={handleCommentDelete}
                onEdit={handleCommentEdit}
                onReport={handleCommentReport}
                onViewReplies={toggleCommentReplies}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comment input – only visible when showCommentInput is true */}
      <AnimatePresence>
        {showCommentInput && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="px-4 pb-4 pt-2 border-t border-white/5 bg-black"
          >
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 border border-white/10 shrink-0">
                <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                <AvatarFallback className="bg-muted text-xs text-foreground">U</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex items-center bg-white/5 rounded-full border border-white/10 px-3 py-2">
                {replyingTo && <span className="text-xs text-orange-400 mr-2">@{replyingTo.profile?.username}</span>}
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendComment();
                  }}
                  placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleSendComment}
                  disabled={!commentInput.trim()}
                  className="ml-2 disabled:opacity-30"
                >
                  <Send className="w-4 h-4 text-orange-500" />
                </motion.button>
              </div>
              {replyingTo && (
                <button onClick={() => setReplyingTo(null)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Three dot menu */}
      <AnimatePresence>
        {showThreeDotMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowThreeDotMenu(false)}
              className="fixed inset-0 bg-black/50 z-[70]"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-card rounded-t-2xl border-t border-border p-4 pb-8 pt-px"
            >
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="space-y-1">
                {isOwner ? (
                  <>
                    <MenuButton
                      icon={video.is_public ? Lock : Globe}
                      label={video.is_public ? "Make Private" : "Make Public"}
                      onClick={handleTogglePrivacy}
                    />
                    <MenuButton
                      icon={video.allow_comments ? BellOff : Bell}
                      label={video.allow_comments ? "Turn Off Comments" : "Turn On Comments"}
                      onClick={handleToggleComments}
                    />
                    <DownloadButton
                      video={video}
                      showLabel
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-foreground font-medium"
                    />
                    <MenuButton
                      icon={Share2}
                      label="Share"
                      onClick={() => {
                        setShowShareSheet(true);
                        setShowThreeDotMenu(false);
                      }}
                    />
                    <MenuButton icon={Copy} label="Copy Link" onClick={handleCopyLink} />
                    <MenuButton icon={Trash2} label="Delete Video" onClick={handleDeleteVideo} destructive />
                  </>
                ) : (
                  <>
                    <MenuButton
                      icon={EyeOff}
                      label="Not Interested"
                      onClick={() => {
                        toast.success("We'll show less like this");
                        setShowThreeDotMenu(false);
                      }}
                    />
                    <MenuButton icon={UserX} label="Block User" onClick={handleBlockUser} />
                    <DownloadButton
                      video={video}
                      showLabel
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-foreground font-medium"
                    />
                    <MenuButton
                      icon={Bookmark}
                      label="Save"
                      onClick={() => {
                        handleSave();
                        setShowThreeDotMenu(false);
                      }}
                    />
                    <MenuButton
                      icon={Share2}
                      label="Share"
                      onClick={() => {
                        setShowShareSheet(true);
                        setShowThreeDotMenu(false);
                      }}
                    />
                    <MenuButton icon={Copy} label="Copy Link" onClick={handleCopyLink} />
                    <MenuButton icon={Flag} label="Report" onClick={() => { toast.success("Report submitted for review."); setShowThreeDotMenu(false); }} destructive />
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Gift Animation */}
      {activeGift && <GiftAnimation gift={activeGift} onComplete={() => setActiveGift(null)} />}

      {/* Sheets */}
      <ShareSheet isOpen={showShareSheet} onClose={() => setShowShareSheet(false)} video={video} />
      <GiftSheet open={showGiftSheet} onOpenChange={setShowGiftSheet} onSendGift={handleSendGift} />
    </div>
  );
};

/* Stat button with animations */
const StatButton = ({
  icon: Icon,
  count,
  active,
  onClick,
  bouncing,
}: {
  icon: React.ElementType;
  count?: number | null;
  active?: boolean;
  onClick?: () => void;
  bouncing?: boolean;
}) => {
  const [justTapped, setJustTapped] = useState(false);
  const isLike = Icon === ThumbsUp;

  const handleClick = () => {
    onClick?.();
    setJustTapped(true);
    setTimeout(() => setJustTapped(false), 450);
  };

  const tapAnimation = isLike
    ? { scale: [1, 1.45, 0.85, 1.2, 1] }
    : { scale: [1, 1.2, 0.92, 1.08, 1], rotate: [0, -6, 6, -3, 0] };

  return (
    <motion.button
      whileTap={{ scale: 0.75 }}
      animate={bouncing || justTapped ? tapAnimation : { scale: 1, rotate: 0 }}
      transition={bouncing || justTapped ? { duration: 0.45, ease: "easeOut" } : { duration: 0.15 }}
      onClick={handleClick}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors relative"
    >
      <Icon
        className={`w-[18px] h-[18px] transition-colors duration-200 ${active ? (isLike ? "text-orange-500 fill-orange-500" : "text-orange-500 fill-orange-500") : "text-foreground"}`}
        strokeWidth={1.8}
      />
      <span
        className={`text-xs font-semibold transition-colors duration-200 ${active ? (isLike ? "text-orange-500" : "text-orange-500") : "text-muted-foreground"}`}
      >
        {count !== undefined && count !== null ? formatNumber(count) : "0"}
      </span>
      {/* Floating hearts for like */}
      <AnimatePresence>
        {isLike && justTapped && active && (
          <>
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={`stat-heart-${i}`}
                initial={{ opacity: 1, y: 0, x: 0, scale: 0.3 }}
                animate={{
                  opacity: 0,
                  y: -(40 + Math.random() * 30),
                  x: (Math.random() - 0.5) * 40,
                  scale: 0.6 + Math.random() * 0.3,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, delay: i * 0.05, ease: "easeOut" }}
                className="absolute -top-1 left-1/2 -translate-x-1/2 pointer-events-none z-50"
              >
                <Heart className="w-3 h-3 text-orange-500 fill-orange-500" />
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

/* Menu button */
const MenuButton = ({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  destructive?: boolean;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors"
  >
    <Icon className={`w-5 h-5 ${destructive ? "text-destructive" : "text-muted-foreground"}`} />
    <span className={`font-medium ${destructive ? "text-destructive" : "text-foreground"}`}>{label}</span>
  </button>
);

/* Comment item with nested replies and actions */
const CommentItem = ({
  comment,
  videoOwnerId,
  currentUserId,
  onLike,
  onReply,
  onDelete,
  onEdit,
  onReport,
  onViewReplies,
}: {
  comment: Comment;
  videoOwnerId?: string;
  currentUserId?: string;
  onLike: (id: string, currentlyLiked: boolean) => void;
  onReply: (c: Comment) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onReport: (id: string) => void;
  onViewReplies: (id: string) => void;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const isCreator = comment.user_id === videoOwnerId;
  const isOwner = comment.user_id === currentUserId;

  const handleEdit = () => {
    if (editText.trim() && editText !== comment.content) {
      onEdit(comment.id, editText.trim());
    }
    setEditing(false);
  };

  return (
    <div className="flex gap-3 group">
      <Avatar className="w-9 h-9 border border-white/10 shrink-0">
        <AvatarImage src={comment.profile?.avatar_url || ""} />
        <AvatarFallback className="bg-muted text-xs text-foreground">
          {comment.profile?.username?.[0]?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm text-foreground">
              {comment.profile?.display_name || comment.profile?.username || "User"}
            </span>
            <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute right-0 top-0 mt-6 w-36 bg-card rounded-xl shadow-lg border border-border z-50 py-1"
                  >
                    {isOwner ? (
                      <>
                        <button
                          onClick={() => {
                            setEditing(true);
                            setShowMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-muted"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => {
                            onDelete(comment.id);
                            setShowMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-destructive hover:bg-muted"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            onReport(comment.id);
                            setShowMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-destructive hover:bg-muted"
                        >
                          <Flag className="w-3.5 h-3.5" /> Report
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(comment.content);
                            toast.success("Copied!");
                            setShowMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-muted"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </button>
                      </>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        {editing ? (
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="flex-1 bg-muted rounded px-2 py-1 text-sm text-foreground"
              autoFocus
            />
            <button onClick={handleEdit} className="text-orange-500 text-xs">
              Save
            </button>
            <button onClick={() => setEditing(false)} className="text-muted-foreground text-xs">
              Cancel
            </button>
          </div>
        ) : (
          <p className="text-sm text-foreground/80 mt-0.5">{comment.content}</p>
        )}
        <div className="flex items-center gap-4 mt-1">
          <button
            onClick={() => onLike(comment.id, !!comment.isLiked)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? "fill-orange-500 text-orange-500" : ""}`} />
            {comment.like_count}
          </button>
          <button onClick={() => onReply(comment)} className="text-xs text-muted-foreground hover:text-foreground">
            Reply
          </button>
          {comment.replies_count > 0 && (
            <button
              onClick={() => onViewReplies(comment.id)}
              className="flex items-center gap-1 text-xs text-orange-500 font-semibold"
            >
               {comment.replies.length > 0 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
               {comment.replies.length > 0 ? "Hide" : "View"} {comment.replies_count}{" "}
               {comment.replies_count === 1 ? "reply" : "replies"}
             </button>
           )}
         </div>
         {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3 border-l border-white/10 pl-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                videoOwnerId={videoOwnerId}
                currentUserId={currentUserId}
                onLike={onLike}
                onReply={onReply}
                onDelete={onDelete}
                onEdit={onEdit}
                onReport={onReport}
                onViewReplies={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
