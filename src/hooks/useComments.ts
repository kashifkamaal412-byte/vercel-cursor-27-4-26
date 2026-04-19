import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Comment {
  id: string;
  user_id: string;
  video_id: string;
  content: string;
  like_count: number;
  created_at: string;
  parent_id: string | null;
  media_url: string | null;
  is_private: boolean;
  is_edited: boolean;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  isLiked?: boolean;
  replies: Comment[];
  replies_count: number;
}

const PAGE_SIZE = 30;

export const useComments = (videoId: string) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);

  // Fetch profiles helper
  const fetchProfiles = async (userIds: string[]) => {
    if (!userIds.length) return new Map<string, any>();
    const { data } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", userIds);
    return new Map((data || []).map((p) => [p.user_id, p]));
  };

  // Fetch liked status for comments
  const fetchLikedStatus = async (commentIds: string[]) => {
    if (!user || !commentIds.length) return new Set<string>();
    const { data } = await (supabase as any)
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", user.id)
      .in("comment_id", commentIds);
    return new Set((data || []).map((d: any) => d.comment_id));
  };

  // Fetch reply counts for top-level comments
  const fetchReplyCounts = async (parentIds: string[]) => {
    if (!parentIds.length) return new Map<string, number>();
    const counts = new Map<string, number>();
    // Use a raw count query per parent - batch with promise.all
    const promises = parentIds.map(async (pid) => {
      const { count } = await (supabase as any)
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", pid);
      counts.set(pid, count || 0);
    });
    await Promise.all(promises);
    return counts;
  };

  const fetchComments = useCallback(async (reset = true) => {
    if (!videoId) return;
    
    try {
      if (reset) {
        setLoading(true);
        pageRef.current = 0;
      }

      const from = pageRef.current * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch top-level comments only (parent_id is null), respect privacy
      let query = (supabase as any)
        .from("comments")
        .select("*")
        .eq("video_id", videoId)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .range(from, to);

      // If not the video creator, filter out private comments from others
      if (user) {
        // We'll filter client-side after fetching since we need video owner info
      }

      const { data: rawComments, error } = await query;
      if (error) throw error;

      const commentsData = (rawComments as any[]) || [];
      
      if (commentsData.length < PAGE_SIZE) setHasMore(false);
      else setHasMore(true);

      // Get profiles, liked status, reply counts in parallel
      const userIds = [...new Set(commentsData.map((c) => c.user_id))];
      const commentIds = commentsData.map((c) => c.id);
      
      const [profilesMap, likedSet, replyCounts] = await Promise.all([
        fetchProfiles(userIds),
        fetchLikedStatus(commentIds),
        fetchReplyCounts(commentIds),
      ]);

      const mapped: Comment[] = commentsData.map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        video_id: c.video_id,
        content: c.content,
        like_count: c.like_count || 0,
        created_at: c.created_at,
        parent_id: c.parent_id || null,
        media_url: c.media_url || null,
        is_private: c.is_private || false,
        is_edited: c.is_edited || false,
        profile: profilesMap.get(c.user_id) || null,
        isLiked: likedSet.has(c.id),
        replies: [],
        replies_count: replyCounts.get(c.id) || 0,
      }));

      if (reset) {
        setComments(mapped);
      } else {
        setComments((prev) => [...prev, ...mapped]);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoading(false);
    }
  }, [videoId, user]);

  const loadMore = useCallback(async () => {
    pageRef.current += 1;
    await fetchComments(false);
  }, [fetchComments]);

  // Fetch replies for a specific comment
  const fetchReplies = useCallback(async (parentId: string): Promise<Comment[]> => {
    const { data, error } = await (supabase as any)
      .from("comments")
      .select("*")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    const userIds = [...new Set((data as any[]).map((c) => c.user_id))];
    const commentIds = (data as any[]).map((c) => c.id);
    const [profilesMap, likedSet] = await Promise.all([
      fetchProfiles(userIds),
      fetchLikedStatus(commentIds),
    ]);

    return (data as any[]).map((c: any) => ({
      id: c.id,
      user_id: c.user_id,
      video_id: c.video_id,
      content: c.content,
      like_count: c.like_count || 0,
      created_at: c.created_at,
      parent_id: c.parent_id,
      media_url: c.media_url || null,
      is_private: c.is_private || false,
      is_edited: c.is_edited || false,
      profile: profilesMap.get(c.user_id) || null,
      isLiked: likedSet.has(c.id),
      replies: [],
      replies_count: 0,
    }));
  }, [user]);

  // Toggle replies for a comment (fetch or collapse)
  const toggleReplies = useCallback(async (parentId: string) => {
    const comment = comments.find((c) => c.id === parentId);
    if (!comment) return;

    if (comment.replies.length > 0) {
      // Collapse
      setComments((prev) => prev.map((c) =>
        c.id === parentId ? { ...c, replies: [] } : c
      ));
    } else {
      // Expand
      const replies = await fetchReplies(parentId);
      setComments((prev) => prev.map((c) =>
        c.id === parentId ? { ...c, replies } : c
      ));
    }
  }, [comments, fetchReplies]);

  useEffect(() => {
    if (videoId) fetchComments();
  }, [fetchComments, videoId]);

  // Real-time subscription for INSERT, UPDATE, DELETE
  useEffect(() => {
    if (!videoId) return;

    const channel = supabase
      .channel(`comments-rt-${videoId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "comments",
        filter: `video_id=eq.${videoId}`,
      }, async (payload) => {
        const newComment = payload.new as any;
        const [profilesMap] = await Promise.all([
          fetchProfiles([newComment.user_id]),
        ]);

        const mapped: Comment = {
          id: newComment.id,
          user_id: newComment.user_id,
          video_id: newComment.video_id,
          content: newComment.content,
          like_count: newComment.like_count || 0,
          created_at: newComment.created_at,
          parent_id: newComment.parent_id || null,
          media_url: newComment.media_url || null,
          is_private: newComment.is_private || false,
          is_edited: newComment.is_edited || false,
          profile: profilesMap.get(newComment.user_id) || null,
          isLiked: false,
          replies: [],
          replies_count: 0,
        };

        if (newComment.parent_id) {
          // It's a reply - update parent's replies and count
          setComments((prev) => prev.map((c) =>
            c.id === newComment.parent_id
              ? { ...c, replies: [...c.replies, mapped], replies_count: c.replies_count + 1 }
              : c
          ));
        } else {
          // Top-level comment - prepend (avoid duplicates)
          setComments((prev) => {
            if (prev.some((c) => c.id === mapped.id)) return prev;
            return [mapped, ...prev];
          });
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "comments",
        filter: `video_id=eq.${videoId}`,
      }, (payload) => {
        const updated = payload.new as any;
        setComments((prev) => prev.map((c) => {
          if (c.id === updated.id) {
            return { ...c, content: updated.content, is_edited: updated.is_edited || false, like_count: updated.like_count || 0 };
          }
          // Check replies
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === updated.id
                ? { ...r, content: updated.content, is_edited: updated.is_edited || false, like_count: updated.like_count || 0 }
                : r
            ),
          };
        }));
      })
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "comments",
        filter: `video_id=eq.${videoId}`,
      }, (payload) => {
        const deletedId = (payload.old as any).id;
        setComments((prev) => {
          // Remove top-level or from replies
          return prev
            .filter((c) => c.id !== deletedId)
            .map((c) => ({
              ...c,
              replies: c.replies.filter((r) => r.id !== deletedId),
              replies_count: c.replies.some((r) => r.id === deletedId) ? c.replies_count - 1 : c.replies_count,
            }));
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [videoId]);

  // Add comment
  const addComment = async (content: string, parentId?: string | null, isPrivate = false, mediaUrl?: string | null): Promise<boolean> => {
    if (!user || (!content.trim() && !mediaUrl)) return false;

    // Sanitize comment content
    const { sanitizeInput } = await import("@/lib/sanitize");
    const cleanContent = sanitizeInput(content.trim());
    if (!cleanContent && !mediaUrl) return false;

    const insertData: any = {
      user_id: user.id,
      video_id: videoId,
      content: cleanContent,
    };
    if (parentId) insertData.parent_id = parentId;
    if (isPrivate) insertData.is_private = true;
    if (mediaUrl) insertData.media_url = mediaUrl;

    const { error } = await (supabase as any).from("comments").insert(insertData);
    return !error;
  };

  // Edit comment
  const editComment = async (commentId: string, newContent: string): Promise<boolean> => {
    if (!user || !newContent.trim()) return false;
    const { sanitizeInput } = await import("@/lib/sanitize");
    const cleanContent = sanitizeInput(newContent.trim());
    if (!cleanContent) return false;
    const { error } = await (supabase as any)
      .from("comments")
      .update({ content: cleanContent, is_edited: true })
      .eq("id", commentId)
      .eq("user_id", user.id);
    return !error;
  };

  // Delete comment (owner or video creator)
  const deleteComment = async (commentId: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);
    return !error;
  };

  // Like/unlike comment
  const toggleCommentLike = async (commentId: string, currentlyLiked: boolean): Promise<boolean> => {
    if (!user) return false;

    if (currentlyLiked) {
      const { error } = await (supabase as any)
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);
      if (!error) {
        setComments((prev) => prev.map((c) => {
          if (c.id === commentId) return { ...c, isLiked: false, like_count: Math.max(0, c.like_count - 1) };
          return { ...c, replies: c.replies.map((r) => r.id === commentId ? { ...r, isLiked: false, like_count: Math.max(0, r.like_count - 1) } : r) };
        }));
      }
      return !error;
    } else {
      const { error } = await (supabase as any)
        .from("comment_likes")
        .insert({ comment_id: commentId, user_id: user.id });
      if (!error) {
        setComments((prev) => prev.map((c) => {
          if (c.id === commentId) return { ...c, isLiked: true, like_count: c.like_count + 1 };
          return { ...c, replies: c.replies.map((r) => r.id === commentId ? { ...r, isLiked: true, like_count: r.like_count + 1 } : r) };
        }));
      }
      return !error;
    }
  };

  // Report comment
  const reportComment = async (commentId: string, reason: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await (supabase as any)
      .from("comment_reports")
      .insert({ comment_id: commentId, user_id: user.id, reason });
    return !error;
  };

  // Upload comment media
  const uploadCommentMedia = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    // Compress if needed (limit to 1MB)
    const maxSize = 1024 * 1024;
    let uploadFile = file;
    if (file.size > maxSize && file.type.startsWith("image/")) {
      try {
        uploadFile = await compressImage(file, maxSize);
      } catch { /* use original */ }
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `comment-media/${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("videos").upload(path, uploadFile);
    if (error) return null;
    // Store relative path instead of public URL - resolved via signed URL at display time
    return path;
  };

  return {
    comments,
    loading,
    hasMore,
    addComment,
    editComment,
    deleteComment,
    toggleCommentLike,
    reportComment,
    fetchReplies,
    toggleReplies,
    loadMore,
    uploadCommentMedia,
    refetch: fetchComments,
  };
};

// Simple image compression
async function compressImage(file: File, maxBytes: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const scale = Math.min(1, Math.sqrt(maxBytes / file.size));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no ctx")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("no blob")); return; }
        resolve(new File([blob], file.name, { type: "image/jpeg" }));
      }, "image/jpeg", 0.7);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
