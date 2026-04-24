import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, AlertCircle, RefreshCw, Pause } from "lucide-react";
import { Video, useVideoActions } from "@/hooks/useVideos";
import { RealVideoActions } from "./RealVideoActions";
import { RealVideoInfo } from "./RealVideoInfo";
import { App as RealCommentsOverlay } from "./RealCommentsOverlay";
import { ShareSheet } from "./ShareSheet";
import { VideoProgressBar } from "./VideoProgressBar";
import { LikeBurstAnimation } from "./LikeBurstAnimation";
import { SoundDetailsPage } from "./SoundDetailsPage";
import { useAuth } from "@/contexts/AuthContext";

interface RealVideoCardProps {
  video: Video;
  isActive: boolean;
}

export const RealVideoCard = ({
  video,
  isActive
}: RealVideoCardProps) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showSoundPage, setShowSoundPage] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [likeCount, setLikeCount] = useState(video.like_count);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseIndicator, setShowPauseIndicator] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [showLikeBurst, setShowLikeBurst] = useState(false);

  const { likeVideo, unlikeVideo, checkLiked } = useVideoActions();

  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalPlaybackRateRef = useRef<number>(1);
  const progressBarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      checkLiked(video.id).then(setIsLiked);
    }
  }, [user, video.id, checkLiked]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    if (isActive && !videoError && !isPaused) {
      if (videoElement.currentTime === 0 || videoElement.ended) {
        videoElement.currentTime = 0;
      }
      videoElement.volume = 1.0;
      videoElement.muted = false;
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsLoading(false);
          setIsMuted(false);
        }).catch(error => {
          videoElement.muted = true;
          setIsMuted(true);
          videoElement.play().then(() => setIsLoading(false)).catch(() => {});
        });
      }
    } else if (!isActive) {
      videoElement.pause();
    }
  }, [isActive, videoError, video.id, isPaused]);

  // Seek handler
  const handleSeek = useCallback((pct: number) => {
    const vid = videoRef.current;
    if (!vid || !vid.duration) return;
    vid.currentTime = (pct / 100) * vid.duration;
    setProgress(pct);
    setCurrentTime(vid.currentTime);
  }, []);

  const handleSingleTap = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    setShowProgressBar(true);
    if (progressBarTimeoutRef.current) clearTimeout(progressBarTimeoutRef.current);
    progressBarTimeoutRef.current = setTimeout(() => setShowProgressBar(false), 3000);

    if (videoElement.paused) {
      videoElement.play().catch(() => {});
      setIsPaused(false);
      setShowPauseIndicator(false);
    } else {
      videoElement.pause();
      setIsPaused(true);
      setShowPauseIndicator(true);
      // Auto-hide pause indicator after 3 seconds
      setTimeout(() => setShowPauseIndicator(false), 3000);
    }
  }, []);

  const handleDoubleTap = useCallback(async () => {
    if (!isLiked) {
      setShowHeartAnimation(true);
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      await likeVideo(video.id);
      setTimeout(() => setShowHeartAnimation(false), 1000);
    }
  }, [isLiked, likeVideo, video.id]);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    if (timeSinceLastTap < 300) {
      handleDoubleTap();
      lastTapRef.current = 0;
    } else {
      tapTimeoutRef.current = setTimeout(() => {
        handleSingleTap();
        tapTimeoutRef.current = null;
      }, 300);
      lastTapRef.current = now;
    }
  }, [handleDoubleTap, handleSingleTap]);

  const handleLongPressStart = useCallback(() => {
    longPressTimeoutRef.current = setTimeout(() => {
      const videoElement = videoRef.current;
      if (videoElement && !videoElement.paused) {
        originalPlaybackRateRef.current = videoElement.playbackRate;
        videoElement.playbackRate = 2;
        setIsLongPressing(true);
      }
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    const videoElement = videoRef.current;
    if (videoElement && isLongPressing) {
      videoElement.playbackRate = originalPlaybackRateRef.current;
      setIsLongPressing(false);
    }
  }, [isLongPressing]);

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
      if (progressBarTimeoutRef.current) clearTimeout(progressBarTimeoutRef.current);
    };
  }, []);

  const handleLikeLongPress = useCallback(async () => {
    setShowLikeBurst(true);
    if (!isLiked) {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      await likeVideo(video.id);
    }
  }, [isLiked, likeVideo, video.id]);

  const handleLike = async () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount(prev => prev - 1);
      await unlikeVideo(video.id);
    } else {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      await likeVideo(video.id);
    }
  };

  const handleVideoError = useCallback(() => {
    // Only show error if video hasn't loaded at all, not for transient errors
    const v = videoRef.current;
    if (v && v.readyState >= 2) return; // HAVE_CURRENT_DATA - video already loaded some data
    setVideoError(true);
    setIsLoading(false);
    setIsBuffering(false);
  }, []);

  const handleVideoLoaded = useCallback(() => {
    setIsLoading(false);
    setVideoError(false);
  }, []);

  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setVideoError(false);
    setIsLoading(true);
    setRetryCount(prev => prev + 1);
    if (videoRef.current) videoRef.current.load();
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
      {/* Video Player - animates to top when comments open */}
      <motion.div
        className="relative w-full overflow-hidden shrink-0"
        animate={{
          height: showComments ? "35%" : "100%",
        }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        style={{ minHeight: showComments ? "200px" : undefined }}
      >
        <div
          className="absolute inset-0"
          onClick={handleTap}
          onMouseDown={handleLongPressStart}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
          onTouchStart={handleLongPressStart}
          onTouchEnd={handleLongPressEnd}
        >
          <video
            key={`${video.id}-${retryCount}`}
            ref={videoRef}
            src={video.video_url}
            poster={video.thumbnail_url || undefined}
            className="w-full h-full object-contain bg-black"
            loop
            playsInline
            webkit-playsinline="true"
            muted={isMuted}
            preload="metadata"
            onError={handleVideoError}
            onLoadedData={handleVideoLoaded}
            onCanPlay={() => { setIsLoading(false); setVideoError(false); }}
            onCanPlayThrough={() => { setIsLoading(false); setIsBuffering(false); }}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => { setIsLoading(false); setIsBuffering(false); setIsPaused(false); setShowPauseIndicator(false); }}
            onPause={() => setIsPaused(true)}
            onStalled={() => setIsBuffering(true)}
            onProgress={() => setIsBuffering(false)}
            onLoadedMetadata={() => {
              const vid = videoRef.current;
              if (vid) setDuration(vid.duration);
            }}
            onTimeUpdate={() => {
              const vid = videoRef.current;
              if (vid && vid.duration) {
                setProgress((vid.currentTime / vid.duration) * 100);
                setCurrentTime(vid.currentTime);
              }
            }}
          />

          {!showComments && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-70 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />
            </>
          )}

          {/* Pause Indicator - semi-transparent, auto-hides */}
          <AnimatePresence>
            {showPauseIndicator && isPaused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.6, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="bg-black/30 p-4 rounded-full backdrop-blur-sm">
                  <Pause className="w-8 h-8 text-white/80 fill-white/80" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2x Speed */}
          <AnimatePresence>
            {isLongPressing && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
              >
                <div className="bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
                  <span className="text-white text-sm font-semibold">2x Speed</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {videoError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80"
              >
                <AlertCircle className="w-12 h-12 text-destructive" />
                <p className="text-sm text-muted-foreground text-center px-4">Video couldn't be loaded</p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRetry}
                  className="glass px-6 py-3 rounded-full flex items-center gap-2 text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Double Tap Heart */}
          <AnimatePresence>
            {showHeartAnimation && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1.5 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <Heart className="w-28 h-28 text-red-500 fill-red-500 drop-shadow-2xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Video Info - only show when comments are closed */}
      {!showComments && <RealVideoInfo video={video} />}

      {/* Action Buttons - only show when comments are closed */}
      {!showComments && (
        <div className="absolute right-1 bottom-[56px] z-10 pointer-events-auto max-h-[60vh] overflow-y-auto overflow-x-hidden">
          <RealVideoActions
            video={video}
            isLiked={isLiked}
            likeCount={likeCount}
            onLike={handleLike}
            onCommentClick={() => {
              if (!video.allow_comments) return;
              setShowComments(true);
            }}
            onShareClick={() => setShowShareSheet(true)}
            onLikeLongPress={handleLikeLongPress}
            onSoundClick={() => setShowSoundPage(true)}
            commentsDisabled={!video.allow_comments}
          />
        </div>
      )}

      {/* Comments section - fills remaining space below video */}
      {showComments && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <RealCommentsOverlay
            isOpen={showComments}
            onClose={() => setShowComments(false)}
            video={video}
          />
        </div>
      )}

      {/* Share Sheet */}
      <ShareSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        video={video}
      />

      {/* Seekable Progress Bar - only when comments closed */}
      {!showComments && (
        <VideoProgressBar
          progress={progress}
          currentTime={currentTime}
          duration={duration}
          visible={showProgressBar}
          onSeek={handleSeek}
        />
      )}

      {/* Like Burst */}
      <LikeBurstAnimation
        show={showLikeBurst}
        onComplete={() => setShowLikeBurst(false)}
      />

      {/* Sound Details Page */}
      <SoundDetailsPage
        isOpen={showSoundPage}
        onClose={() => setShowSoundPage(false)}
        musicTitle={video.music_title || "Original Sound"}
        video={video}
      />
    </div>
  );
};
