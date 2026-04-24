import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to track video views once per session per video
 * Uses a Set to prevent duplicate view counts within the same browser session
 */
export const useViewTracking = () => {
  // Session-based tracking - views reset when user closes/refreshes page
  const viewedVideosRef = useRef<Set<string>>(new Set());

  const recordView = useCallback(async (videoId: string): Promise<boolean> => {
    // Check if already viewed in this session
    if (viewedVideosRef.current.has(videoId)) {
      return false;
    }

    // Mark as viewed immediately to prevent race conditions
    viewedVideosRef.current.add(videoId);

    // Call the database function to increment view count
    // Using raw SQL call since the RPC isn't in generated types yet
    const { error } = await (supabase as any).rpc("increment_view_count", {
      video_id: videoId,
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Failed to record view:", error);
      }
      // Remove from set if failed so they can try again
      viewedVideosRef.current.delete(videoId);
      return false;
    }

    return true;
  }, []);

  const hasViewed = useCallback((videoId: string): boolean => {
    return viewedVideosRef.current.has(videoId);
  }, []);

  return { recordView, hasViewed };
};
