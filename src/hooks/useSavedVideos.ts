import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Video, VideoType, VideoStatus } from "./useVideos";
import { resolveVideoUrls } from "@/lib/storageUrl";

// Global event bus for save updates across components
type SaveListener = (videoId: string, saved: boolean) => void;
const saveListeners = new Set<SaveListener>();

export const emitSaveEvent = (videoId: string, saved: boolean) => {
  saveListeners.forEach((listener) => listener(videoId, saved));
};

export const useSavedVideos = () => {
  const { user } = useAuth();
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [savedVideoIds, setSavedVideoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch all saved videos for current user
  const fetchSavedVideos = useCallback(async () => {
    if (!user?.id) {
      setSavedVideos([]);
      setSavedVideoIds(new Set());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get saved video IDs
      const { data: saves, error: savesError } = await supabase
        .from("saves")
        .select("video_id")
        .eq("user_id", user.id);

      if (savesError) throw savesError;

      if (!saves || saves.length === 0) {
        setSavedVideos([]);
        setSavedVideoIds(new Set());
        setLoading(false);
        return;
      }

      const savedIds = saves.map((s) => s.video_id);
      setSavedVideoIds(new Set(savedIds));

      // Fetch video details
      const { data: videosData, error: videosError } = await supabase
        .from("videos")
        .select("*")
        .in("id", savedIds)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (videosError) throw videosError;

      if (videosData && videosData.length > 0) {
        // Fetch profiles for videos
        const userIds = [...new Set(videosData.map((v) => v.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url, total_followers")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

        setSavedVideos(
          await resolveVideoUrls(
            videosData.map((v) => ({
              ...v,
              video_type: (v.video_type || "short") as VideoType,
              status: (v.status || "processing") as VideoStatus,
              profile: profileMap.get(v.user_id) || null,
            }))
          )
        );
      } else {
        setSavedVideos([]);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching saved videos:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Save a video
  const saveVideo = useCallback(
    async (videoId: string): Promise<boolean> => {
      if (!user?.id) return false;

      // Optimistic update
      setSavedVideoIds((prev) => new Set([...prev, videoId]));
      emitSaveEvent(videoId, true);

      const { error } = await supabase
        .from("saves")
        .insert({ user_id: user.id, video_id: videoId });

      if (error) {
        // Revert on error
        setSavedVideoIds((prev) => {
          const next = new Set(prev);
          next.delete(videoId);
          return next;
        });
        emitSaveEvent(videoId, false);
        return false;
      }

      // Refetch to get full video data
      fetchSavedVideos();
      return true;
    },
    [user?.id, fetchSavedVideos]
  );

  // Unsave a video
  const unsaveVideo = useCallback(
    async (videoId: string): Promise<boolean> => {
      if (!user?.id) return false;

      // Optimistic update
      setSavedVideoIds((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
      setSavedVideos((prev) => prev.filter((v) => v.id !== videoId));
      emitSaveEvent(videoId, false);

      const { error } = await supabase
        .from("saves")
        .delete()
        .eq("user_id", user.id)
        .eq("video_id", videoId);

      if (error) {
        // Revert on error
        setSavedVideoIds((prev) => new Set([...prev, videoId]));
        emitSaveEvent(videoId, true);
        return false;
      }

      return true;
    },
    [user?.id]
  );

  // Check if a video is saved
  const isSaved = useCallback(
    (videoId: string): boolean => {
      return savedVideoIds.has(videoId);
    },
    [savedVideoIds]
  );

  // Toggle save status
  const toggleSave = useCallback(
    async (videoId: string): Promise<boolean> => {
      if (isSaved(videoId)) {
        return unsaveVideo(videoId);
      } else {
        return saveVideo(videoId);
      }
    },
    [isSaved, saveVideo, unsaveVideo]
  );

  // Initial fetch
  useEffect(() => {
    fetchSavedVideos();
  }, [fetchSavedVideos]);

  // Subscribe to save events from other components
  useEffect(() => {
    const listener: SaveListener = () => {
      // Refetch when save events occur from other components
      fetchSavedVideos();
    };
    saveListeners.add(listener);
    return () => {
      saveListeners.delete(listener);
    };
  }, [fetchSavedVideos]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`saves-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saves",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSavedVideos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchSavedVideos]);

  return {
    savedVideos,
    savedVideoIds,
    loading,
    saveVideo,
    unsaveVideo,
    isSaved,
    toggleSave,
    refetch: fetchSavedVideos,
  };
};
