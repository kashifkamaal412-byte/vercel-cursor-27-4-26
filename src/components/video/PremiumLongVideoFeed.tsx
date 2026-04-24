import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Video } from "@/hooks/useVideos";
import { PremiumLongVideoCard } from "./PremiumLongVideoCard";
import { EmptyFeed } from "./EmptyFeed";
import { Loader2 } from "lucide-react";
import { useViewTracking } from "@/hooks/useViewTracking";

interface PremiumLongVideoFeedProps {
  videos: Video[];
  loading?: boolean;
}

export const PremiumLongVideoFeed = ({ videos, loading }: PremiumLongVideoFeedProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const { recordView } = useViewTracking();

  // Record view when current video changes
  useEffect(() => {
    if (videos.length > 0 && currentIndex >= 0 && currentIndex < videos.length) {
      const currentVideo = videos[currentIndex];
      recordView(currentVideo.id);
    }
  }, [currentIndex, videos, recordView]);

  const paginate = useCallback((newDirection: number) => {
    setCurrentIndex((prev) => {
      const newIndex = prev + newDirection;
      if (newIndex >= 0 && newIndex < videos.length) {
        setDirection(newDirection);
        return newIndex;
      }
      return prev;
    });
  }, [videos.length]);

  const handleDragEnd = useCallback((
  _event: MouseEvent | TouchEvent | PointerEvent,
  info: PanInfo) =>
  {
    const threshold = 50;
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (offset < -threshold || velocity < -500) {
      paginate(1);
    } else if (offset > threshold || velocity > 500) {
      paginate(-1);
    }
    isDragging.current = false;
  }, [paginate]);

  // Preload adjacent videos
  useEffect(() => {
    const preloadVideo = (index: number) => {
      if (index >= 0 && index < videos.length) {
        const video = videos[index];
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "video";
        link.href = video.video_url;
        document.head.appendChild(link);

        setTimeout(() => {
          if (link.parentNode) {
            link.parentNode.removeChild(link);
          }
        }, 30000);
      }
    };

    preloadVideo(currentIndex + 1);
    preloadVideo(currentIndex - 1);
  }, [currentIndex, videos]);

  // Keyboard navigation
  useEffect(() => {
    if (loading || videos.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "k") paginate(-1);
      if (e.key === "ArrowDown" || e.key === "j") paginate(1);
      if (e.key === " ") e.preventDefault();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paginate, loading, videos.length]);

  // Mouse wheel handling with debounce
  useEffect(() => {
    if (loading || videos.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    let lastScrollTime = 0;
    let accumulatedDelta = 0;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const now = Date.now();

      if (now - lastScrollTime > 200) {
        accumulatedDelta = 0;
      }

      accumulatedDelta += e.deltaY;

      if (Math.abs(accumulatedDelta) > 50 && now - lastScrollTime > 400) {
        if (accumulatedDelta > 0) paginate(1);
        if (accumulatedDelta < 0) paginate(-1);
        lastScrollTime = now;
        accumulatedDelta = 0;
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [paginate, loading, videos.length]);

  // Touch handling for mobile
  useEffect(() => {
    if (loading || videos.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      isDragging.current = true;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging.current) return;

      const touchEndY = e.changedTouches[0].clientY;
      const diff = touchStartY.current - touchEndY;
      const threshold = 80;

      if (Math.abs(diff) > threshold) {
        if (diff > 0) paginate(1);else
        paginate(-1);
      }

      isDragging.current = false;
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [paginate, loading, videos.length]);

  // Show loading state
  if (loading) {
    return (
      <div className="w-full h-[calc(100dvh-64px)] flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>

          <Loader2 className="w-10 h-10 text-blue-500" />
        </motion.div>
      </div>);

  }

  // Show empty state if no videos
  if (videos.length === 0) {
    return <EmptyFeed />;
  }

  const variants = {
    enter: (direction: number) => ({
      y: direction > 0 ? "100%" : "-100%",
      opacity: 0.8
    }),
    center: {
      y: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      y: direction > 0 ? "-50%" : "50%",
      opacity: 0,
      scale: 0.95
    })
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100dvh-64px)] overflow-hidden bg-black touch-none">

      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            y: { type: "spring", stiffness: 350, damping: 35 },
            opacity: { duration: 0.15 },
            scale: { duration: 0.15 }
          }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.1}
          onDragStart={() => {isDragging.current = true;}}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 will-change-transform">

          <PremiumLongVideoCard video={videos[currentIndex]} isActive={true} />
        </motion.div>
      </AnimatePresence>
    </div>);

};