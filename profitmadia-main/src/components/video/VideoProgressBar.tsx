import { motion } from "framer-motion";
import { useCallback, useRef } from "react";

interface VideoProgressBarProps {
  progress: number;
  currentTime: number;
  duration: number;
  visible: boolean;
  onSeek?: (progress: number) => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const VideoProgressBar = ({
  progress,
  currentTime,
  duration,
  visible,
  onSeek
}: VideoProgressBarProps) => {
  const barRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const activePointerId = useRef<number | null>(null);

  const calculateProgress = useCallback((clientX: number) => {
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const pct = x / rect.width * 100;
    onSeek?.(pct);
  }, [onSeek]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isDragging.current = true;
    activePointerId.current = e.pointerId;
    barRef.current?.setPointerCapture(e.pointerId);
    calculateProgress(e.clientX);
  }, [calculateProgress]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    e.stopPropagation();
    e.preventDefault();
    calculateProgress(e.clientX);
  }, [calculateProgress]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    e.stopPropagation();
    e.preventDefault();
    isDragging.current = false;
    activePointerId.current = null;
    barRef.current?.releasePointerCapture(e.pointerId);
  }, []);

  const handlePointerCancel = useCallback(() => {
    isDragging.current = false;
    activePointerId.current = null;
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-auto">
      {/* Seekable progress bar */}
      <div
        ref={barRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
        className="relative h-[14px] w-full flex items-end cursor-pointer touch-none">
        
        <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-white/20">
          <motion.div
            style={{ width: `${progress}%` }}
            className="absolute top-0 left-0 h-full rounded-full bg-destructive-foreground" />
          
        </div>
        {/* Thumb - only show when visible */}
        {visible &&
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{ left: `${progress}%` }}
          className="absolute bottom-[-2px] w-3 h-3 bg-blue-500 rounded-full shadow-lg -translate-x-1/2" />

        }
      </div>

      {/* Time labels when expanded */}
      {visible &&
      <div className="absolute bottom-[16px] left-0 right-0 flex justify-between px-3 pointer-events-none">
          <span className="text-[10px] font-medium text-white/90 drop-shadow-md tabular-nums">
            {formatTime(currentTime)}
          </span>
          <span className="text-[10px] font-medium text-white/90 drop-shadow-md tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      }
    </div>);

};