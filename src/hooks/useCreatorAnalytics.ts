import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface VideoPerformance {
  id: string;
  caption: string;
  thumbnail_url: string;
  video_url: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  save_count: number;
  gift_count: number;
  total_watch_time: number;
  is_trending: boolean;
  created_at: string;
  followers_gained: number;
}

export interface AudienceData {
  countries: { country: string; count: number }[];
  ageGroups: { age_group: string; count: number }[];
  genderSplit: { gender: string; count: number }[];
  peakHours: { hour: number; count: number }[];
}

export interface WalletData {
  totalBalance: number;
  videoEarnings: number;
  giftEarnings: number;
  adsEarnings: number;
  topGiftVideo: { id: string; caption: string; gift_count: number } | null;
  giftsList: { gift_type: string; count: number }[];
}

export interface ActivityData {
  recentFollowers: { user_id: string; display_name: string; avatar_url: string; created_at: string }[];
  recentLikes: { user_id: string; display_name: string; avatar_url: string; video_caption: string; created_at: string }[];
  recentGifts: { user_id: string; display_name: string; avatar_url: string; gift_type: string; video_caption: string; created_at: string }[];
}

export interface SevenDaySummary {
  views: { date: string; count: number }[];
  followers: { date: string; count: number }[];
  likes: { date: string; count: number }[];
  gifts: { date: string; count: number }[];
  earnings: { date: string; amount: number }[];
  totalViews: number;
  totalFollowers: number;
  totalLikes: number;
  totalGifts: number;
  totalEarnings: number;
}

