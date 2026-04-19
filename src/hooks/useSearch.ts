import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Video, VideoType, VideoStatus } from "./useVideos";
import { resolveVideoUrls } from "@/lib/storageUrl";
import { sanitizeSearch } from "@/lib/sanitize";

interface SearchResult {
  videos: Video[];
  creators: {
    user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    total_followers: number | null;
    total_views: number | null;
  }[];
  posts: {
    id: string;
    content: string | null;
    image_url: string | null;
    like_count: number | null;
    comment_count: number | null;
    user_id: string;
    created_at: string;
    profile?: { username: string | null; display_name: string | null; avatar_url: string | null };
  }[];
}

interface TrendingVideo extends Video {
  trending_score: number;
}

// Fuzzy search utility - handles typos by checking similar patterns
const fuzzyMatch = (query: string, target: string): boolean => {
  if (!target) return false;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  
  // Direct match
  if (t.includes(q)) return true;
  
  // Allow one character difference for typos
  if (q.length >= 3) {
    // Check if all but one character matches
    let mismatches = 0;
    const minLen = Math.min(q.length, t.length);
    for (let i = 0; i < minLen; i++) {
      if (q[i] !== t[i]) mismatches++;
      if (mismatches > 1) break;
    }
    if (mismatches <= 1 && Math.abs(q.length - t.length) <= 1) return true;
  }
  
  return false;
};

