import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

interface SimpleTimelineProps {
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
}

export const SimpleTimeline = ({
  duration,
  currentTime,
  onSeek,
  trimStart,
  trimEnd,
  onTrimChange,
}: SimpleTimelineProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || isDragging) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    onSeek(Math.max(0, Math.min(duration, time)));
  };

  const handleTrimDrag = (e: React.MouseEvent, type: "start" | "end") => {
    e.stopPropagation();
    setIsDragging(type);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width)) * 100;
      
      if (isDragging === "start") {
        onTrimChange(Math.min(percentage, trimEnd - 5), trimEnd);
      } else if (isDragging === "end") {
        onTrimChange(trimStart, Math.max(percentage, trimStart + 5));
      }
    };

    const handleMouseUp = () => setIsDragging(null);

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, trimStart, trimEnd, onTrimChange]);

  return (
    <div className="bg-card/50 backdrop-blur-sm border-t border-border p-4">
      {/* Time Display */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-mono text-primary">{formatTime(currentTime)}</span>
        <span className="text-xs text-muted-foreground">
          Trim: {formatTime((trimStart / 100) * duration)} - {formatTime((trimEnd / 100) * duration)}
        </span>
        <span className="text-sm font-mono text-muted-foreground">{formatTime(duration)}</span>
      </div>

      {/* Timeline Track */}
      <div
        ref={timelineRef}
        className="relative h-14 bg-muted/30 rounded-xl overflow-hidden cursor-pointer"
        onClick={handleTimelineClick}
      >
        {/* Active area visualization */}
        <div 
          className="absolute inset-y-0 bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 rounded-lg"
          style={{
            left: `${trimStart}%`,
            right: `${100 - trimEnd}%`,
          }}
        >
          {/* Waveform bars */}
          <div className="h-full flex items-center gap-0.5 px-2 overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/70 rounded-full"
                style={{ height: `${25 + Math.random() * 50}%` }}
              />
            ))}
          </div>
        </div>

        {/* Trim Handles */}
        <motion.div
          className="absolute top-0 bottom-0 w-4 bg-primary cursor-ew-resize flex items-center justify-center rounded-l-lg z-10"
          style={{ left: `${trimStart}%` }}
          onMouseDown={(e) => handleTrimDrag(e, "start")}
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-1 h-8 bg-primary-foreground rounded-full" />
        </motion.div>

        <motion.div
          className="absolute top-0 bottom-0 w-4 bg-primary cursor-ew-resize flex items-center justify-center rounded-r-lg z-10"
          style={{ left: `${trimEnd}%`, transform: "translateX(-100%)" }}
          onMouseDown={(e) => handleTrimDrag(e, "end")}
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-1 h-8 bg-primary-foreground rounded-full" />
        </motion.div>

        {/* Dimmed areas */}
        <div className="absolute inset-y-0 left-0 bg-background/70" style={{ width: `${trimStart}%` }} />
        <div className="absolute inset-y-0 right-0 bg-background/70" style={{ width: `${100 - trimEnd}%` }} />

        {/* Playhead */}
        <motion.div
          className="absolute top-0 bottom-0 w-1 bg-white z-20 pointer-events-none shadow-lg"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-md" />
        </motion.div>
      </div>
    </div>
  );
};
