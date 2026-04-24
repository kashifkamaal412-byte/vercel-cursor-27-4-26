import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { VideoData } from "@/data/mockVideos";
import { VideoCard } from "./VideoCard";
import { EmptyFeed } from "./EmptyFeed";

interface VideoFeedProps {
  videos: VideoData[];
}

export const VideoFeed = ({ videos }: VideoFeedProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Show empty state if no videos
  if (videos.length === 0) {
    return <EmptyFeed />;
  }

  const paginate = useCallback(
    (newDirection: number) => {
      const newIndex = currentIndex + newDirection;
      if (newIndex >= 0 && newIndex < videos.length) {
        setDirection(newDirection);
        setCurrentIndex(newIndex);
      }
    },
    [currentIndex, videos.length]
  );

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const threshold = 50;
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (offset < -threshold || velocity < -500) {
      paginate(1);
    } else if (offset > threshold || velocity > 500) {
      paginate(-1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") paginate(-1);
      if (e.key === "ArrowDown") paginate(1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paginate]);

  // Touch wheel/scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastScrollTime = 0;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastScrollTime < 500) return;
      lastScrollTime = now;

      if (e.deltaY > 0) paginate(1);
      if (e.deltaY < 0) paginate(-1);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [paginate]);

  const variants = {
    enter: (direction: number) => ({
      y: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      y: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      y: direction > 0 ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-64px)] overflow-hidden"
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            y: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="absolute inset-0"
        >
          <VideoCard video={videos[currentIndex]} isActive={true} />
        </motion.div>
      </AnimatePresence>

      {/* Video Indicators */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20">
        {videos.map((_, index) => (
          <motion.div
            key={index}
            animate={{
              height: index === currentIndex ? 24 : 8,
              opacity: index === currentIndex ? 1 : 0.3,
            }}
            className={`w-1 rounded-full ${
              index === currentIndex ? "gradient-primary" : "bg-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
};
