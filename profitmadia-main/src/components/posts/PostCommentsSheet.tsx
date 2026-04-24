import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, X, Heart, Smile, MoreVertical, Trash2, Flag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface PostCommentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  commentCount: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  like_count: number;
  parent_id: string | null;
  profile?: { username: string | null; avatar_url: string | null; display_name: string | null };
  isLiked?: boolean;
  replies?: Comment[];
  showReplies?: boolean;
}

const quickEmojis = ["😂", "❤️", "🔥", "👏", "😍", "😭", "🙏", "💯"];

function timeAgo(dateStr: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (diff < 5) return "Just now";
  if (diff < 60) return `${diff}s`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export const PostCommentsSheet = ({ open, onOpenChange, postId, commentCount }: PostCommentsSheetProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fetchComments = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", postId)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(100);

      if (data) {
        const userIds = [...new Set(data.map((c: any) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url, display_name")
          .in("user_id", userIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

        // Fetch replies
        const commentIds = data.map((c: any) => c.id);
        const { data: repliesData } = await supabase
          .from("post_comments")
          .select("*")
          .in("parent_id", commentIds)
          .order("created_at", { ascending: true });

        const replyUserIds = repliesData ? [...new Set(repliesData.map((r: any) => r.user_id))] : [];
        if (replyUserIds.length > 0) {
          const { data: replyProfiles } = await supabase
            .from("profiles")
            .select("user_id, username, avatar_url, display_name")
            .in("user_id", replyUserIds);
          (replyProfiles || []).forEach((p: any) => profileMap.set(p.user_id, p));
        }

        const repliesByParent = new Map<string, Comment[]>();
        (repliesData || []).forEach((r: any) => {
          const list = repliesByParent.get(r.parent_id) || [];
          list.push({ ...r, profile: profileMap.get(r.user_id), like_count: r.like_count || 0 });
          repliesByParent.set(r.parent_id, list);
        });

        setComments(data.map((c: any) => ({
          ...c,
          profile: profileMap.get(c.user_id),
          like_count: c.like_count || 0,
          replies: repliesByParent.get(c.id) || [],
          showReplies: false,
        })));
      }
      setLoading(false);
    };
    fetchComments();
  }, [open, postId]);

  const handleSend = async () => {
    if (!user || !newComment.trim()) return;
    const content = newComment.trim();
    const parentId = replyingTo?.id || null;

    const { data, error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: user.id,
      content,
      parent_id: parentId,
    }).select().single();

    if (error) { toast.error("Failed to comment"); return; }

    const newCommentObj: Comment = {
      id: data?.id || crypto.randomUUID(),
      content,
      created_at: new Date().toISOString(),
      user_id: user.id,
      like_count: 0,
      parent_id: parentId,
      profile: undefined,
    };

    if (parentId) {
      setComments(prev => prev.map(c => 
        c.id === parentId 
          ? { ...c, replies: [...(c.replies || []), newCommentObj], showReplies: true } 
          : c
      ));
    } else {
      setComments(prev => [{ ...newCommentObj, replies: [], showReplies: false }, ...prev]);
    }
    
    setNewComment("");
    setReplyingTo(null);
    setShowEmojis(false);
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from("post_comments").delete().eq("id", commentId);
    setComments(prev => prev.filter(c => c.id !== commentId).map(c => ({
      ...c,
      replies: (c.replies || []).filter(r => r.id !== commentId),
    })));
    toast.success("Comment deleted");
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/40"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[56] bg-background rounded-t-3xl border-t border-border/20 flex flex-col"
            style={{ height: "65vh", maxHeight: "65vh" }}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-2" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
              <h3 className="text-sm font-bold text-foreground">{commentCount} Comments</h3>
              <button onClick={() => onOpenChange(false)} className="p-1">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Comments List */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <p className="text-muted-foreground text-sm">No comments yet</p>
                  <p className="text-muted-foreground/60 text-xs">Be the first to comment!</p>
                </div>
              ) : (
                comments.map(comment => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    currentUserId={user?.id}
                    onReply={(c) => { setReplyingTo(c); inputRef.current?.focus(); }}
                    onDelete={handleDelete}
                    onNavigate={(userId) => { onOpenChange(false); navigate(`/profile/${userId}`); }}
                  />
                ))
              )}
            </div>

            {/* Reply indicator */}
            {replyingTo && (
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-t border-border/20">
                <span className="text-xs text-muted-foreground">
                  Replying to <span className="font-semibold text-foreground">{replyingTo.profile?.username || "user"}</span>
                </span>
                <button onClick={() => setReplyingTo(null)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Quick Emojis */}
            <AnimatePresence>
              {showEmojis && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-border/20"
                >
                  <div className="flex items-center gap-3 px-4 py-2 overflow-x-auto scrollbar-hide">
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setNewComment(prev => prev + emoji)}
                        className="text-xl hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-border/20 safe-area-inset-bottom">
              <button onClick={() => setShowEmojis(!showEmojis)} className="p-2">
                <Smile className={`w-5 h-5 ${showEmojis ? "text-primary" : "text-muted-foreground"}`} />
              </button>
              <input
                ref={inputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? "Reply..." : "Add a comment..."}
                className="flex-1 h-10 bg-muted/30 border border-border/30 rounded-full px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={!newComment.trim()}
                className="p-2 rounded-full bg-primary disabled:opacity-30 transition-opacity"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Individual Comment Item
const CommentItem = ({
  comment,
  currentUserId,
  onReply,
  onDelete,
  onNavigate,
}: {
  comment: Comment;
  currentUserId?: string;
  onReply: (c: Comment) => void;
  onDelete: (id: string) => void;
  onNavigate: (userId: string) => void;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReplies, setShowReplies] = useState(comment.showReplies || false);
  const canDelete = currentUserId === comment.user_id;

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <button onClick={() => onNavigate(comment.user_id)} className="flex-shrink-0">
          <Avatar className="w-8 h-8">
            <AvatarImage src={comment.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-foreground text-xs">
              {(comment.profile?.display_name || "U").charAt(0)}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigate(comment.user_id)} className="text-xs font-bold text-foreground hover:underline">
              {comment.profile?.display_name || comment.profile?.username || "user"}
            </button>
            <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm text-foreground/90 mt-0.5 leading-relaxed">{comment.content}</p>
          <div className="flex items-center gap-4 mt-1.5">
            <button className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Heart className="w-3.5 h-3.5" />
              {comment.like_count > 0 && <span>{comment.like_count}</span>}
            </button>
            <button onClick={() => onReply(comment)} className="text-[11px] text-muted-foreground font-medium">
              Reply
            </button>
            {canDelete && (
              <button onClick={() => { setShowMenu(false); onDelete(comment.id); }}>
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Replies toggle */}
          {comment.replies && comment.replies.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-[11px] text-primary font-semibold mt-2"
            >
              {showReplies ? "Hide replies" : `View ${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`}
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      <AnimatePresence>
        {showReplies && comment.replies && comment.replies.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden ml-11 space-y-3"
          >
            {comment.replies.map(reply => (
              <div key={reply.id} className="flex gap-2.5">
                <button onClick={() => onNavigate(reply.user_id)} className="flex-shrink-0">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={reply.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-foreground text-[10px]">
                      {(reply.profile?.display_name || "U").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-foreground">
                      {reply.profile?.display_name || reply.profile?.username || "user"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(reply.created_at)}</span>
                  </div>
                  <p className="text-xs text-foreground/90 mt-0.5">{reply.content}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <button className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Heart className="w-3 h-3" />
                    </button>
                    {currentUserId === reply.user_id && (
                      <button onClick={() => onDelete(reply.id)}>
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
