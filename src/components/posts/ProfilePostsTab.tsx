import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PostCard } from "./PostCard";
import { PostEditSheet } from "./PostEditSheet";
import { Post } from "@/hooks/usePosts";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { toast } from "sonner";

interface ProfilePostsTabProps {
  userId: string;
  isOwnProfile: boolean;
}

export const ProfilePostsTab = ({ userId, isOwnProfile }: ProfilePostsTabProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
      if (!isOwnProfile) query = query.eq("is_public", true);

      const { data, error } = await query;
      if (error) throw error;

      const { data: profiles } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url, total_followers, bio").eq("user_id", userId);
      const profile = profiles?.[0] || null;

      let likedPostIds = new Set<string>();
      if (user) {
        const postIds = (data || []).map((p: any) => p.id);
        if (postIds.length > 0) {
          const { data: likes } = await supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
          likedPostIds = new Set((likes || []).map((l: any) => l.post_id));
        }
      }

      setPosts((data || []).map((post: any) => ({
        ...post,
        like_count: post.like_count || 0,
        comment_count: post.comment_count || 0,
        share_count: post.share_count || 0,
        save_count: post.save_count || 0,
        gift_count: post.gift_count || 0,
        profile,
        isLiked: likedPostIds.has(post.id),
      })));
    } catch (err) {
      console.error("Error fetching profile posts:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, user, isOwnProfile]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleLike = useCallback(async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (post.isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      await supabase.from("posts").update({ like_count: Math.max(0, post.like_count - 1) }).eq("id", postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: false, like_count: Math.max(0, p.like_count - 1) } : p));
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      await supabase.from("posts").update({ like_count: post.like_count + 1 }).eq("id", postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: true, like_count: p.like_count + 1 } : p));
    }
  }, [user, posts]);

  const handleDelete = useCallback(async (postId: string) => {
    if (!user) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", user.id);
    if (error) { toast.error("Failed to delete"); return; }
    setPosts(prev => prev.filter(p => p.id !== postId));
    toast.success("Post deleted");
  }, [user]);

  const handleTogglePrivacy = useCallback(async (postId: string, isPublic: boolean) => {
    if (!user) return;
    const { error } = await supabase.from("posts").update({ is_public: isPublic }).eq("id", postId).eq("user_id", user.id);
    if (error) { toast.error("Failed to update"); return; }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_public: isPublic } : p));
    toast.success(isPublic ? "Post is now public" : "Post moved to private");
  }, [user]);

  const handleToggleComments = useCallback(async (postId: string, allow: boolean) => {
    if (!user) return;
    const { error } = await supabase.from("posts").update({ allow_comments: allow }).eq("id", postId).eq("user_id", user.id);
    if (error) { toast.error("Failed to update"); return; }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, allow_comments: allow } : p));
    toast.success(allow ? "Comments enabled" : "Comments disabled");
  }, [user]);

  const handleUpdatePost = useCallback(async (postId: string, content: string, imageFile?: File) => {
    if (!user) return;
    let imageUrl: string | undefined;
    if (imageFile) {
      const fileName = `${user.id}/${crypto.randomUUID()}.${imageFile.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from("thumbnails").upload(fileName, imageFile, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(uploadData.path);
      imageUrl = urlData.publicUrl;
    }
    const hashtags = (content.match(/#\w+/g) || []).map(t => t.slice(1)).slice(0, 20);
    const updateData: any = { content: content.trim() || null, tags: hashtags.length > 0 ? hashtags : null, updated_at: new Date().toISOString() };
    if (imageUrl) updateData.image_url = imageUrl;
    const { error } = await supabase.from("posts").update(updateData).eq("id", postId).eq("user_id", user.id);
    if (error) throw error;
    await fetchPosts();
  }, [user, fetchPosts]);

  if (loading) {
    return (
      <div className="p-3 space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2"><Skeleton className="w-10 h-10 rounded-full" /><div className="space-y-1"><Skeleton className="h-3 w-24" /><Skeleton className="h-2.5 w-16" /></div></div>
            <Skeleton className="w-full h-60" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">No Posts Yet</h3>
        <p className="text-sm text-muted-foreground">
          {isOwnProfile ? "Share your first post!" : "This user hasn't posted yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onLike={handleLike}
          onDelete={isOwnProfile ? handleDelete : undefined}
          onEdit={isOwnProfile ? (p) => setEditingPost(p) : undefined}
          onTogglePrivacy={isOwnProfile ? handleTogglePrivacy : undefined}
          onToggleComments={isOwnProfile ? handleToggleComments : undefined}
        />
      ))}

      {editingPost && (
        <PostEditSheet
          post={editingPost}
          open={!!editingPost}
          onClose={() => setEditingPost(null)}
          onSave={async (content, imageFile) => {
            try {
              await handleUpdatePost(editingPost.id, content, imageFile);
              toast.success("Post updated!");
              setEditingPost(null);
            } catch {
              toast.error("Failed to update post");
            }
          }}
        />
      )}
    </div>
  );
};
