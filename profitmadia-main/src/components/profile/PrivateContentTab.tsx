import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Lock, Play, MoreHorizontal, Film, Grid3X3 } from "lucide-react";
import { Video } from "@/hooks/useVideos";
import { Post } from "@/hooks/usePosts";
import { ContentSubTabs, getFullSubTabs, SubTabId } from "./ContentSubTabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PostCard } from "@/components/posts/PostCard";
import { toast } from "sonner";

interface PrivateContentTabProps {
  videos: Video[];
  userId: string;
  onVideoClick: (video: Video, index: number) => void;
  onMenuClick: (video: Video) => void;
  isOwnProfile: boolean;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const PrivateContentTab = ({ videos, userId, onVideoClick, onMenuClick, isOwnProfile }: PrivateContentTabProps) => {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<SubTabId>("shorts");
  const [privatePosts, setPrivatePosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const privateShorts = videos.filter((v) => (v.video_type === "short" || !v.video_type) && !v.is_public);
  const privateLong = videos.filter((v) => v.video_type === "long" && !v.is_public);

  // Fetch private posts
  useEffect(() => {
    if (!user || !isOwnProfile) { setLoadingPosts(false); return; }
    const fetchPrivatePosts = async () => {
      setLoadingPosts(true);
      try {
        const { data } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", userId)
          .eq("is_public", false)
          .order("created_at", { ascending: false });
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url, total_followers, bio")
          .eq("user_id", userId);
        const profile = profiles?.[0] || null;

        setPrivatePosts((data || []).map((post: any) => ({
          ...post,
          like_count: post.like_count || 0,
          comment_count: post.comment_count || 0,
          share_count: post.share_count || 0,
          save_count: post.save_count || 0,
          gift_count: post.gift_count || 0,
          profile,
          isLiked: false,
        })));
      } catch { /* silent */ }
      setLoadingPosts(false);
    };
    fetchPrivatePosts();
  }, [user, userId, isOwnProfile]);

  const tabs = getFullSubTabs(privateShorts.length, privateLong.length, privatePosts.length);
  const activeVideos = subTab === "shorts" ? privateShorts : subTab === "long" ? privateLong : [];

  const handlePostLike = useCallback(async (postId: string) => {
    if (!user) return;
    const post = privatePosts.find(p => p.id === postId);
    if (!post) return;
    if (post.isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      setPrivatePosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: false, like_count: Math.max(0, p.like_count - 1) } : p));
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      setPrivatePosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: true, like_count: p.like_count + 1 } : p));
    }
  }, [user, privatePosts]);

  const handlePostTogglePrivacy = useCallback(async (postId: string, isPublic: boolean) => {
    if (!user) return;
    await supabase.from("posts").update({ is_public: isPublic }).eq("id", postId).eq("user_id", user.id);
    if (isPublic) {
      setPrivatePosts(prev => prev.filter(p => p.id !== postId));
      toast.success("Post is now public");
    }
  }, [user]);

  if (subTab === "posts") {
    if (loadingPosts) {
      return (
        <div>
          <ContentSubTabs tabs={tabs} activeTab={subTab} onTabChange={setSubTab} />
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      );
    }

    return (
      <div>
        <ContentSubTabs tabs={tabs} activeTab={subTab} onTabChange={setSubTab} />
        {privatePosts.length === 0 ? (
          <EmptyState type="Posts" />
        ) : (
          <div className="pb-20">
            {privatePosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handlePostLike}
                onTogglePrivacy={isOwnProfile ? handlePostTogglePrivacy : undefined}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <ContentSubTabs tabs={tabs} activeTab={subTab} onTabChange={setSubTab} />

      {activeVideos.length === 0 ? (
        <EmptyState type={subTab === "shorts" ? "Shorts" : "Long Videos"} />
      ) : subTab === "long" ? (
        <div className="flex flex-col">
          {activeVideos.map((video, index) => (
            <div
              key={video.id}
              className="flex p-3 gap-3 border-b border-border/10 hover:bg-muted/30 transition-colors relative cursor-pointer"
              onClick={() => onVideoClick(video, index)}
            >
              <div className="relative w-40 h-24 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                {video.duration > 0 && (
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded-sm">
                    {formatDuration(video.duration)}
                  </div>
                )}
                <div className="absolute top-1 left-1 bg-red-500/80 text-white text-[8px] px-1 rounded-sm">
                  <Lock className="w-2 h-2 inline mr-0.5" />PRIVATE
                </div>
              </div>
              <div className="flex flex-col flex-1">
                <h4 className="text-sm font-medium text-foreground line-clamp-2">{video.caption || "Untitled"}</h4>
                <span className="text-xs text-muted-foreground mt-1">{formatNumber(video.view_count || 0)} plays</span>
              </div>
              {isOwnProfile && (
                <button onClick={(e) => { e.stopPropagation(); onMenuClick(video); }} className="absolute right-2 top-3 p-1">
                  <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-0.5 p-0.5">
          {activeVideos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className="aspect-[9/16] relative overflow-hidden cursor-pointer bg-muted group"
              onClick={() => onVideoClick(video, index)}
            >
              {video.thumbnail_url ? (
                <img src={video.thumbnail_url} alt={video.caption || ""} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Grid3X3 className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute top-1 left-1 bg-red-500/80 text-white text-[8px] px-1 rounded-sm">
                <Lock className="w-2 h-2 inline mr-0.5" />PRIVATE
              </div>
              <div className="absolute bottom-1 left-1 flex items-center gap-1 text-xs text-white font-medium">
                <Play className="w-3 h-3 fill-white" /> {formatNumber(video.view_count || 0)}
              </div>
              {isOwnProfile && (
                <div className="absolute top-1 right-1 z-20" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onMenuClick(video)} className="p-1 rounded-full bg-black/50 text-white">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

const EmptyState = ({ type }: { type: string }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
      <Lock className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="text-base font-semibold text-foreground mb-1">No Private {type}</h3>
    <p className="text-sm text-muted-foreground">Your private {type.toLowerCase()} will appear here</p>
  </div>
);
