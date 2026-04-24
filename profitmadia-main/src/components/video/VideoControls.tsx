import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, RotateCw } from "lucide-react";

interface VideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive?: boolean;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const VideoControls = ({ videoRef, isActive = true }: VideoControlsProps) => {
  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (!showControls || isDragging) return;
    
    const timer = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls, isPlaying, isDragging]);

  // Sync with video state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleDurationChange = () => setDuration(video.duration);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    // Initialize state
    setDuration(video.duration || 0);
    setCurrentTime(video.currentTime || 0);
    setIsPlaying(!video.paused);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [videoRef, isActive]);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(console.log);
    } else {
      video.pause();
    }
  }, [videoRef]);

  const seekForward = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.currentTime + 10, video.duration);
  }, [videoRef]);

  const seekBackward = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(video.currentTime - 10, 0);
  }, [videoRef]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * duration;
  }, [videoRef, duration]);

  const handleProgressDrag = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    
    const video = videoRef.current;
    if (!video || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    video.currentTime = percent * duration;
  }, [videoRef, duration, isDragging]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    
    const video = videoRef.current;
    if (!video || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width));
    video.currentTime = percent * duration;
  }, [videoRef, duration, isDragging]);

  const handleTap = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isActive) return null;

  return (
    <>
      {/* Tap area to show/hide controls */}
      <div 
        className="absolute inset-0 z-20" 
        onClick={handleTap}
      />

      <AnimatePresence>
        {showControls && (
          <>
            {/* Controls overlay background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/30 z-30 pointer-events-none"
            />

            {/* Center controls */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center gap-8 z-40"
            >
              {/* Backward */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={seekBackward}
                className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
              >
                <RotateCcw className="w-6 h-6 text-white" />
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/70">10s</span>
              </motion.button>

              {/* Play/Pause */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                className="p-5 rounded-full bg-white/20 backdrop-blur-md border border-white/30"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white fill-white" />
                ) : (
                  <Play className="w-8 h-8 text-white fill-white ml-1" />
                )}
              </motion.button>

              {/* Forward */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={seekForward}
                className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
              >
                <RotateCw className="w-6 h-6 text-white" />
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/70">10s</span>
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </>
  );
};
