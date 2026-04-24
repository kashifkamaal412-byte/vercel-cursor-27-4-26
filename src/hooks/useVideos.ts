import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveVideoUrls } from "@/lib/storageUrl";

export type VideoType = "short" | "long" | "live";
export type VideoStatus = "processing" | "ready" | "failed";

export interface Video {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  description: string | null;
  external_link: string | null;
  location: string | null;
  age_restriction: string | null;
  tags: string[] | null;
  music_title: string | null;
  duration: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  save_count: number;
  gift_count: number;
  is_public: boolean;
  allow_comments: boolean;
  allow_duet: boolean;
  video_type: VideoType;
  status: VideoStatus;
  pinned_at?: string | null;
  created_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    total_followers: number | null;
  } | null;
}

const PAGE_SIZE = 15;

// Simple in-memory cache
const videoCache = new Map<string, { data: Video[]; timestamp: number }>();
const CACHE_TTL = 60_000; // 1 minute

export const useVideos = (
  feedType: "foryou" | "following" = "foryou",
  videoType: VideoType = "short"
) => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(0);

  const cacheKey = `${feedType}-${videoType}-${user?.id || "anon"}`;

  const fetchPage = useCallback(async (page: number, append = false) => {
    try {
      if (page === 0) {
        // Check cache for initial load
        const cached = videoCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          setVideos(cached.data);
          setLoading(false);
          setHasMore(cached.data.length >= PAGE_SIZE);
          return;
        }
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("videos")
        .select("*")
        .eq("video_type", videoType)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (feedType === "following" && user) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        if (follows && follows.length > 0) {
          const followingIds = follows.map((f) => f.following_id);
          query = query.in("user_id", [...followingIds, user.id]);
        } else {
          query = query.eq("user_id", user.id);
        }
      } else {
        query = query.eq("is_public", true);
      }

      const { data: videosData, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!videosData || videosData.length === 0) {
        if (!append) setVideos([]);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      setHasMore(videosData.length >= PAGE_SIZE);

      // Get profiles
      const userIds = [...new Set(videosData.map((v) => v.user_id).filter(Boolean))];
      let profilesMap = new Map();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url, total_followers")
          .in("user_id", userIds);
        profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);
      }

      const videosWithProfiles: Video[] = videosData.map((video) => ({
        ...video,
        description: (video as any).description || null,
        external_link: (video as any).external_link || null,
        location: (video as any).location || null,
        age_restriction: (video as any).age_restriction || "everyone",
        video_type: video.video_type as VideoType,
        status: (video.status || "processing") as VideoStatus,
        profile: video.user_id ? profilesMap.get(video.user_id) || null : null,
      }));

      // Resolve signed URLs for private bucket
      const resolved = await resolveVideoUrls(videosWithProfiles);

      if (append) {
        setVideos((prev) => {
          const existingIds = new Set(prev.map((v) => v.id));
          const newVideos = resolved.filter((v) => !existingIds.has(v.id));
          return [...prev, ...newVideos];
        });
      } else {
        setVideos(resolved);
        // Cache the first page
        videoCache.set(cacheKey, { data: resolved, timestamp: Date.now() });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [feedType, user, videoType, cacheKey]);

  const fetchVideos = useCallback(() => {
    pageRef.current = 0;
    videoCache.delete(cacheKey);
    return fetchPage(0, false);
  }, [fetchPage, cacheKey]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    pageRef.current += 1;
    fetchPage(pageRef.current, true);
  }, [fetchPage, loadingMore, hasMore]);

  useEffect(() => {
    pageRef.current = 0;
    fetchPage(0, false);
  }, [fetchPage]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`videos-realtime-${videoType}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "videos" },
        async (payload) => {
          const newVideo = payload.new as any;
          if (newVideo.video_type !== videoType) return;
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, username, display_name, avatar_url, total_followers")
            .eq("user_id", newVideo.user_id)
            .maybeSingle();
          setVideos((prev) => [{ ...newVideo, profile } as Video, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "videos" },
        (payload) => {
          const updated = payload.new as any;
          setVideos((prev) =>
            prev.map((v) => {
              if (v.id !== updated.id) return v;
              // CRITICAL: Preserve signed URLs - realtime payload has raw storage paths
              const { video_url, thumbnail_url, ...safeFields } = updated;
              return { ...v, ...safeFields };
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoType]);

  return { videos, loading, error, refetch: fetchVideos, loadMore, hasMore, loadingMore };
};

export const useVideoActions = () => {
  const { user } = useAuth();

  const likeVideo = useCallback(async (videoId: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase.from("likes").insert({ user_id: user.id, video_id: videoId });
    return !error;
  }, [user]);

  const unlikeVideo = useCallback(async (videoId: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase.from("likes").delete().eq("user_id", user.id).eq("video_id", videoId);
    return !error;
  }, [user]);

  const checkLiked = useCallback(async (videoId: string): Promise<boolean> => {
    if (!user) return false;
    const { data } = await supabase.from("likes").select("id").eq("user_id", user.id).eq("video_id", videoId).maybeSingle();
    return !!data;
  }, [user]);

  const saveVideo = useCallback(async (videoId: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase.from("saves").insert({ user_id: user.id, video_id: videoId });
    return !error;
  }, [user]);

  const unsaveVideo = useCallback(async (videoId: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase.from("saves").delete().eq("user_id", user.id).eq("video_id", videoId);
    return !error;
  }, [user]);

  const checkSaved = useCallback(async (videoId: string): Promise<boolean> => {
    if (!user) return false;
    const { data } = await supabase.from("saves").select("id").eq("user_id", user.id).eq("video_id", videoId).maybeSingle();
    return !!data;
  }, [user]);

  const followUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user || user.id === userId) return false;
    const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
    return !error;
  }, [user]);

  const unfollowUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
    return !error;
  }, [user]);

  const checkFollowing = useCallback(async (userId: string): Promise<boolean> => {
    if (!user) return false;
    const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", userId).maybeSingle();
    return !!data;
  }, [user]);

  const deleteVideo = useCallback(async (videoId: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase.from("videos").delete().eq("id", videoId).eq("user_id", user.id);
    return !error;
  }, [user]);

  return { likeVideo, unlikeVideo, checkLiked, saveVideo, unsaveVideo, checkSaved, followUser, unfollowUser, checkFollowing, deleteVideo };
};

const MAX_VIDEO_FILE_SIZE = 500 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];

export const uploadVideo = async (
  file: File | Blob, userId: string, caption: string, tags: string[],
  videoType: VideoType = "short", isPublic: boolean = true,
  allowComments: boolean = true, allowDuet: boolean = true
): Promise<{ success: boolean; videoId?: string; error?: string }> => {
  try {
    if (file.size > MAX_VIDEO_FILE_SIZE) return { success: false, error: "Video file too large. Maximum size is 500MB." };
    if (file instanceof File && (!file.type || !ALLOWED_VIDEO_TYPES.some(type => file.type.startsWith(type.split('/')[0])))) {
      return { success: false, error: "Invalid file type." };
    }
    if (caption && caption.length > 500) return { success: false, error: "Caption too long." };
    if (tags && tags.length > 10) return { success: false, error: "Too many tags." };

    const fileName = `${userId}/${crypto.randomUUID()}.mp4`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("videos").upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;

    // Store the relative path (not public URL) since bucket is private
    const storagePath = uploadData.path;
    const { data: videoData, error: insertError } = await supabase
      .from("videos")
      .insert({
        user_id: userId, video_url: storagePath,
        caption: caption?.trim() || null, tags: tags?.slice(0, 10) || null,
        video_type: videoType, is_public: isPublic,
        allow_comments: allowComments, allow_duet: allowDuet,
      })
      .select().single();
    if (insertError) throw insertError;

    return { success: true, videoId: videoData.id };
  } catch (error: any) {
    if (import.meta.env.DEV) console.error("Video upload error:", error);
    return { success: false, error: "Failed to upload video. Please try again." };
  }
};
