import { useState, useEffect, useCallback } from "react";
import {
  Search,
  TrendingUp,
  Hash,
  Sparkles,
  Users,
  Music,
  Gamepad2,
  Utensils,
  X,
  Clock,
  Play,
  Eye,
  Heart,
  Loader2,
  Radio,
  Film,
  User,
  Volume2,
  Trash2,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSearch, useTrendingVideos } from "@/hooks/useSearch";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

const categories = [
  { icon: TrendingUp, label: "Trending", color: "from-primary to-secondary", tag: "trending" },
  { icon: Hash, label: "Dance", color: "from-accent to-secondary", tag: "dance" },
  { icon: Sparkles, label: "Comedy", color: "from-neon-pink to-accent", tag: "comedy" },
  { icon: Music, label: "Music", color: "from-primary to-neon-cyan", tag: "music" },
  { icon: Gamepad2, label: "Gaming", color: "from-accent to-primary", tag: "gaming" },
  { icon: Utensils, label: "Food", color: "from-secondary to-accent", tag: "food" },
];

// Search tabs
const tabs = [
  { id: "all", label: "All", icon: Search },
  { id: "profiles", label: "Profiles", icon: User },
  { id: "posts", label: "Posts", icon: FileText },
  { id: "short", label: "Short Videos", icon: Film },
  { id: "long", label: "Long Videos", icon: Play },
  { id: "sounds", label: "Sounds", icon: Volume2 },
  { id: "live", label: "Live", icon: Radio },
];

