import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoData } from "@/data/mockVideos";
import { VideoActions } from "./VideoActions";
import { VideoInfo } from "./VideoInfo";
import { CommentsOverlay } from "./CommentsOverlay";
import { Play, Volume2, VolumeX, Maximize, X, Info } from "lucide-react";

interface VideoCardProps {
  video: VideoData;
  isActive: boolean;
}

export const VideoCard = ({ video, isActive }: VideoCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Auto-hide progress bar after 3 seconds of inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls) {
      timeout = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls]);

  // Video Playback Logic
  useEffect(() => {
    if (videoRef.current && isActive) {
      if (!isPaused && !showComments) {
        videoRef.current.play().catch((err) => console.log("Autoplay blocked", err));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive, isPaused, showComments]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const seekTime = parseFloat(e.target.value);
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleScreenClick = () => {
    setIsPaused(!isPaused);
    setShowControls(true); // Show progress bar on tap
  };

  return (
    <div className="relative w-full h-full bg-black flex flex-col overflow-hidden select-none">
      {/* 1. VIDEO PLAYER SECTION (70/30 SPLIT & FULL SIZE FIX) */}
      <motion.div
        animate={{ height: showComments ? "35vh" : "100vh" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full flex items-center justify-center bg-black overflow-hidden"
        onClick={handleScreenClick}
      >
        <video
          ref={videoRef}
          src={video.videoUrl}
          poster={video.thumbnail}
          loop
          muted={isMuted}
          playsInline
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          // Object-cover ensures the video fills the screen, object-contain is fallback for small videos
          className="w-full h-full object-cover sm:object-contain transition-all duration-500"
          style={{ maxHeight: showComments ? "35vh" : "100vh" }}
        />

        {/* 2. TOP CONTROLS: ROTATE & MUTE */}
        <div className="absolute top-6 right-4 z-50 flex flex-col gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              videoRef.current?.requestFullscreen();
            }}
            className="glass p-3 rounded-full active:scale-90 transition-all shadow-xl border border-white/10"
          >
            <Maximize size={22} className="text-white" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="glass p-3 rounded-full transition-all border border-white/10"
          >
            {isMuted ? <VolumeX size={22} className="text-white" /> : <Volume2 size={22} className="text-white" />}
          </button>
        </div>

        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <Play className="w-16 h-16 text-white/30 fill-current" />
          </div>
        )}
      </motion.div>

      {/* 3. SL BUTTON PANEL (REAL DESCRIPTION DRAWER) */}
      <AnimatePresence>
        {showDescription && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="absolute inset-x-0 bottom-0 h-[50vh] bg-zinc-950/98 z-[100] p-6 rounded-t-[32px] border-t border-white/10 backdrop-blur-2xl shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Info size={20} className="text-cyan-400" />
                <h3 className="text-white font-black text-lg uppercase tracking-widest">Description</h3>
              </div>
              <X
                onClick={() => setShowDescription(false)}
                className="text-white cursor-pointer hover:rotate-90 transition-transform"
              />
            </div>
            <div className="overflow-y-auto max-h-[35vh] custom-scrollbar">
              <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                {video.description || "The creator has not provided a description for this video."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. SIDE ACTIONS (RIGHT SIDE) */}
      {!showComments && (
        <div className="absolute right-4 bottom-32 z-40 flex flex-col gap-6 items-center">
          {/* SL BUTTON */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDescription(true);
            }}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="glass w-12 h-12 rounded-full flex items-center justify-center font-black text-xs group-hover:bg-white/20 transition-all border border-white/10 shadow-lg">
              SL
            </div>
            <span className="text-[10px] text-white/70 font-bold uppercase tracking-tighter">Details</span>
          </button>

          <VideoActions video={video} onCommentClick={() => setShowComments(true)} />
        </div>
      )}

      {/* 5. VIDEO INFO (BOTTOM LEFT) */}
      {!showComments && (
        <div className="absolute bottom-24 left-4 z-40 pointer-events-none">
          <VideoInfo video={video} />
        </div>
      )}

      {/* 6. INTERACTIVE PROGRESS BAR (CIRCLE/THUMB INCLUDED) */}
      <AnimatePresence>
        {(showControls || showComments) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-16 left-0 right-0 px-6 z-[60]"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 accent-cyan-400 bg-white/20 rounded-full appearance-none cursor-pointer"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. REAL COMMENTS OVERLAY (70/30 SPLIT SYSTEM) */}
      <CommentsOverlay
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        videoId={video.id}
        commentCount={video.comments}
      />
    </div>
  );
};
