import { useState, useRef, useEffect } from "react";
import { X, Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface OfflineVideoPlayerProps {
  blobUrl: string;
  caption?: string;
  onClose: () => void;
}

export const OfflineVideoPlayer = ({ blobUrl, caption, onClose }: OfflineVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls && isPlaying) {
      timeout = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls, isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      onClick={() => setShowControls(!showControls)}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Video */}
      <video
        ref={videoRef}
        src={blobUrl}
        className="max-h-full max-w-full"
        autoPlay
        playsInline
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
      />

      {/* Controls overlay */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: showControls ? 1 : 0 }}
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Caption */}
        {caption && (
          <p className="text-white text-sm mb-4 line-clamp-2">{caption}</p>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-white/80 w-10">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
          />
          <span className="text-xs text-white/80 w-10 text-right">{formatTime(duration)}</span>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white">
              {isPlaying ? (
                <Pause className="w-8 h-8 fill-white" />
              ) : (
                <Play className="w-8 h-8 fill-white" />
              )}
            </button>
            <button onClick={toggleMute} className="text-white">
              {isMuted ? (
                <VolumeX className="w-6 h-6" />
              ) : (
                <Volume2 className="w-6 h-6" />
              )}
            </button>
          </div>

          <button onClick={handleFullscreen} className="text-white">
            <Maximize2 className="w-6 h-6" />
          </button>
        </div>
      </motion.div>

      {/* Center play button when paused */}
      {!isPlaying && showControls && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-10 h-10 text-white fill-white ml-1" />
          </div>
        </button>
      )}
    </motion.div>
  );
};
