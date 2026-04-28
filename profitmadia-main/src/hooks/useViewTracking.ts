import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to track video views once per session per video
 * Uses a Set to prevent duplicate view counts within the same browser session
 */
export const useViewTracking = () => {
  const { user } = useAuth();
  // Session-based tracking - views reset when user closes/refreshes page
  const viewedVideosRef = useRef<Set<string>>(new Set());

  const recordView = useCallback(async (videoId: string): Promise<boolean> => {
    // Check if already viewed in this session
    if (viewedVideosRef.current.has(videoId)) {
      return false;
    }

    // Mark as viewed immediately to prevent race conditions
    viewedVideosRef.current.add(videoId);

    if (!user) {
      return false;
    }

    const { error } = await supabase.from("view_tracking").insert({
      user_id: user.id,
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
  }, [user]);

  const hasViewed = useCallback((videoId: string): boolean => {
    return viewedVideosRef.current.has(videoId);
  }, []);

  return { recordView, hasViewed };
};
