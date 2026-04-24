import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/lib/sanitize";
import { useAuth } from "@/contexts/AuthContext";

export interface Post {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  location: string | null;
  tags: string[] | null;
  like_count: number;
  comment_count: number;
  share_count: number;
  save_count: number;
  gift_count: number;
  is_public: boolean;
  allow_comments: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    total_followers: number | null;
    bio: string | null;
  };
  isLiked?: boolean;
}

export const usePosts = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const userIds = [...new Set((data || []).map((p: any) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, total_followers, bio")
        .in("user_id", userIds);

      let likedPostIds: Set<string> = new Set();
      if (user) {
        const { data: likes } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id);
        likedPostIds = new Set((likes || []).map((l: any) => l.post_id));
      }

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const enrichedPosts: Post[] = (data || []).map((post: any) => ({
        ...post,
        like_count: post.like_count || 0,
        comment_count: post.comment_count || 0,
        share_count: post.share_count || 0,
        save_count: post.save_count || 0,
        gift_count: post.gift_count || 0,
        profile: profileMap.get(post.user_id) || null,
        isLiked: likedPostIds.has(post.id),
      }));

      setPosts(enrichedPosts);
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const likePost = useCallback(async (postId: string) => {
    if (!user) return false;
    
    const post = posts.find(p => p.id === postId);
    if (!post) return false;

    if (post.isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      await supabase.from("posts").update({ like_count: Math.max(0, post.like_count - 1) }).eq("id", postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: false, like_count: Math.max(0, p.like_count - 1) } : p));
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      await supabase.from("posts").update({ like_count: post.like_count + 1 }).eq("id", postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: true, like_count: p.like_count + 1 } : p));
    }
    return true;
  }, [user, posts]);

  const createPost = useCallback(async (content: string, imageFile?: File) => {
    if (!user) return null;

    let imageUrl: string | null = null;
    if (imageFile) {
      const fileName = `${user.id}/${crypto.randomUUID()}.${imageFile.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("thumbnails")
        .upload(fileName, imageFile, { cacheControl: "3600", upsert: false });
      
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(uploadData.path);
      imageUrl = urlData.publicUrl;
    }

    const cleanContent = sanitizeInput(content);
    const hashtags = (content.match(/#\w+/g) || []).map(t => t.slice(1)).slice(0, 20);

    const { data, error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: cleanContent || null,
      image_url: imageUrl,
      tags: hashtags.length > 0 ? hashtags : null,
    }).select().single();

    if (error) throw error;
    
    await fetchPosts();
    return data;
  }, [user, fetchPosts]);

  const updatePost = useCallback(async (postId: string, content: string, imageFile?: File) => {
    if (!user) return null;

    let imageUrl: string | undefined;
    if (imageFile) {
      const fileName = `${user.id}/${crypto.randomUUID()}.${imageFile.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("thumbnails")
        .upload(fileName, imageFile, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(uploadData.path);
      imageUrl = urlData.publicUrl;
    }

    const cleanContent = sanitizeInput(content);
    const hashtags = (content.match(/#\w+/g) || []).map(t => t.slice(1)).slice(0, 20);

    const updateData: any = {
      content: cleanContent || null,
      tags: hashtags.length > 0 ? hashtags : null,
      updated_at: new Date().toISOString(),
    };
    if (imageUrl) updateData.image_url = imageUrl;

    const { error } = await supabase.from("posts").update(updateData).eq("id", postId).eq("user_id", user.id);
    if (error) throw error;

    await fetchPosts();
    return true;
  }, [user, fetchPosts]);

  const togglePostPrivacy = useCallback(async (postId: string, isPublic: boolean) => {
    if (!user) return false;
    const { error } = await supabase.from("posts").update({ is_public: isPublic }).eq("id", postId).eq("user_id", user.id);
    if (error) { console.error("Toggle privacy error:", error); return false; }
    setPosts(prev => prev.filter(p => {
      if (p.id === postId && !isPublic) return false; // remove from public feed
      return true;
    }));
    return true;
  }, [user]);

  const toggleComments = useCallback(async (postId: string, allow: boolean) => {
    if (!user) return false;
    const { error } = await supabase.from("posts").update({ allow_comments: allow }).eq("id", postId).eq("user_id", user.id);
    if (error) { console.error("Toggle comments error:", error); return false; }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, allow_comments: allow } : p));
    return true;
  }, [user]);

  const deletePost = useCallback(async (postId: string) => {
    if (!user) return false;
    const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", user.id);
    if (error) { console.error("Delete post error:", error); return false; }
    setPosts(prev => prev.filter(p => p.id !== postId));
    return true;
  }, [user]);

  return { posts, loading, likePost, createPost, updatePost, deletePost, togglePostPrivacy, toggleComments, refetch: fetchPosts };
};