export const useSearch = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ videos: [], creators: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem("searchHistory");
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  const saveToHistory = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const updated = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10);
    setSearchHistory(updated);
    localStorage.setItem("searchHistory", JSON.stringify(updated));
  };

  const removeHistoryItem = (item: string) => {
    const updated = searchHistory.filter(h => h !== item);
    setSearchHistory(updated);
    localStorage.setItem("searchHistory", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("searchHistory");
  };

  const search = useCallback(async (searchQuery: string) => {
    const sanitized = sanitizeSearch(searchQuery);
    if (!sanitized) {
      setResults({ videos: [], creators: [], posts: [] });
      return;
    }

    setLoading(true);
    const q = sanitized.toLowerCase();

    try {
      // Search videos with fuzzy matching using ilike
      const videoPromise = supabase
        .from("videos")
        .select("*")
        .eq("is_public", true)
        .eq("status", "ready")
        .or(`caption.ilike.%${q}%,music_title.ilike.%${q}%`)
        .order("view_count", { ascending: false })
        .limit(30);

      // Search creators with fuzzy matching
      const creatorPromise = supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, total_followers, total_views")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .order("total_followers", { ascending: false })
        .limit(20);

      // Search posts
      const postsPromise = supabase
        .from("posts")
        .select("id, content, image_url, like_count, comment_count, user_id, created_at")
        .eq("is_public", true)
        .ilike("content", `%${q}%`)
        .order("like_count", { ascending: false })
        .limit(20);

      const [{ data: videosData }, { data: creatorsData }, { data: postsData }] = await Promise.all([
        videoPromise,
        creatorPromise,
        postsPromise,
      ]);

      // Get profiles for videos
      const userIds = [...new Set(videosData?.map((v) => v.user_id) || [])];
      let profilesMap = new Map();
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url, total_followers")
          .in("user_id", userIds);
        
        profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);
      }

      const videosWithProfiles: Video[] = (videosData || []).map((video) => ({
        ...video,
        video_type: video.video_type as VideoType,
        status: (video.status || "processing") as VideoStatus,
        profile: profilesMap.get(video.user_id) || null,
      }));

      const resolved = await resolveVideoUrls(videosWithProfiles);

      // Get profiles for posts
      const postUserIds = [...new Set(postsData?.map((p: any) => p.user_id) || [])];
      let postProfilesMap = new Map();
      if (postUserIds.length > 0) {
        const { data: postProfiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", postUserIds);
        postProfilesMap = new Map(postProfiles?.map((p: any) => [p.user_id, p]) || []);
      }

      const postsWithProfiles = (postsData || []).map((post: any) => ({
        ...post,
        profile: postProfilesMap.get(post.user_id) || null,
      }));

      setResults({
        videos: resolved,
        creators: creatorsData || [],
        posts: postsWithProfiles,
      });

      saveToHistory(searchQuery);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [searchHistory]);

  return {
    query,
    setQuery,
    results,
    loading,
    search,
    searchHistory,
    clearHistory,
    removeHistoryItem
  };
};

// TikTok-style recommendation algorithm
export const useTrendingVideos = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<TrendingVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateTrendingScore = (video: any): number => {
    const now = Date.now();
    const createdAt = new Date(video.created_at).getTime();
    const ageHours = (now - createdAt) / (1000 * 60 * 60);
    
    // Decay factor - newer videos get boosted
    const recencyBoost = Math.max(0, 1 - (ageHours / 168)); // Decays over 7 days
    
    // Engagement metrics (weighted)
    const views = video.view_count || 0;
    const likes = video.like_count || 0;
    const comments = video.comment_count || 0;
    const shares = video.share_count || 0;
    const saves = video.save_count || 0;
    const gifts = video.gift_count || 0;
    
    // TikTok-style weighting: Watch time > Likes > Comments > Shares > Saves > Follows
    const engagementScore = 
      (views * 1) +           // Base views
      (likes * 5) +           // Likes are strong signal
      (comments * 10) +       // Comments are very strong
      (shares * 15) +         // Shares are viral indicator
      (saves * 8) +           // Saves show value
      (gifts * 20);           // Gifts are premium engagement
    
    // Like-to-view ratio (quality signal)
    const likeRatio = views > 0 ? likes / views : 0;
    const qualityBoost = likeRatio * 100;
    
    // Final score combining all factors
    const trendingScore = (engagementScore * (1 + recencyBoost)) + qualityBoost;
    
    return trendingScore;
  };

  const fetchTrendingVideos = useCallback(async () => {
    setLoading(true);
    
    try {
      // Fetch recent videos with good engagement potential
      const { data: videosData } = await supabase
        .from("videos")
        .select("*")
        .eq("is_public", true)
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!videosData || videosData.length === 0) {
        setVideos([]);
        setLoading(false);
        return;
      }

      // Get profiles
      const userIds = [...new Set(videosData.map((v) => v.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, total_followers")
        .in("user_id", userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);

      // Calculate trending scores and sort
      const trendingVideos: TrendingVideo[] = videosData.map((video) => ({
        ...video,
        video_type: video.video_type as VideoType,
        status: (video.status || "processing") as VideoStatus,
        profile: profilesMap.get(video.user_id) || null,
        trending_score: calculateTrendingScore(video)
      }));

      // Sort by trending score
      trendingVideos.sort((a, b) => b.trending_score - a.trending_score);

      const resolved = await resolveVideoUrls(trendingVideos.slice(0, 30));
      setVideos(resolved as TrendingVideo[]);
    } catch (err) {
      console.error("Trending fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrendingVideos();
  }, [fetchTrendingVideos]);

  return { videos, loading, refetch: fetchTrendingVideos };
};

// Personalized "For You" recommendations
export const usePersonalizedFeed = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPersonalizedFeed = useCallback(async () => {
    setLoading(true);
    
    try {
      // If user is not logged in, just return trending
      if (!user) {
        const { data: videosData } = await supabase
          .from("videos")
          .select("*")
          .eq("is_public", true)
          .eq("status", "ready")
          .order("view_count", { ascending: false })
          .limit(50);

        if (!videosData) {
          setVideos([]);
          return;
        }

        const userIds = [...new Set(videosData.map((v) => v.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url, total_followers")
          .in("user_id", userIds);

        const profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);

        const mapped = videosData.map((video) => ({
          ...video,
          video_type: video.video_type as VideoType,
          status: (video.status || "processing") as VideoStatus,
          profile: profilesMap.get(video.user_id) || null,
        }));
        const resolved = await resolveVideoUrls(mapped);
        setVideos(resolved);
        return;
      }

      // Get user's interaction history
      const [likesResult, watchResult, followsResult] = await Promise.all([
        supabase.from("likes").select("video_id").eq("user_id", user.id).limit(50),
        supabase.from("view_tracking").select("video_id").eq("user_id", user.id).limit(100),
        supabase.from("follows").select("following_id").eq("follower_id", user.id)
      ]);

      const likedVideoIds = new Set(likesResult.data?.map(l => l.video_id) || []);
      const watchedVideoIds = new Set(watchResult.data?.map(w => w.video_id) || []);
      const followingIds = new Set(followsResult.data?.map(f => f.following_id) || []);

      // Fetch videos
      const { data: videosData } = await supabase
        .from("videos")
        .select("*")
        .eq("is_public", true)
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!videosData || videosData.length === 0) {
        setVideos([]);
        return;
      }

      // Get profiles
      const userIds = [...new Set(videosData.map((v) => v.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, total_followers")
        .in("user_id", userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);

      // Score videos for personalization
      const scoredVideos = videosData.map((video) => {
        let score = 0;
        
        // Boost videos from followed creators
        if (followingIds.has(video.user_id)) score += 50;
        
        // Penalize already watched videos
        if (watchedVideoIds.has(video.id)) score -= 30;
        
        // Penalize already liked (they've interacted enough)
        if (likedVideoIds.has(video.id)) score -= 20;
        
        // Boost videos with good engagement
        const engagementRate = (video.like_count || 0) / Math.max(1, video.view_count || 1);
        score += engagementRate * 100;
        
        // Recency boost
        const ageHours = (Date.now() - new Date(video.created_at).getTime()) / (1000 * 60 * 60);
        score += Math.max(0, 20 - ageHours / 12);
        
        return {
          ...video,
          video_type: video.video_type as VideoType,
          status: (video.status || "processing") as VideoStatus,
          profile: profilesMap.get(video.user_id) || null,
          personalization_score: score
        };
      });

      // Sort by personalization score with some randomness for diversity
      scoredVideos.sort((a, b) => {
        const randomFactor = (Math.random() - 0.5) * 10;
        return (b.personalization_score + randomFactor) - (a.personalization_score + randomFactor);
      });

      const resolved = await resolveVideoUrls(scoredVideos.slice(0, 50));
      setVideos(resolved);
    } catch (err) {
      console.error("Personalized feed error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPersonalizedFeed();
  }, [fetchPersonalizedFeed]);

  return { videos, loading, refetch: fetchPersonalizedFeed };
};
