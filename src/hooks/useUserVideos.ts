import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Video, VideoType, VideoStatus } from "./useVideos";
import { resolveVideoUrls } from "@/lib/storageUrl";

export const useUserVideos = (userId?: string) => {
  const { user } = useAuth();
  const [userVideos, setUserVideos] = useState<Video[]>([]);
  const [likedVideos, setLikedVideos] = useState<Video[]>([]);
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const targetUserId = userId || user?.id;

  const fetchUserVideos = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch user's uploaded videos
      const { data: uploadedVideos } = await supabase
        .from("videos")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });

      if (uploadedVideos) {
        // Get profile info
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url, total_followers")
          .eq("user_id", targetUserId)
          .maybeSingle();

        const mapped = uploadedVideos.map((v) => ({
            ...v,
            video_type: (v.video_type || 'short') as VideoType,
            status: (v.status || 'processing') as VideoStatus,
            profile: profile || null,
          }));
        const resolved = await resolveVideoUrls(mapped);
        setUserVideos(resolved);
      } else {
        setUserVideos([]);
      }

      // Only fetch liked/saved for own profile
      if (user?.id === targetUserId) {
        // Fetch liked videos
        const { data: likes } = await supabase
          .from("likes")
          .select("video_id")
          .eq("user_id", targetUserId);

        if (likes && likes.length > 0) {
          const likedVideoIds = likes.map((l) => l.video_id);
          const { data: likedData } = await supabase
            .from("videos")
            .select("*")
            .in("id", likedVideoIds)
            .eq("is_public", true)
            .order("created_at", { ascending: false });

          if (likedData) {
            const userIds = [...new Set(likedData.map((v) => v.user_id))];
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, username, display_name, avatar_url, total_followers")
              .in("user_id", userIds);

            const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
            const mapped = likedData.map((v) => ({
                ...v,
                video_type: (v.video_type || 'short') as VideoType,
                status: (v.status || 'processing') as VideoStatus,
                profile: profileMap.get(v.user_id) || null,
              }));
            const resolved = await resolveVideoUrls(mapped);
            setLikedVideos(resolved);
          } else {
            setLikedVideos([]);
          }
        } else {
          setLikedVideos([]);
        }

        // Fetch saved videos
        const { data: saves } = await supabase
          .from("saves")
          .select("video_id")
          .eq("user_id", targetUserId);

        if (saves && saves.length > 0) {
          const savedVideoIds = saves.map((s) => s.video_id);
          const { data: savedData } = await supabase
            .from("videos")
            .select("*")
            .in("id", savedVideoIds)
            .eq("is_public", true)
            .order("created_at", { ascending: false });

          if (savedData) {
            const userIds = [...new Set(savedData.map((v) => v.user_id))];
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, username, display_name, avatar_url, total_followers")
              .in("user_id", userIds);

            const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
            const mapped = savedData.map((v) => ({
                ...v,
                video_type: (v.video_type || 'short') as VideoType,
                status: (v.status || 'processing') as VideoStatus,
                profile: profileMap.get(v.user_id) || null,
              }));
            const resolved = await resolveVideoUrls(mapped);
            setSavedVideos(resolved);
          } else {
            setSavedVideos([]);
          }
        } else {
          setSavedVideos([]);
        }
      } else {
        setLikedVideos([]);
        setSavedVideos([]);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching user videos:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [targetUserId, user?.id]);

  useEffect(() => {
    fetchUserVideos();
  }, [fetchUserVideos]);

  // Real-time subscription for uploads/deletes/updates so post count stays accurate
  useEffect(() => {
    if (!targetUserId) return;

    const channel = supabase
      .channel(`user-videos-${targetUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "videos",
          filter: `user_id=eq.${targetUserId}`,
        },
        async () => {
          await fetchUserVideos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, fetchUserVideos]);

  return {
    userVideos,
    likedVideos,
    savedVideos,
    loading,
    refetch: fetchUserVideos,
    mutate: fetchUserVideos,
  };
};

export const useUserProfile = (userId: string) => {
  const [profile, setProfile] = useState<{
    user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    cover_url: string | null;
    total_followers: number;
    total_following: number;
    total_likes: number;
    creator_score: number | null;
    trust_level: number | null;
    activity_status: string | null;
    created_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        setProfile(data);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error fetching profile:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const updateProfile = async (updates: Record<string, any>) => {
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", userId);
    if (error) throw error;
    setProfile((prev) => prev ? { ...prev, ...updates } : prev);
  };

  return { profile, loading, updateProfile };
};