const Discover = () => {
  const navigate = useNavigate();
  const {
    query,
    setQuery,
    results,
    loading: searchLoading,
    search,
    searchHistory,
    clearHistory,
    removeHistoryItem, // assume this exists in the hook
  } = useSearch();
  const { videos: trendingVideos, loading: trendingLoading } = useTrendingVideos();
  useScrollRestoration();
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("all");

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        search(query);
        setShowHistory(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  const handleCategoryClick = (tag: string) => {
    setQuery(tag);
    setSelectedCategory(tag);
    search(tag);
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    search(historyQuery);
    setShowHistory(false);
  };

  const handleRemoveHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    removeHistoryItem(item);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Filter results based on selected tab
  const getFilteredResults = () => {
    if (!results) return { videos: [], creators: [], posts: [] };
    let filteredVideos = results.videos || [];
    let filteredCreators = results.creators || [];
    let filteredPosts = results.posts || [];

    switch (selectedTab) {
      case "profiles":
        return { videos: [], creators: filteredCreators, posts: [] };
      case "posts":
        return { videos: [], creators: [], posts: filteredPosts };
      case "short":
        filteredVideos = filteredVideos.filter((v) => v.video_type === "short");
        return { videos: filteredVideos, creators: [], posts: [] };
      case "long":
        filteredVideos = filteredVideos.filter((v) => v.video_type === "long");
        return { videos: filteredVideos, creators: [], posts: [] };
      case "live":
        filteredVideos = filteredVideos.filter((v) => (v as any).is_live === true);
        return { videos: filteredVideos, creators: [], posts: [] };
      default: // all
        return { videos: filteredVideos, creators: filteredCreators, posts: filteredPosts };
    }
  };

  const filtered = getFilteredResults();
  const hasResults = filtered.videos.length > 0 || filtered.creators.length > 0 || filtered.posts.length > 0;
  const showSearchResults = query.trim() && (hasResults || searchLoading);

  return (
    <MainLayout>
      <div className="min-h-screen p-4 pt-6 pb-20 md:pb-6 md:max-w-6xl md:mx-auto">
        {/* Header */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground mb-6"
        >
          Discover
        </motion.h1>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-4"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowHistory(true)}
            placeholder="Search videos, creators, sounds..."
            className="pl-12 pr-10 h-12 bg-muted border-glass-border rounded-2xl text-foreground placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setShowHistory(false);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}

          {/* Search History Dropdown */}
          <AnimatePresence>
            {showHistory && searchHistory.length > 0 && !query && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-card border border-glass-border rounded-xl p-3 z-50 shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Recent Searches</span>
                  <button onClick={clearHistory} className="text-xs text-primary">
                    Clear All
                  </button>
                </div>
                <div className="space-y-2">
                  {searchHistory.slice(0, 5).map((h, i) => (
                    <div key={i} className="flex items-center justify-between group">
                      <button
                        onClick={() => handleHistoryClick(h)}
                        className="flex items-center gap-2 flex-1 p-2 hover:bg-muted rounded-lg transition-colors text-left"
                      >
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground text-sm">{h}</span>
                      </button>
                      <button
                        onClick={(e) => handleRemoveHistoryItem(e, h)}
                        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Search Tabs */}
        {query && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                      selectedTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Search Results */}
        <AnimatePresence mode="wait">
          {showSearchResults ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {searchLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Creators Results */}
                  {filtered.creators.length > 0 && (
                    <div>
                      <h2 className="text-lg font-bold text-foreground mb-4">Creators</h2>
                      <div className="space-y-3">
                        {filtered.creators.slice(0, 5).map((creator) => (
                          <motion.button
                            key={creator.user_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => navigate(`/user/${creator.user_id}`)}
                            className="flex items-center gap-3 w-full p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                          >
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={creator.avatar_url || undefined} />
                              <AvatarFallback>{creator.display_name?.[0] || "U"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left">
                              <p className="font-semibold text-foreground">
                                {creator.display_name || creator.username || "User"}
                              </p>
                              <p className="text-sm text-muted-foreground">@{creator.username || "user"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-foreground">
                                {formatNumber(creator.total_followers || 0)}
                              </p>
                              <p className="text-xs text-muted-foreground">Fans</p>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos Results */}
                  {filtered.videos.length > 0 && (
                    <div>
                      <h2 className="text-lg font-bold text-foreground mb-4">
                        {selectedTab === "live" ? "Live Videos" : "Videos"}
                      </h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filtered.videos.map((video, index) => (
                          <motion.div
                            key={video.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => navigate(`/video/${video.id}`)}
                            className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted cursor-pointer group"
                          >
                            {video.thumbnail_url ? (
                              <img
                                src={video.thumbnail_url}
                                alt={video.caption || "Video"}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                                <Play className="w-8 h-8 text-foreground/50" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                            {/* Live Badge */}
                            {(video as any).is_live && (
                              <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                LIVE
                              </div>
                            )}

                            <div className="absolute bottom-2 left-2 right-2">
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar className="w-5 h-5">
                                  <AvatarImage src={video.profile?.avatar_url || undefined} />
                                  <AvatarFallback className="text-[8px]">
                                    {video.profile?.display_name?.[0] || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-white text-xs font-medium truncate">
                                  @{video.profile?.username || "user"}
                                </span>
                              </div>
                              <p className="text-white text-xs line-clamp-2 mb-1">{video.caption || "Untitled"}</p>
                              <div className="flex items-center gap-2 text-white/70 text-xs">
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {formatNumber(video.view_count || 0)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Heart className="w-3 h-3" />
                                  {formatNumber(video.like_count || 0)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Posts Results */}
                  {filtered.posts && filtered.posts.length > 0 && (
                    <div>
                      <h2 className="text-lg font-bold text-foreground mb-4">Posts</h2>
                      <div className="space-y-3">
                        {filtered.posts.map((post: any, index: number) => (
                          <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => navigate("/posts")}
                            className="flex gap-3 p-3 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted transition-colors"
                          >
                            {post.image_url && (
                              <img src={post.image_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar className="w-5 h-5">
                                  <AvatarImage src={post.profile?.avatar_url} />
                                  <AvatarFallback className="text-[8px]">{post.profile?.display_name?.[0] || "U"}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground truncate">{post.profile?.display_name || "User"}</span>
                              </div>
                              <p className="text-sm text-foreground line-clamp-2">{post.content || "No caption"}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {formatNumber(post.like_count || 0)}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Results */}
                  {!hasResults && !searchLoading && (
                    <div className="text-center py-12">
                      <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-foreground font-medium mb-2">No results found</h3>
                      <p className="text-sm text-muted-foreground">Try different keywords or check spelling</p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Categories */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <h2 className="text-lg font-bold text-foreground mb-4">Browse Categories</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {categories.map((cat, index) => (
                    <motion.button
                      key={cat.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleCategoryClick(cat.tag)}
                      className={`p-4 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center gap-3`}
                    >
                      <cat.icon className="w-6 h-6 text-foreground" />
                      <span className="font-semibold text-foreground">{cat.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Trending Now */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <h2 className="text-lg font-bold text-foreground mb-4">Trending Now 🔥</h2>

                {trendingLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : trendingVideos.length === 0 ? (
                  <div className="glass rounded-xl p-8 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-foreground font-medium mb-2">No content to discover yet</h3>
                    <p className="text-sm text-muted-foreground">When creators upload videos, you'll find them here</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {trendingVideos.slice(0, 6).map((video, index) => (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        onClick={() => navigate(`/video/${video.id}`)}
                        className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted cursor-pointer group"
                      >
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt={video.caption || "Video"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                            <Play className="w-8 h-8 text-foreground/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                        {/* Trending Badge */}
                        {index < 3 && (
                          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                            #{index + 1}
                          </div>
                        )}

                        {/* Live Badge for any live video in trending */}
                        {(video as any).is_live && (
                          <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            LIVE
                          </div>
                        )}

                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={video.profile?.avatar_url || undefined} />
                              <AvatarFallback className="text-[8px]">
                                {video.profile?.display_name?.[0] || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-white text-xs font-medium truncate">
                              @{video.profile?.username || "user"}
                            </span>
                          </div>
                          <p className="text-white text-xs line-clamp-2 mb-1">{video.caption || "Untitled"}</p>
                          <div className="flex items-center gap-2 text-white/70 text-xs">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {formatNumber(video.view_count || 0)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {formatNumber(video.like_count || 0)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
};

export default Discover;
