import { useState, useEffect } from "react";
import { ArrowLeft, BarChart3, Users, Wallet, Activity, Video, RefreshCw, Radio, Eye, Heart, Gift, TrendingUp, FileText, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useCreatorAnalytics } from "@/hooks/useCreatorAnalytics";
import { VideoPerformanceCard } from "@/components/studio/VideoPerformanceCard";
import { AudienceAnalytics } from "@/components/studio/AudienceAnalytics";
import { WalletSection } from "@/components/studio/WalletSection";
import { SevenDaySummary } from "@/components/studio/SevenDaySummary";
import { ActivityInsights } from "@/components/studio/ActivityInsights";
import { LiveGiftHistory } from "@/components/studio/LiveGiftHistory";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type TabType = "overview" | "videos" | "posts" | "audience" | "wallet" | "activity" | "live";

const formatCompact = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const CreatorStudio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const { videos, audienceData, walletData, activityData, sevenDaySummary, loading, refetch } = useCreatorAnalytics();

  // Posts analytics
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchPosts = async () => {
      setPostsLoading(true);
      const { data } = await supabase
        .from("posts")
        .select("id, content, image_url, like_count, comment_count, share_count, save_count, created_at, is_public")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setPosts(data || []);
      setPostsLoading(false);
    };
    fetchPosts();
  }, [user]);

  const totalViews = videos.reduce((sum, v) => sum + (v.view_count || 0), 0);
  const totalLikes = videos.reduce((sum, v) => sum + (v.like_count || 0), 0);
  const totalGifts = videos.reduce((sum, v) => sum + (v.gift_count || 0), 0);
  const totalPostLikes = posts.reduce((sum, p) => sum + (p.like_count || 0), 0);

  const topViewsVideo = videos.reduce((top, v) => (!top || v.view_count > top.view_count) ? v : top, null as typeof videos[0] | null);
  const topLikesVideo = videos.reduce((top, v) => (!top || v.like_count > top.like_count) ? v : top, null as typeof videos[0] | null);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "videos", label: "Videos", icon: <Video className="w-4 h-4" /> },
    { id: "posts", label: "Posts", icon: <FileText className="w-4 h-4" /> },
    { id: "live", label: "Live Gifts", icon: <Radio className="w-4 h-4" /> },
    { id: "audience", label: "Audience", icon: <Users className="w-4 h-4" /> },
    { id: "wallet", label: "Wallet", icon: <Wallet className="w-4 h-4" /> },
    { id: "activity", label: "Activity", icon: <Activity className="w-4 h-4" /> },
  ];

  if (!user) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Sign in Required</h2>
            <p className="text-muted-foreground mb-4">Please sign in to access Creator Studio</p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background safe-area-inset-top pb-24 md:pb-6">
        {/* Header */}
        <div className="sticky top-0 z-50 glass border-b border-border/50 md:static md:bg-transparent md:backdrop-blur-none md:border-0">
          <div className="flex items-center justify-between p-4 md:pt-6 md:max-w-5xl md:mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 -ml-2 md:hidden">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg md:text-2xl font-bold gradient-text">Creator Studio</h1>
                <p className="text-xs text-muted-foreground">Real-time analytics</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={loading}
              className={`${loading ? "animate-spin" : ""} hover:bg-muted`}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick Stats Bar */}
          <div className="flex items-center gap-4 px-4 pb-2 overflow-x-auto hide-scrollbar md:max-w-5xl md:mx-auto">
            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <Eye className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold">{formatCompact(totalViews)}</span>
              <span className="text-muted-foreground">Plays</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <Heart className="w-3.5 h-3.5 text-red-400" />
              <span className="font-semibold">{formatCompact(totalLikes)}</span>
              <span className="text-muted-foreground">Likes</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold">{formatCompact(totalGifts)}</span>
              <span className="text-muted-foreground">Gifts</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold">{formatCompact(totalPostLikes)}</span>
              <span className="text-muted-foreground">Post ❤️</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              <span className="font-semibold">${formatCompact(walletData.totalBalance)}</span>
              <span className="text-muted-foreground">Earned</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-4 pb-2 overflow-x-auto hide-scrollbar md:max-w-5xl md:mx-auto md:gap-2">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all hover:scale-105 ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 md:max-w-5xl md:mx-auto">
          {loading && activeTab !== "live" ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <SevenDaySummary data={sevenDaySummary} />
                  <div className="md:grid md:grid-cols-2 md:gap-6 space-y-3 md:space-y-0">
                    {topViewsVideo && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">🏆 Most Plays</p>
                        <VideoPerformanceCard video={topViewsVideo} rank={1} highlight="views" />
                      </div>
                    )}
                    {topLikesVideo && topLikesVideo.id !== topViewsVideo?.id && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">❤️ Most Liked</p>
                        <VideoPerformanceCard video={topLikesVideo} highlight="likes" />
                      </div>
                    )}
                  </div>
                  <div className="glass rounded-xl p-4">
                    <h4 className="text-sm font-medium mb-3">Quick Stats</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-2xl font-bold gradient-text">{videos.length}</p>
                        <p className="text-xs text-muted-foreground">Total Videos</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-accent">{posts.length}</p>
                        <p className="text-xs text-muted-foreground">Total Posts</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-secondary">{formatCompact(totalGifts)}</p>
                        <p className="text-xs text-muted-foreground">Total Gifts</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-400">${formatCompact(walletData.totalBalance)}</p>
                        <p className="text-xs text-muted-foreground">Total Earnings</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "videos" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">All Videos ({videos.length})</h3>
                  {videos.length > 0 ? (
                    <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                      {videos.map((video, index) => (
                        <VideoPerformanceCard key={video.id} video={video} rank={index + 1} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Video className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">No videos uploaded yet</p>
                      <Button className="mt-4" onClick={() => navigate("/create")}>Create Your First Video</Button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "posts" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">All Posts ({posts.length})</h3>
                  {postsLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : posts.length > 0 ? (
                    <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                      {posts.map((post, index) => (
                        <div key={post.id} className="glass rounded-xl p-4 relative overflow-hidden">
                          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                            {index + 1}
                          </div>
                          <div className="flex gap-3">
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                              {post.image_url ? (
                                <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FileText className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate mb-1">
                                {post.content?.slice(0, 60) || "No caption"}
                              </p>
                              <p className="text-xs text-muted-foreground mb-3">
                                {new Date(post.created_at).toLocaleDateString()}
                              </p>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Heart className="w-3 h-3" /> {formatCompact(post.like_count || 0)}
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Eye className="w-3 h-3" /> {formatCompact(post.comment_count || 0)}
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Gift className="w-3 h-3" /> {formatCompact(post.share_count || 0)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">No posts yet</p>
                      <Button className="mt-4" onClick={() => navigate("/posts")}>Create Your First Post</Button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "live" && <LiveGiftHistory />}
              {activeTab === "audience" && <AudienceAnalytics data={audienceData} />}
              {activeTab === "wallet" && <WalletSection data={walletData} />}
              {activeTab === "activity" && <ActivityInsights data={activityData} />}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CreatorStudio;