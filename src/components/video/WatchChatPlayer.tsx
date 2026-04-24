import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  ArrowLeft,
  MessageCircle,
  Share2,
  Download,
  ThumbsUp,
  Loader2,
  Bookmark,
  Gift,
  MoreVertical,
  BadgeCheck,
  Volume2,
  VolumeX,
  Sun,
  ChevronRight,
  X,
  Link2,
  SkipForward,
  SkipBack,
  Maximize,
  Minimize,
  Minimize2,
  EyeOff,
  Flag,
  AlertTriangle,
  Ban,
  Shield,
  FileWarning,
  Users,
  Copyright,
  HelpCircle,
  Lock,
  Globe,
  Bell,
  BellOff,
  Trash2,
  UserX,
} from "lucide-react";
import { Video } from "@/hooks/useVideos";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useVideoActions } from "@/hooks/useVideos";
import { formatDistanceToNow } from "date-fns";
import { GiftSheet } from "@/components/gifts/GiftSheet";
import { App as RealCommentsOverlay } from "@/components/video/RealCommentsOverlay";
import { RelatedVideoItem } from "@/components/video/RelatedVideoItem";
import { ShareSheet } from "@/components/video/ShareSheet";
import { MiniPlayer } from "@/components/video/MiniPlayer";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface WatchChatPlayerProps {
  video: Video;
  relatedVideos?: Video[];
  onBack: () => void;
  onVideoClick?: (video: Video) => void;
  onMiniPlayer?: (video: Video, currentTime: number) => void;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor(seconds % 3600 / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatNumber = (num: number | null) => {
  if (!num) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatViews = (count: number | null) => {
  if (!count) return "0 Plays";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M Plays`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K Plays`;
  return `${count} Plays`;
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor(seconds % 3600 / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

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

// Report reasons for the report sheet
const REPORT_REASONS = [
  { icon: Ban, label: "Spam or misleading" },
  { icon: Shield, label: "Harassment or bullying" },
  { icon: AlertTriangle, label: "Violence or dangerous acts" },
  { icon: Flag, label: "Hate speech" },
  { icon: EyeOff, label: "Nudity or sexual content" },
  { icon: Users, label: "Minor safety" },
  { icon: Copyright, label: "Copyright violation" },
  { icon: FileWarning, label: "False information" },
  { icon: HelpCircle, label: "Other" },
];

export const WatchChatPlayer = ({ video, relatedVideos = [], onBack, onVideoClick, onMiniPlayer }: WatchChatPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { likeVideo, unlikeVideo, checkLiked, saveVideo, unsaveVideo, checkSaved } = useVideoActions();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(video.like_count || 0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showGiftSheet, setShowGiftSheet] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [miniPlayerTime, setMiniPlayerTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [customReport, setCustomReport] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const isOwner = user?.id === video.user_id;

  // Animation triggers
  const [likeAnim, setLikeAnim] = useState(false);
  const [commentAnim, setCommentAnim] = useState(false);
  const [shareAnim, setShareAnim] = useState(false);
  const [giftAnim, setGiftAnim] = useState(false);
  const [saveAnim, setSaveAnim] = useState(false);
  const [showFloatingHearts, setShowFloatingHearts] = useState(false);

  // Gesture state
  const [gestureType, setGestureType] = useState<"none" | "seek" | "volume" | "brightness">("none");
  const [gestureValue, setGestureValue] = useState(0);
  const [seekOffset, setSeekOffset] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressPointerIdRef = useRef<number | null>(null);

  const triggerAnim = (setter: (v: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), 500);
  };

  // Auto-hide controls after 3s
  const resetControlsTimer = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    if (isPlaying && !isDraggingProgress) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying, isDraggingProgress]);

  useEffect(() => {
    if (user) {
      checkLiked(video.id).then(setIsLiked);
      checkSaved(video.id).then(setIsSaved);
    }
  }, [video.id, user]);

  useEffect(() => {
    setLikeCount(video.like_count || 0);
  }, [video.like_count]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handleTimeUpdate = () => setCurrentTime(v.currentTime);
    const handleLoadedMetadata = () => { setDuration(v.duration); setIsLoading(false); };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => { setIsPlaying(false); setShowControls(true); };
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleEnded = () => {
      if (relatedVideos.length > 0) {
        onVideoClick?.(relatedVideos[0]);
      }
    };
    v.addEventListener("timeupdate", handleTimeUpdate);
    v.addEventListener("loadedmetadata", handleLoadedMetadata);
    v.addEventListener("play", handlePlay);
    v.addEventListener("pause", handlePause);
    v.addEventListener("waiting", handleWaiting);
    v.addEventListener("canplay", handleCanPlay);
    v.addEventListener("ended", handleEnded);
    return () => {
      v.removeEventListener("timeupdate", handleTimeUpdate);
      v.removeEventListener("loadedmetadata", handleLoadedMetadata);
      v.removeEventListener("play", handlePlay);
      v.removeEventListener("pause", handlePause);
      v.removeEventListener("waiting", handleWaiting);
      v.removeEventListener("canplay", handleCanPlay);
      v.removeEventListener("ended", handleEnded);
    };
  }, [relatedVideos, onVideoClick]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  // 2x speed on long press
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const originalRateRef = useRef(1);

  const handleLongPressStart = useCallback((side: "left" | "right" | "center") => {
    longPressTimerRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused) {
        originalRateRef.current = v.playbackRate;
        v.playbackRate = 2;
        setIsLongPressing(true);
      }
    }, 400);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isLongPressing && videoRef.current) {
      videoRef.current.playbackRate = originalRateRef.current;
      setIsLongPressing(false);
    }
  }, [isLongPressing]);

  // Touch gestures (MX Player style)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    setGestureType("none");
    // Start long press for 2x speed
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const relX = touch.clientX - rect.left;
      const side = relX < rect.width / 3 ? "left" : relX > rect.width * 2 / 3 ? "right" : "center";
      handleLongPressStart(side);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const container = containerRef.current;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const touchX = touchStartRef.current.x;
    const touchY = touchStartRef.current.y;
    const containerRect = container.getBoundingClientRect();
    if (touchY - containerRect.top > containerHeight * 0.5) return;

    if (gestureType === "none") {
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) setGestureType("seek");
      else if (Math.abs(deltaY) > 20) setGestureType(touchX < containerWidth / 2 ? "brightness" : "volume");
    }

    if (gestureType === "seek") {
      const seekSeconds = deltaX / containerWidth * duration * 0.5;
      setSeekOffset(seekSeconds);
      setGestureValue(seekSeconds);
    } else if (gestureType === "volume") {
      const newVolume = Math.max(0, Math.min(1, volume + -deltaY / containerHeight));
      setGestureValue(Math.round(newVolume * 100));
      if (videoRef.current) videoRef.current.volume = newVolume;
    } else if (gestureType === "brightness") {
      const newBrightness = Math.max(10, Math.min(100, brightness + -deltaY / containerHeight * 100));
      setGestureValue(Math.round(newBrightness));
    }
  };

  const handleTouchEnd = () => {
    handleLongPressEnd();
    if (gestureType === "seek" && videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seekOffset));
    } else if (gestureType === "volume" && videoRef.current) {
      setVolume(videoRef.current.volume);
    } else if (gestureType === "brightness") {
      setBrightness(gestureValue);
    }
    touchStartRef.current = null;
    setGestureType("none");
    setSeekOffset(0);
    setGestureValue(0);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    resetControlsTimer();
  };

  const handleVideoTap = () => {
    setShowControls(prev => !prev);
    if (!showControls) resetControlsTimer();
  };

  const skipToNextVideo = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (relatedVideos.length === 0) {
      toast.info("No next video available");
      return;
    }
    onVideoClick?.(relatedVideos[0]);
    resetControlsTimer();
  };

  const skipToPrevVideo = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (relatedVideos.length === 0) {
      toast.info("No previous video available");
      return;
    }
    onVideoClick?.(relatedVideos[relatedVideos.length - 1]);
    resetControlsTimer();
  };

  // Progress bar scrubbing
  const handleProgressPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingProgress(true);
    progressPointerIdRef.current = e.pointerId;
    progressRef.current?.setPointerCapture(e.pointerId);
    const bar = progressRef.current;
    if (!bar || !videoRef.current) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pct * duration;
  }, [duration]);

  const handleProgressPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingProgress) return;
    if (progressPointerIdRef.current !== null && e.pointerId !== progressPointerIdRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const bar = progressRef.current;
    if (!bar || !videoRef.current) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pct * duration;
  }, [isDraggingProgress, duration]);

  const handleProgressPointerUp = useCallback((e: React.PointerEvent) => {
    if (progressPointerIdRef.current !== null && e.pointerId !== progressPointerIdRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingProgress(false);
    progressPointerIdRef.current = null;
    progressRef.current?.releasePointerCapture(e.pointerId);
    resetControlsTimer();
  }, [resetControlsTimer]);

  const handleProgressPointerCancel = useCallback(() => {
    setIsDraggingProgress(false);
    progressPointerIdRef.current = null;
    resetControlsTimer();
  }, [resetControlsTimer]);

  const handleLike = async () => {
    if (!user) { toast.error("Please sign in to like videos"); return; }
    triggerAnim(setLikeAnim);
    if (isLiked) {
      await unlikeVideo(video.id);
      setLikeCount((p) => Math.max(0, p - 1));
    } else {
      await likeVideo(video.id);
      setLikeCount((p) => p + 1);
      setShowFloatingHearts(true);
      setTimeout(() => setShowFloatingHearts(false), 1000);
    }
    setIsLiked(!isLiked);
  };

  const handleSave = async () => {
    if (!user) { toast.error("Please sign in to save videos"); return; }
    triggerAnim(setSaveAnim);
    if (isSaved) { await unsaveVideo(video.id); toast("Removed from saved"); }
    else { await saveVideo(video.id); toast.success("Saved to your profile!"); }
    setIsSaved(!isSaved);
  };

  const handleShare = () => {
    triggerAnim(setShareAnim);
    setShowShareSheet(true);
  };

  const handleDownload = async () => {
    toast.info("Download started...");
    try {
      const response = await fetch(video.video_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${video.caption || "video"}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded successfully!");
    } catch { toast.error("Download failed"); }
  };

  const toggleMute = () => {
    if (videoRef.current) { videoRef.current.muted = !isMuted; setIsMuted(!isMuted); }
  };

  const handleNextVideo = () => { if (relatedVideos.length > 0) onVideoClick?.(relatedVideos[0]); };
  const handlePrevVideo = () => { if (relatedVideos.length > 1) onVideoClick?.(relatedVideos[relatedVideos.length - 1]); };

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {
        const v = videoRef.current;
        if (v && (v as any).webkitEnterFullscreen) (v as any).webkitEnterFullscreen();
      });
    }
  };

  const handleMiniPlayer = () => {
    const v = videoRef.current;
    if (!v) return;
    const time = v.currentTime;
    v.pause();
    if (onMiniPlayer) {
      onMiniPlayer(video, time);
    } else {
      setMiniPlayerTime(time);
      setShowMiniPlayer(true);
    }
    onBack();
  };

  const handleToggleVideoPrivacy = async () => {
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
    setShowMoreMenu(false);
  };

  const handleToggleVideoComments = async () => {
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
    setShowMoreMenu(false);
  };

  const handleDeleteVideo = async () => {
    if (!user || !isOwner) return;
    const { error } = await supabase.from("videos").delete().eq("id", video.id).eq("user_id", user.id);
    if (error) {
      toast.error("Failed to delete video");
      return;
    }
    toast.success("Video deleted");
    setShowMoreMenu(false);
    onBack();
  };

  const handleBlockCreator = async () => {
    if (!user || isOwner) return;
    const { error } = await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: video.user_id });
    if (error) {
      toast.error("Failed to block user");
      return;
    }
    toast.success("User blocked");
    setShowMoreMenu(false);
  };

  // Not Interested - actually hide it
  const handleNotInterested = async () => {
    if (!user) { toast.error("Please sign in"); return; }
    try {
      await supabase.from("activity_log").insert({
        user_id: user.id,
        target_user_id: video.user_id,
        video_id: video.id,
        activity_type: "not_interested",
      });
      toast.success("We'll show less content like this");
      setShowMoreMenu(false);
      // Navigate back to thumbnail feed
      onBack();
    } catch {
      toast.error("Something went wrong");
    }
  };

  // Report video
  const handleReportSubmit = async (reason: string) => {
    if (!user) { toast.error("Please sign in to report"); return; }
    setReportSubmitting(true);
    try {
      await supabase.functions.invoke("ai-moderator", {
        body: {
          action: "report",
          videoId: video.id,
          reporterId: user.id,
          reason,
          videoUrl: video.video_url,
          caption: video.caption,
          creatorId: video.user_id,
        },
      });
      toast.success("Report submitted. Our team will review it.");
    } catch {
      toast.error("Failed to submit report");
    }
    setReportSubmitting(false);
    setShowReportSheet(false);
    setShowMoreMenu(false);
    setCustomReport("");
  };

  const progressPercent = duration > 0 ? currentTime / duration * 100 : 0;
  const realDescription = video.description || "";
  const realLink = video.external_link || null;

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col lg:flex-row">
        {/* Video + Actions Column */}
        <div className="flex-1 flex flex-col lg:max-w-[calc(100%-380px)] xl:max-w-[calc(100%-420px)]">
        {/* Sticky Video Player */}
        <div className={`sticky top-0 z-40 bg-black ${isFullscreen ? "fixed inset-0 z-[9999]" : ""}`}>
          <div
            ref={containerRef}
            className={`relative bg-black ${isFullscreen ? "w-full h-full" : "aspect-video"}`}
            onClick={handleVideoTap}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={() => handleLongPressStart("center")}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            style={{ filter: `brightness(${brightness}%)` }}
          >
            <video
              ref={videoRef}
              src={video.video_url}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              preload="auto"
            />

            {/* 2x Speed indicator */}
            <AnimatePresence>
              {isLongPressing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm pointer-events-none">
                  <span className="text-xs font-bold text-white">2x Speed ▶▶</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading */}
            <AnimatePresence>
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Gesture HUD */}
            <AnimatePresence>
              {gestureType !== "none" && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
                  <div className="px-6 py-4 rounded-xl bg-black/70 backdrop-blur-md flex flex-col items-center gap-2">
                    {gestureType === "seek" && (
                      <>
                        <span className="text-2xl font-bold text-white">{seekOffset >= 0 ? "+" : ""}{Math.round(seekOffset)}s</span>
                        <span className="text-xs text-white/60">{formatTime(currentTime + seekOffset)} / {formatTime(duration)}</span>
                      </>
                    )}
                    {gestureType === "volume" && (
                      <><Volume2 className="w-6 h-6 text-white" /><span className="text-lg font-bold text-white">{gestureValue}%</span></>
                    )}
                    {gestureType === "brightness" && (
                      <><Sun className="w-6 h-6 text-white" /><span className="text-lg font-bold text-white">{gestureValue}%</span></>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ========== CONTROLS OVERLAY ========== */}
            <AnimatePresence>
              {showControls && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/15 z-20 pointer-events-none"
                  />

                  {/* Back button */}
                  <motion.button
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={(e) => { e.stopPropagation(); onBack(); }}
                    className="absolute top-3 left-3 z-50 p-2 rounded-full bg-black/40 backdrop-blur-sm"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </motion.button>

                  {/* Top right: Mute */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute top-3 right-3 z-50 flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                      className="p-2 rounded-full bg-black/40 backdrop-blur-sm">
                      {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                    </button>
                  </motion.div>

                  {/* CENTER: Skip Back | Play/Pause | Skip Forward */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-x-0 bottom-16 sm:top-1/2 sm:-translate-y-1/2 sm:bottom-auto flex items-center justify-center gap-10 z-40"
                  >
                    <button
                      onClick={skipToPrevVideo}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      className="p-3 rounded-full bg-black/30 active:scale-90 transition-transform"
                    >
                      <SkipBack className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                      className="p-4 rounded-full bg-black/30 active:scale-90 transition-transform">
                      {isPlaying ? (
                        <Pause className="w-6 h-6 text-white fill-white" />
                      ) : (
                        <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                      )}
                    </button>
                    <button
                      onClick={skipToNextVideo}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      className="p-3 rounded-full bg-black/30 active:scale-90 transition-transform"
                    >
                      <SkipForward className="w-5 h-5 text-white" />
                    </button>
                  </motion.div>

                  {/* Bottom bar: time + progress + fullscreen + miniplayer */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-0 left-0 right-0 z-50 px-3 pb-2 pt-6 bg-gradient-to-t from-black/40 to-transparent"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      ref={progressRef}
                      onPointerDown={handleProgressPointerDown}
                      onPointerMove={handleProgressPointerMove}
                      onPointerUp={handleProgressPointerUp}
                      onPointerCancel={handleProgressPointerCancel}
                      onLostPointerCapture={handleProgressPointerCancel}
                      className="relative h-6 w-full flex items-center cursor-pointer touch-none mb-1"
                    >
                      <div className="absolute left-0 right-0 h-[3px] bg-white/30 rounded-full">
                        <div className="h-full bg-blue-500 rounded-full relative" style={{ width: `${progressPercent}%` }}>
                          <div className={`absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-blue-500 shadow-md transition-all duration-150 ${isDraggingProgress ? "w-5 h-5 -translate-x-1/2" : "w-3 h-3"}`} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-white/90 tabular-nums">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                      <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); handleMiniPlayer(); }}
                          className="p-1" title="Mini player">
                          <Minimize2 className="w-4 h-4 text-white" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleFullscreen(); }}
                          className="p-1" title="Fullscreen">
                          {isFullscreen ? <Minimize className="w-4 h-4 text-white" /> : <Maximize className="w-4 h-4 text-white" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Mini progress when controls hidden */}
            {!showControls && (
              <div className="absolute bottom-0 left-0 right-0 z-30">
                <div className="h-[2px] bg-muted-foreground/30">
                  <div className="h-full bg-blue-500" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons with Animations */}
          {!isFullscreen && (
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-background/95 backdrop-blur-sm border-b border-border relative">
              {/* Floating Hearts */}
              <AnimatePresence>
                {showFloatingHearts && (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={`fh-${i}`}
                        initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
                        animate={{
                          opacity: 0,
                          y: -(50 + Math.random() * 40),
                          x: (Math.random() - 0.5) * 50,
                          scale: 0.6 + Math.random() * 0.5,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, delay: i * 0.05 }}
                        className="absolute top-0 left-8 pointer-events-none z-50"
                      >
                        <ThumbsUp className="w-4 h-4 text-blue-400 fill-blue-400" />
                      </motion.div>
                    ))}
                  </>
                )}
              </AnimatePresence>

              {/* Like */}
              <motion.button
                animate={likeAnim ? { scale: [1, 1.35, 0.9, 1.15, 1] } : { scale: 1 }}
                transition={likeAnim ? { duration: 0.45 } : { duration: 0.15 }}
                whileTap={{ scale: 0.85 }}
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full border transition-colors ${isLiked ? "bg-blue-500/20 border-blue-500/50 text-blue-400" : "bg-muted/50 border-border hover:bg-muted text-foreground"}`}
              >
                <ThumbsUp className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                <span className="text-xs font-medium">{formatNumber(likeCount)}</span>
              </motion.button>

              {/* Comment */}
              <motion.button
                animate={commentAnim ? { scale: [1, 1.2, 0.9, 1.1, 1], rotate: [0, -6, 6, 0] } : { scale: 1 }}
                transition={commentAnim ? { duration: 0.4 } : { duration: 0.15 }}
                whileTap={{ scale: 0.85 }}
                onClick={() => { setShowComments(true); triggerAnim(setCommentAnim); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 border border-border hover:bg-muted transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-foreground" />
                <span className="text-xs font-medium text-foreground">{formatNumber(video.comment_count)}</span>
              </motion.button>

              {/* Share */}
              <motion.button
                animate={shareAnim ? { scale: [1, 1.2, 0.9, 1.1, 1], rotate: [0, 12, -8, 0] } : { scale: 1 }}
                transition={shareAnim ? { duration: 0.4 } : { duration: 0.15 }}
                whileTap={{ scale: 0.85 }}
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 border border-border hover:bg-muted transition-colors"
              >
                <Share2 className="w-4 h-4 text-foreground" />
                <span className="text-xs font-medium text-foreground">Share</span>
              </motion.button>

              {/* Gift */}
              <motion.button
                animate={giftAnim ? { scale: [1, 1.3, 0.85, 1.15, 1], rotate: [0, -8, 8, 0] } : { scale: 1 }}
                transition={giftAnim ? { duration: 0.5 } : { duration: 0.15 }}
                whileTap={{ scale: 0.85 }}
                onClick={() => {
                  if (!user) { toast.error("Please sign in to send gifts"); return; }
                  setShowGiftSheet(true);
                  triggerAnim(setGiftAnim);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 border border-border hover:bg-muted transition-colors"
              >
                <Gift className="w-4 h-4 text-foreground" />
                <span className="text-xs font-medium text-foreground">{formatNumber(video.gift_count)}</span>
              </motion.button>

              {/* Save */}
              <motion.button
                animate={saveAnim ? { scale: [1, 1.25, 0.9, 1.1, 1], y: [0, -3, 0] } : { scale: 1 }}
                transition={saveAnim ? { duration: 0.4 } : { duration: 0.15 }}
                whileTap={{ scale: 0.85 }}
                onClick={handleSave}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full border transition-colors ${isSaved ? "bg-blue-500/20 border-blue-500/50 text-blue-400" : "bg-muted/50 border-border hover:bg-muted text-foreground"}`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                <span className="text-xs font-medium">{formatNumber(video.save_count)}</span>
              </motion.button>

              {/* More */}
              <button onClick={() => setShowMoreMenu(true)}
                className="flex items-center gap-1.5 p-2 rounded-full bg-muted/50 border-border hover:bg-muted transition-colors">
                <MoreVertical className="w-4 h-4 text-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        {!isFullscreen && !showComments && (
          <div className="flex-1 overflow-y-auto pb-24">
            {/* Title + More button */}
            <div className="px-4 pt-3">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-base font-bold text-foreground leading-tight flex-1">
                  {video.caption || "Untitled Video"}
                </h1>
                <button onClick={() => setShowDescription(!showDescription)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors shrink-0">
                  <ChevronRight className={`w-4 h-4 text-foreground/70 transition-transform ${showDescription ? "rotate-90" : ""}`} />
                  <span className="text-[10px] text-foreground/70 font-medium">More</span>
                </button>
              </div>
              <p className="text-xs text-cyan-400 mt-1">
                {formatViews(video.view_count)} • {formatDuration(duration)} • Uploaded{" "}
                {formatDistanceToNow(new Date(video.created_at), { addSuffix: false })} ago
              </p>

              <AnimatePresence>
                {showDescription && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="mt-3 p-3 rounded-xl bg-muted/30 border border-border/50 space-y-3">
                      {realDescription ? (
                        <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap"><RenderTextWithLinks text={realDescription} /></div>
                      ) : (
                        <p className="text-sm text-foreground/50 italic">No description provided.</p>
                      )}
                      {realLink && (
                        <div className="pt-2 border-t border-border/30">
                          <a href={realLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary hover:underline">
                            <Link2 className="w-4 h-4" /> {realLink}
                          </a>
                        </div>
                      )}
                      {video.location && <p className="text-xs text-foreground/50">📍 {video.location}</p>}
                      {video.age_restriction && video.age_restriction !== "everyone" && (
                        <p className="text-xs text-amber-400">⚠️ Age restriction: {video.age_restriction}</p>
                      )}
                      {video.tags && video.tags.length > 0 && (
                        <div className="pt-2 border-t border-border/30">
                          <p className="text-xs text-foreground/50 mb-2">Tags:</p>
                          <div className="flex flex-wrap gap-2">
                            {video.tags.map((tag, idx) => (
                              <span key={idx} className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary">#{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="pt-2 border-t border-border/30">
                        <button onClick={() => navigate(`/user/${video.user_id}`)} className="text-xs text-primary hover:underline">
                          View Creator Profile →
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Creator Info */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border/30">
              <button className="flex items-center gap-3" onClick={() => navigate(`/user/${video.user_id}`)}>
                <Avatar className="w-12 h-12 border-2 border-primary/30">
                  <AvatarImage src={video.profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {video.profile?.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">
                      {video.profile?.display_name || video.profile?.username || "Creator"}
                    </span>
                    <BadgeCheck className="w-4 h-4 text-primary fill-primary/20" />
                  </div>
                  <p className="text-xs text-foreground/50 flex items-center gap-1 mt-0.5">
                    <span className="text-primary">👥</span> {formatNumber(video.profile?.total_followers)} Fans
                  </p>
                </div>
              </button>
              <button className="px-6 py-2 rounded-full bg-gradient-to-r from-primary to-cyan-400 text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20">
                Follow
              </button>
            </div>

            {/* Related Videos - only on mobile/tablet */}
            <div className="lg:hidden">
            {relatedVideos.length > 0 && (
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-base font-bold text-foreground">Related Videos</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-4">
                  {relatedVideos.slice(0, 6).map((relVideo) => (
                    <RelatedVideoItem key={relVideo.id} video={relVideo} onClick={() => onVideoClick?.(relVideo)} />
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
        )}
        </div>{/* end video+actions column */}

        {/* Desktop Right Sidebar - Related Videos */}
        <div className="hidden lg:block w-[380px] xl:w-[420px] border-l border-border/20 overflow-y-auto h-screen sticky top-0">
          <div className="p-4">
            <h3 className="text-sm font-bold text-foreground mb-4">Related Videos</h3>
            <div className="space-y-3">
              {relatedVideos.slice(0, 12).map((relVideo) => (
                <RelatedVideoItem key={relVideo.id} video={relVideo} onClick={() => onVideoClick?.(relVideo)} />
              ))}
            </div>
          </div>
        </div>

        {/* Comments Panel - ALWAYS at bottom (YouTube style) for both mobile and desktop */}
        <AnimatePresence>
          {showComments && !isFullscreen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-background rounded-t-3xl border-t border-border"
              style={{ height: "60vh", maxHeight: "60vh" }}
            >
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-2 mb-1" />
              <RealCommentsOverlay isOpen={true} onClose={() => setShowComments(false)} video={video} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* More Menu */}
        <AnimatePresence>
          {showMoreMenu && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowMoreMenu(false)}>
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl p-4"
                onClick={(e) => e.stopPropagation()}>
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
                <div className="space-y-1">
                  {isOwner ? (
                    <>
                      <button onClick={handleToggleVideoPrivacy}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted transition-colors">
                        {video.is_public ? <Lock className="w-5 h-5 text-foreground" /> : <Globe className="w-5 h-5 text-foreground" />}
                        <span className="text-foreground font-medium">{video.is_public ? "Make Private" : "Make Public"}</span>
                        <ChevronRight className="w-4 h-4 text-foreground/50 ml-auto" />
                      </button>
                      <button onClick={handleToggleVideoComments}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted transition-colors">
                        {video.allow_comments ? <BellOff className="w-5 h-5 text-foreground" /> : <Bell className="w-5 h-5 text-foreground" />}
                        <span className="text-foreground font-medium">{video.allow_comments ? "Turn Off Comments" : "Turn On Comments"}</span>
                        <ChevronRight className="w-4 h-4 text-foreground/50 ml-auto" />
                      </button>
                      <button onClick={() => { handleDownload(); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted transition-colors">
                        <Download className="w-5 h-5 text-foreground" />
                        <span className="text-foreground font-medium">Download Video</span>
                        <ChevronRight className="w-4 h-4 text-foreground/50 ml-auto" />
                      </button>
                      <button onClick={() => { handleShare(); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted transition-colors">
                        <Share2 className="w-5 h-5 text-foreground" />
                        <span className="text-foreground font-medium">Share</span>
                        <ChevronRight className="w-4 h-4 text-foreground/50 ml-auto" />
                      </button>
                      <button onClick={handleDeleteVideo}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted transition-colors">
                        <Trash2 className="w-5 h-5 text-red-400" />
                        <span className="text-red-400 font-medium">Delete Video</span>
                        <ChevronRight className="w-4 h-4 text-foreground/50 ml-auto" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleNotInterested}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted transition-colors">
                        <EyeOff className="w-5 h-5 text-foreground" />
                        <span className="text-foreground font-medium">Not Interested</span>
                        <ChevronRight className="w-4 h-4 text-foreground/50 ml-auto" />
                      </button>
                      <button onClick={handleBlockCreator}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted transition-colors">
                        <UserX className="w-5 h-5 text-foreground" />
                        <span className="text-foreground font-medium">Block User</span>
                        <ChevronRight className="w-4 h-4 text-foreground/50 ml-auto" />
                      </button>
                      <button onClick={() => { handleDownload(); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted transition-colors">
                        <Download className="w-5 h-5 text-foreground" />
                        <span className="text-foreground font-medium">Download Video</span>
                        <ChevronRight className="w-4 h-4 text-foreground/50 ml-auto" />
                      </button>
                      <button onClick={() => { handleSave(); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted transition-colors">
                        <Bookmark className={`w-5 h-5 ${isSaved ? "text-blue-400 fill-current" : "text-foreground"}`} />
                        <span className="text-foreground font-medium">{isSaved ? "Remove from Saved" : "Save to Playlist"}</span>
                        <ChevronRight className="w-4 h-4 text-foreground/50 ml-auto" />
                      </button>
                      <button onClick={() => { handleShare(); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted transition-colors">
                        <Share2 className="w-5 h-5 text-foreground" />
                        <span className="text-foreground font-medium">Share</span>
                        <ChevronRight className="w-4 h-4 text-foreground/50 ml-auto" />
                      </button>
                      <button
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted transition-colors"
                        onClick={() => { setShowReportSheet(true); setShowMoreMenu(false); }}>
                        <Flag className="w-5 h-5 text-red-400" />
                        <span className="text-red-400 font-medium">Report</span>
                        <ChevronRight className="w-4 h-4 text-foreground/50 ml-auto" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Sheet */}
        <AnimatePresence>
          {showReportSheet && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={() => setShowReportSheet(false)}>
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl p-4 max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}>
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3" />
                <h3 className="text-lg font-bold text-foreground text-center mb-4">Report Video</h3>
                <p className="text-xs text-foreground/50 text-center mb-4">Why are you reporting this video?</p>
                <div className="space-y-2">
                  {REPORT_REASONS.map((r) => (
                    <button key={r.label}
                      onClick={() => handleReportSubmit(r.label)}
                      disabled={reportSubmitting}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors border border-border/30">
                      <r.icon className="w-5 h-5 text-foreground/70" />
                      <span className="text-foreground text-sm font-medium">{r.label}</span>
                    </button>
                  ))}
                </div>
                {/* Custom reason */}
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-foreground/50">Or describe your issue:</p>
                  <textarea
                    value={customReport}
                    onChange={(e) => setCustomReport(e.target.value)}
                    placeholder="Describe the problem..."
                    className="w-full bg-muted/50 border border-border rounded-xl p-3 text-sm text-foreground resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => {
                      if (!customReport.trim()) { toast.error("Please describe the issue"); return; }
                      handleReportSubmit(customReport);
                    }}
                    disabled={reportSubmitting || !customReport.trim()}
                    className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
                  >
                    {reportSubmitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gift Sheet */}
        <GiftSheet
          open={showGiftSheet} onOpenChange={setShowGiftSheet}
          onSendGift={(gift, quantity) => { toast.success(`Sent ${quantity}x ${gift.name}!`); }}
          creatorName={video.profile?.display_name || video.profile?.username}
          creatorAvatar={video.profile?.avatar_url || undefined}
        />

        {/* Share Sheet */}
        <ShareSheet
          isOpen={showShareSheet}
          onClose={() => setShowShareSheet(false)}
          video={video}
        />
      </div>

      {/* Mini Player */}
      {showMiniPlayer && (
        <MiniPlayer
          videoUrl={video.video_url}
          currentTime={miniPlayerTime}
          onClose={() => setShowMiniPlayer(false)}
          onReturn={() => {
            setShowMiniPlayer(false);
            onVideoClick?.(video);
          }}
        />
      )}
    </>
  );
};
