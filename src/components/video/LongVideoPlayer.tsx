import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, RotateCw, Loader2 } from "lucide-react";
import { Video } from "@/hooks/useVideos";

interface LongVideoPlayerProps {
  video: Video;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const LongVideoPlayer = ({ video }: LongVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
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
    const v = videoRef.current;
    if (!v) return;

    const handleTimeUpdate = () => setCurrentTime(v.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(v.duration);
      setIsLoading(false);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    v.addEventListener("timeupdate", handleTimeUpdate);
    v.addEventListener("loadedmetadata", handleLoadedMetadata);
    v.addEventListener("play", handlePlay);
    v.addEventListener("pause", handlePause);
    v.addEventListener("waiting", handleWaiting);
    v.addEventListener("canplay", handleCanPlay);

    return () => {
      v.removeEventListener("timeupdate", handleTimeUpdate);
      v.removeEventListener("loadedmetadata", handleLoadedMetadata);
      v.removeEventListener("play", handlePlay);
      v.removeEventListener("pause", handlePause);
      v.removeEventListener("waiting", handleWaiting);
      v.removeEventListener("canplay", handleCanPlay);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(console.log);
    } else {
      v.pause();
    }
  };

  const seekForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(v.currentTime + 10, v.duration);
  };

  const seekBackward = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(v.currentTime - 10, 0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    v.currentTime = percent * duration;
  };

  const handleProgressDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    
    const v = videoRef.current;
    if (!v || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = percent * duration;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    
    const v = videoRef.current;
    if (!v || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width));
    v.currentTime = percent * duration;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="relative aspect-video rounded-2xl overflow-hidden bg-black"
      onClick={() => setShowControls((prev) => !prev)}
    >
      <video
        ref={videoRef}
        src={video.video_url}
        poster={video.thumbnail_url || undefined}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
      />

      {/* Loading indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/30"
          >
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <>
            {/* Controls overlay background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/30 pointer-events-none"
            />

            {/* Center controls */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center gap-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Backward */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={seekBackward}
                className="relative p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
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
                className="relative p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
              >
                <RotateCw className="w-6 h-6 text-white" />
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/70">10s</span>
              </motion.button>
            </motion.div>

            {/* Progress bar with duration */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-4 left-4 right-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/80 font-medium min-w-[40px]">
                  {formatTime(currentTime)}
                </span>
                
                <div 
                  className="flex-1 h-8 flex items-center cursor-pointer"
                  onClick={handleProgressClick}
                  onMouseDown={() => setIsDragging(true)}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseLeave={() => setIsDragging(false)}
                  onMouseMove={handleProgressDrag}
                  onTouchStart={() => setIsDragging(true)}
                  onTouchEnd={() => setIsDragging(false)}
                  onTouchMove={handleTouchMove}
                >
                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-[width] duration-100"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <span className="text-xs text-white/80 font-medium min-w-[40px] text-right">
                  {formatTime(duration)}
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mini progress bar when controls hidden */}
      {!showControls && (
        <div className="absolute bottom-0 left-0 right-0">
          <div className="h-1 bg-white/20">
            <div 
              className="h-full bg-blue-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