export const useCreatorAnalytics = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoPerformance[]>([]);
  const [audienceData, setAudienceData] = useState<AudienceData>({
    countries: [],
    ageGroups: [],
    genderSplit: [],
    peakHours: [],
  });
  const [walletData, setWalletData] = useState<WalletData>({
    totalBalance: 0,
    videoEarnings: 0,
    giftEarnings: 0,
    adsEarnings: 0,
    topGiftVideo: null,
    giftsList: [],
  });
  const [activityData, setActivityData] = useState<ActivityData>({
    recentFollowers: [],
    recentLikes: [],
    recentGifts: [],
  });
  const [sevenDaySummary, setSevenDaySummary] = useState<SevenDaySummary>({
    views: [],
    followers: [],
    likes: [],
    gifts: [],
    earnings: [],
    totalViews: 0,
    totalFollowers: 0,
    totalLikes: 0,
    totalGifts: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchVideoPerformance = useCallback(async () => {
    if (!user) return;

    const { data: videosData } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (videosData) {
      // Calculate followers gained per video (approximation based on follows timing)
      const videosWithFollowers = await Promise.all(
        videosData.map(async (video) => {
          const { count } = await supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("following_id", user.id)
            .gte("created_at", video.created_at);

          return {
            ...video,
            followers_gained: count || 0,
          };
        })
      );

      setVideos(videosWithFollowers);
    }
  }, [user]);

  const fetchAudienceData = useCallback(async () => {
    if (!user || videos.length === 0) return;

    // Use the RPC function to get anonymized analytics for all user's videos
    const allAnalytics: any[] = [];
    
    for (const video of videos) {
      const { data } = await supabase.rpc("get_anonymized_analytics", {
        p_video_id: video.id,
      });
      if (data) {
        allAnalytics.push(...data);
      }
    }

    if (allAnalytics.length > 0) {
      // Group by country
      const countryCounts: Record<string, number> = {};
      const ageCounts: Record<string, number> = {};
      const genderCounts: Record<string, number> = {};
      const hourCounts: Record<number, number> = {};

      allAnalytics.forEach((a) => {
        if (a.country) countryCounts[a.country] = (countryCounts[a.country] || 0) + 1;
        if (a.age_group) ageCounts[a.age_group] = (ageCounts[a.age_group] || 0) + 1;
        if (a.gender) genderCounts[a.gender] = (genderCounts[a.gender] || 0) + 1;
        if (a.watch_hour !== null) hourCounts[a.watch_hour] = (hourCounts[a.watch_hour] || 0) + 1;
      });

      setAudienceData({
        countries: Object.entries(countryCounts)
          .map(([country, count]) => ({ country, count }))
          .sort((a, b) => b.count - a.count),
        ageGroups: Object.entries(ageCounts)
          .map(([age_group, count]) => ({ age_group, count }))
          .sort((a, b) => {
            const order = ["13-17", "18-24", "25-34", "35-44", "45+"];
            return order.indexOf(a.age_group) - order.indexOf(b.age_group);
          }),
        genderSplit: Object.entries(genderCounts)
          .map(([gender, count]) => ({ gender, count })),
        peakHours: Object.entries(hourCounts)
          .map(([hour, count]) => ({ hour: parseInt(hour), count }))
          .sort((a, b) => a.hour - b.hour),
      });
    } else {
      // No data yet - show empty state (real data)
      setAudienceData({
        countries: [],
        ageGroups: [],
        genderSplit: [],
        peakHours: [],
      });
    }
  }, [user, videos]);

  const fetchWalletData = useCallback(async () => {
    if (!user) return;

    // Fetch earnings
    const { data: earningsData } = await supabase
      .from("earnings")
      .select("*")
      .eq("user_id", user.id);

    // Fetch gifts received
    const { data: giftsData } = await supabase
      .from("gifts")
      .select("*")
      .eq("receiver_id", user.id);

    let videoEarnings = 0;
    let giftEarnings = 0;
    let adsEarnings = 0;

    if (earningsData) {
      earningsData.forEach((e) => {
        const amount = parseFloat(e.amount as any) || 0;
        if (e.earning_type === "views") videoEarnings += amount;
        else if (e.earning_type === "gifts") giftEarnings += amount;
        else if (e.earning_type === "ads") adsEarnings += amount;
      });
    }

    // Calculate gift value
    if (giftsData) {
      const giftValue = giftsData.reduce((sum, g) => sum + (g.gift_value || 0), 0);
      giftEarnings += giftValue * 0.01; // $0.01 per gift point
    }

    // Get top gift video
    const topGiftVideo = videos.reduce((top, v) => 
      (!top || (v.gift_count || 0) > (top.gift_count || 0)) ? v : top, 
      null as VideoPerformance | null
    );

    // Get gifts list
    const giftTypes: Record<string, number> = {};
    if (giftsData) {
      giftsData.forEach((g) => {
        giftTypes[g.gift_type] = (giftTypes[g.gift_type] || 0) + (g.gift_value || 1);
      });
    }

    setWalletData({
      totalBalance: videoEarnings + giftEarnings + adsEarnings,
      videoEarnings,
      giftEarnings,
      adsEarnings,
      topGiftVideo: topGiftVideo ? { id: topGiftVideo.id, caption: topGiftVideo.caption || "Untitled", gift_count: topGiftVideo.gift_count || 0 } : null,
      giftsList: Object.entries(giftTypes).map(([gift_type, count]) => ({ gift_type, count })),
    });
  }, [user, videos]);

  const fetchActivityData = useCallback(async () => {
    if (!user) return;

    // Recent followers
    const { data: followsData } = await supabase
      .from("follows")
      .select("follower_id, created_at")
      .eq("following_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (followsData && followsData.length > 0) {
      const followerIds = followsData.map((f) => f.follower_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", followerIds);

      const recentFollowers = followsData.map((f) => {
        const profile = profiles?.find((p) => p.user_id === f.follower_id);
        return {
          user_id: f.follower_id,
          display_name: profile?.display_name || "Unknown",
          avatar_url: profile?.avatar_url || "",
          created_at: f.created_at,
        };
      });

      setActivityData((prev) => ({ ...prev, recentFollowers }));
    }

    // Recent likes
    const { data: likesData } = await supabase
      .from("likes")
      .select("user_id, video_id, created_at")
      .in("video_id", videos.map((v) => v.id))
      .order("created_at", { ascending: false })
      .limit(10);

    if (likesData && likesData.length > 0) {
      const likerIds = likesData.map((l) => l.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", likerIds);

      const recentLikes = likesData.map((l) => {
        const profile = profiles?.find((p) => p.user_id === l.user_id);
        const video = videos.find((v) => v.id === l.video_id);
        return {
          user_id: l.user_id,
          display_name: profile?.display_name || "Unknown",
          avatar_url: profile?.avatar_url || "",
          video_caption: video?.caption || "Untitled",
          created_at: l.created_at,
        };
      });

      setActivityData((prev) => ({ ...prev, recentLikes }));
    }

    // Recent gifts
    const { data: giftsData } = await supabase
      .from("gifts")
      .select("sender_id, video_id, gift_type, created_at")
      .eq("receiver_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (giftsData && giftsData.length > 0) {
      const senderIds = giftsData.map((g) => g.sender_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", senderIds);

      const recentGifts = giftsData.map((g) => {
        const profile = profiles?.find((p) => p.user_id === g.sender_id);
        const video = videos.find((v) => v.id === g.video_id);
        return {
          user_id: g.sender_id,
          display_name: profile?.display_name || "Unknown",
          avatar_url: profile?.avatar_url || "",
          gift_type: g.gift_type,
          video_caption: video?.caption || "Untitled",
          created_at: g.created_at,
        };
      });

      setActivityData((prev) => ({ ...prev, recentGifts }));
    }
  }, [user, videos]);

  const fetchSevenDaySummary = useCallback(async () => {
    if (!user) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    // Generate last 7 days
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }

    // Fetch real view tracking data
    const { data: viewsData } = await supabase
      .from("view_tracking")
      .select("created_at, video_id")
      .in("video_id", videos.map((v) => v.id))
      .gte("created_at", sevenDaysAgoISO);

    // Fetch real followers data
    const { data: followsData } = await supabase
      .from("follows")
      .select("created_at")
      .eq("following_id", user.id)
      .gte("created_at", sevenDaysAgoISO);

    // Fetch real likes data
    const { data: likesData } = await supabase
      .from("likes")
      .select("created_at")
      .in("video_id", videos.map((v) => v.id))
      .gte("created_at", sevenDaysAgoISO);

    // Fetch real gifts data
    const { data: giftsData } = await supabase
      .from("gifts")
      .select("created_at, gift_value")
      .eq("receiver_id", user.id)
      .gte("created_at", sevenDaysAgoISO);

    // Fetch real earnings data
    const { data: earningsData } = await supabase
      .from("earnings")
      .select("created_at, amount")
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgoISO);

    // Aggregate data by day
    const viewsByDay: Record<string, number> = {};
    const followersByDay: Record<string, number> = {};
    const likesByDay: Record<string, number> = {};
    const giftsByDay: Record<string, number> = {};
    const earningsByDay: Record<string, number> = {};

    // Initialize all days with 0
    days.forEach((day) => {
      viewsByDay[day] = 0;
      followersByDay[day] = 0;
      likesByDay[day] = 0;
      giftsByDay[day] = 0;
      earningsByDay[day] = 0;
    });

    // Count views by day
    viewsData?.forEach((v) => {
      const day = v.created_at.split("T")[0];
      if (viewsByDay[day] !== undefined) viewsByDay[day]++;
    });

    // Count followers by day
    followsData?.forEach((f) => {
      const day = f.created_at.split("T")[0];
      if (followersByDay[day] !== undefined) followersByDay[day]++;
    });

    // Count likes by day
    likesData?.forEach((l) => {
      const day = l.created_at.split("T")[0];
      if (likesByDay[day] !== undefined) likesByDay[day]++;
    });

    // Count gifts by day
    giftsData?.forEach((g) => {
      const day = g.created_at.split("T")[0];
      if (giftsByDay[day] !== undefined) giftsByDay[day] += (g.gift_value || 1);
    });

    // Sum earnings by day
    earningsData?.forEach((e) => {
      const day = e.created_at.split("T")[0];
      if (earningsByDay[day] !== undefined) earningsByDay[day] += parseFloat(e.amount as any) || 0;
    });

    const summary: SevenDaySummary = {
      views: days.map((date) => ({ date, count: viewsByDay[date] || 0 })),
      followers: days.map((date) => ({ date, count: followersByDay[date] || 0 })),
      likes: days.map((date) => ({ date, count: likesByDay[date] || 0 })),
      gifts: days.map((date) => ({ date, count: giftsByDay[date] || 0 })),
      earnings: days.map((date) => ({ date, amount: earningsByDay[date] || 0 })),
      totalViews: 0,
      totalFollowers: 0,
      totalLikes: 0,
      totalGifts: 0,
      totalEarnings: 0,
    };

    summary.totalViews = summary.views.reduce((sum, v) => sum + v.count, 0);
    summary.totalFollowers = summary.followers.reduce((sum, f) => sum + f.count, 0);
    summary.totalLikes = summary.likes.reduce((sum, l) => sum + l.count, 0);
    summary.totalGifts = summary.gifts.reduce((sum, g) => sum + g.count, 0);
    summary.totalEarnings = summary.earnings.reduce((sum, e) => sum + e.amount, 0);

    setSevenDaySummary(summary);
  }, [user, videos]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchVideoPerformance();
  }, [fetchVideoPerformance]);

  useEffect(() => {
    if (user) {
      fetchVideoPerformance().then(() => setLoading(false));
    }
  }, [user, fetchVideoPerformance]);

  useEffect(() => {
    if (videos.length > 0) {
      fetchAudienceData();
      fetchWalletData();
      fetchActivityData();
      fetchSevenDaySummary();
    }
  }, [videos, fetchAudienceData, fetchWalletData, fetchActivityData, fetchSevenDaySummary]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("creator-analytics")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "videos", filter: `user_id=eq.${user.id}` },
        () => fetchVideoPerformance()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "likes" },
        () => fetchVideoPerformance()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "follows", filter: `following_id=eq.${user.id}` },
        () => fetchActivityData()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gifts", filter: `receiver_id=eq.${user.id}` },
        () => {
          fetchWalletData();
          fetchActivityData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchVideoPerformance, fetchWalletData, fetchActivityData]);

  return {
    videos,
    audienceData,
    walletData,
    activityData,
    sevenDaySummary,
    loading,
    refetch,
  };
};
