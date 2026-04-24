import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const scrollPositions = new Map<string, number>();

/**
 * Saves and restores scroll position per route.
 * Attach to feed pages (Index, Posts, Discover, LongVideos).
 */
export const useScrollRestoration = (containerRef?: React.RefObject<HTMLElement>) => {
  const location = useLocation();
  const key = location.pathname;
  const savedRef = useRef(false);

  // Save scroll position before leaving
  useEffect(() => {
    const save = () => {
      const el = containerRef?.current || document.documentElement;
      const scrollTop = el === document.documentElement ? window.scrollY : el.scrollTop;
      scrollPositions.set(key, scrollTop);
    };

    window.addEventListener("beforeunload", save);

    return () => {
      save(); // Save when component unmounts (navigating away)
      window.removeEventListener("beforeunload", save);
    };
  }, [key, containerRef]);

  // Restore scroll position when returning
  useEffect(() => {
    const saved = scrollPositions.get(key);
    if (saved != null && !savedRef.current) {
      savedRef.current = true;
      requestAnimationFrame(() => {
        const el = containerRef?.current || window;
        if (el === window) {
          window.scrollTo(0, saved);
        } else {
          (el as HTMLElement).scrollTop = saved;
        }
      });
    }

    return () => {
      savedRef.current = false;
    };
  }, [key, containerRef]);
};
