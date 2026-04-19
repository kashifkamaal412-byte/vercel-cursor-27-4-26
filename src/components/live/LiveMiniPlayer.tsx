import { useState } from "react";
import { motion } from "framer-motion";
import { Radio, Maximize2, X, Eye } from "lucide-react";
import { useLiveRealtimeViewers } from "@/hooks/useLiveStream";

interface LiveMiniPlayerProps {
  streamId: string;
  onRestore: () => void;
  onClose: () => void;
}

export const LiveMiniPlayer = ({ streamId, onRestore, onClose }: LiveMiniPlayerProps) => {
  const viewerCount = useLiveRealtimeViewers(streamId);
  const [position, setPosition] = useState({ x: 16, y: 100 });

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 300, top: 0, bottom: 600 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="fixed z-[60] w-36 h-52 rounded-2xl overflow-hidden shadow-2xl border-2 border-red-500/50"
      style={{ left: position.x, top: position.y }}
    >
      <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center relative">
        {/* LIVE indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 px-1.5 py-0.5 rounded-full">
          <Radio className="w-2 h-2 animate-pulse" />
          <span className="text-[8px] font-bold text-white">LIVE</span>
        </div>

        {/* Viewer count */}
        <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/50 px-1.5 py-0.5 rounded-full">
          <Eye className="w-2 h-2 text-white" />
          <span className="text-[8px] text-white">{viewerCount}</span>
        </div>

        {/* Camera placeholder */}
        <div className="text-center">
          <Radio className="w-8 h-8 text-red-500 mx-auto animate-pulse" />
          <p className="text-[9px] text-white/50 mt-1">Streaming...</p>
        </div>

        {/* Controls */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <button onClick={onRestore} className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
            <Maximize2 className="w-3 h-3 text-white" />
          </button>
          <button onClick={onClose} className="w-7 h-7 bg-red-600/60 rounded-full flex items-center justify-center">
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
