import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Pause, Play, Maximize2, SkipBack, SkipForward } from "lucide-react";

interface MiniPlayerProps {
  videoUrl: string;
  currentTime: number;
  onClose: () => void;
  onReturn: () => void;
}

export const MiniPlayer = ({ videoUrl, currentTime, onClose, onReturn }: MiniPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const constraintsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = currentTime;
    v.play().catch(() => {});
  }, [currentTime]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
  };

  const skipBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, v.currentTime - 10);
  };

  const skipForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
  };

  return (
    <div ref={constraintsRef} className="fixed inset-0 z-[200] pointer-events-none">
      <motion.div
        drag
        dragMomentum={false}
        dragConstraints={constraintsRef}
        initial={{ opacity: 0, scale: 0.5, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.5 }}
        className="absolute bottom-24 right-4 w-52 rounded-xl overflow-hidden shadow-2xl border border-border/50 bg-black pointer-events-auto cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none" }}
      >
        <div className="aspect-video relative">
          <video ref={videoRef} src={videoUrl} className="w-full h-full object-cover" playsInline />
          
          {/* Controls overlay - light transparent, no blur */}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-1.5 rounded-full bg-black/40 active:scale-90 transition-transform">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
            <button onClick={skipBack}
              className="p-1.5 rounded-full bg-black/40 active:scale-90 transition-transform">
              <SkipBack className="w-3.5 h-3.5 text-white" />
            </button>
            <button onClick={togglePlay}
              className="p-1.5 rounded-full bg-black/40 active:scale-90 transition-transform">
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white" />}
            </button>
            <button onClick={skipForward}
              className="p-1.5 rounded-full bg-black/40 active:scale-90 transition-transform">
              <SkipForward className="w-3.5 h-3.5 text-white" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onReturn(); }}
              className="p-1.5 rounded-full bg-black/40 active:scale-90 transition-transform">
              <Maximize2 className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
