import {
  X,
  Heart,
  Send,
  Image,
  Smile,
  Lock,
  Flag,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  MoreVertical,
  Loader2 } from
"lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useComments, Comment } from "@/hooks/useComments";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ========== TIMESTAMP HELPER ==========
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 5) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ========== EMOJI LIST (COMPACT) ==========
const quickEmojis = ["😂", "❤️", "🔥", "👏", "😍", "😭", "🙏", "💯"];
const fullEmojiList = [
"😀",
"😃",
"😄",
"😁",
"😆",
"😅",
"😂",
"🤣",
"😊",
"😇",
"🙂",
"🙃",
"😉",
"😌",
"😍",
"🥰",
"😘",
"😗",
"😙",
"😚",
"😋",
"😛",
"😜",
"🤪",
"😝",
"🧐",
"🤓",
"😎",
"🤩",
"🥳",
"🥺",
"😏",
"😒",
"🙄",
"😬",
"😔",
"😪",
"😴",
"🤔",
"🤯",
"😶",
"😑",
"😕",
"🙁",
"😣",
"😖",
"😫",
"😩",
"😤",
"😡",
"😠",
"🤬",
"😳",
"😱",
"😨",
"😰",
"😥",
"😓",
"😭",
"😢",
"😵",
"😲",
"😈",
"👿",
"❤️",
"🧡",
"💛",
"💚",
"💙",
"💜",
"🖤",
"🤍",
"💔",
"💕",
"💗",
"💖",
"💘",
"💝",
"👍",
"👎",
"👏",
"🙌",
"🙏",
"🤝",
"💪",
"👌",
"✌️",
"🤞",
"🤟",
"🤙",
"👊",
"✊",
"🔥",
"💯",
"✨",
"🌟",
"⭐",
"🎉",
"🎊",
"🎈",
"🏆",
"🥇",
"👑",
"💎",
"🎯",
"🚀",
"📈",
"💰",
"💸",
"🤑",
"⚽",
"🏀",
"🎮",
"📱",
"💻",
"🎥",
"🎵",
"🎶",
"⚡",
"💥",
"🌈",
"☀️",
"🌙",
"🌍",
"🌸",
"🍎",
"🍕",
"🍔",
"🍩",
"☕"];


// ========== REPORT MODAL ==========
const ReportModal = ({ onSubmit, onClose }: {onSubmit: (reason: string) => void;onClose: () => void;}) => {
  const [reason, setReason] = useState("");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
      onClick={onClose}>
      
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-zinc-900 rounded-2xl p-5 w-[85%] max-w-sm border border-white/10"
        onClick={(e) => e.stopPropagation()}>
        
        <h3 className="text-white font-bold text-sm mb-3">Report Comment</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why are you reporting this comment?"
          className="w-full bg-zinc-800 text-white text-sm rounded-xl p-3 min-h-[80px] outline-none border border-white/10 resize-none" />
        
        <div className="flex gap-2 mt-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-1 text-zinc-400">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (reason.trim()) onSubmit(reason.trim());
            }}
            disabled={!reason.trim()}
            className="flex-1 bg-red-600 text-white hover:bg-red-700">
            
            Report
          </Button>
        </div>
      </motion.div>
    </motion.div>);

};

// ========== MEDIA VIEWER ==========
const MediaViewer = ({ url, onClose }: {url: string;onClose: () => void;}) =>
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
  onClick={onClose}>
  
    <img src={url} alt="Comment media" className="max-w-[90vw] max-h-[80vh] rounded-xl object-contain" />
    <X className="absolute top-6 right-6 text-white w-6 h-6 cursor-pointer" onClick={onClose} />
  </motion.div>;


// ========== SINGLE COMMENT COMPONENT ==========
const CommentItem = ({
  comment,
  videoOwnerId,
  currentUserId,
  onReply,
  onDelete,
  onEdit,
  onLike,
  onReport,
  onViewReplies










}: {comment: Comment;videoOwnerId?: string;currentUserId?: string;onReply: (c: Comment) => void;onDelete: (id: string) => void;onEdit: (c: Comment) => void;onLike: (id: string, liked: boolean) => void;onReport: (id: string) => void;onViewReplies: (id: string) => void;}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showMedia, setShowMedia] = useState<string | null>(null);

  const canDelete = currentUserId === comment.user_id || currentUserId === videoOwnerId;
  const canEdit = currentUserId === comment.user_id;

  const handleTouchStart = () => {
    if (!canDelete) return;
    const timer = setTimeout(() => {
      onDelete(comment.id);
    }, 2000);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
    setLongPressTimer(null);
  };

  return (
    <>
      <div
        className="flex gap-3"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}>
        
        <Avatar className="w-9 h-9 border border-white/10 shrink-0">
          <AvatarImage src={comment.profile?.avatar_url || ""} />
          <AvatarFallback className="bg-zinc-800 text-white text-xs">
            {(comment.profile?.username || "U")[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[11px] font-bold">@{comment.profile?.username || "user"}</span>
            {comment.user_id === videoOwnerId && <BadgeCheck size={12} className="text-blue-400" />}
            {comment.is_private && <Lock size={10} className="text-amber-400" />}
            {comment.is_edited && <span className="text-zinc-600 text-[9px]">(edited)</span>}
            <span className="text-zinc-600 text-[10px] ml-auto">{timeAgo(comment.created_at)}</span>
            <button onClick={() => setShowMenu(!showMenu)} className="text-zinc-600 ml-1">
              <MoreVertical size={14} />
            </button>
          </div>
          <p className="text-zinc-100 text-[13px] mt-0.5 break-words">{comment.content}</p>
          {comment.media_url &&
          <img
            src={comment.media_url}
            alt="media"
            onClick={() => setShowMedia(comment.media_url)}
            className="mt-2 w-20 h-20 object-cover rounded-lg cursor-pointer border border-white/10" />

          }
          <div className="flex gap-5 mt-2 items-center">
            <button
              onClick={() => onLike(comment.id, !!comment.isLiked)}
              className={`flex items-center gap-1 text-[11px] font-bold transition-colors ${comment.isLiked ? "text-rose-500" : "text-zinc-500 hover:text-rose-500"}`}>
              
              <Heart size={14} fill={comment.isLiked ? "currentColor" : "none"} /> {comment.like_count}
            </button>
            <button
              onClick={() => onReply(comment)}
              className="text-[11px] font-bold text-zinc-500 hover:text-white uppercase">
              
              Reply
            </button>
            <button onClick={() => onReport(comment.id)} className="text-zinc-600 hover:text-amber-400">
              <Flag size={12} />
            </button>
          </div>

          {/* Reply count toggle */}
          {comment.replies_count > 0 &&
          <button
            onClick={() => onViewReplies(comment.id)}
            className="flex items-center gap-1 mt-2 text-[11px] text-blue-400 font-bold">
            
              {comment.replies.length > 0 ?
            <>
                  <ChevronUp size={12} /> Hide {comment.replies_count}{" "}
                  {comment.replies_count === 1 ? "Reply" : "Replies"}
                </> :

            <>
                  <ChevronDown size={12} /> View {comment.replies_count}{" "}
                  {comment.replies_count === 1 ? "Reply" : "Replies"}
                </>
            }
            </button>
          }

          {/* Nested replies */}
          {comment.replies.length > 0 &&
          <div className="mt-2 space-y-3 border-l border-zinc-800 pl-3">
              {comment.replies.map((reply) =>
            <CommentItem
              key={reply.id}
              comment={reply}
              videoOwnerId={videoOwnerId}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
              onEdit={onEdit}
              onLike={onLike}
              onReport={onReport}
              onViewReplies={() => {}} />

            )}
            </div>
          }

          {/* Context menu */}
          <AnimatePresence>
            {showMenu &&
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-1 bg-zinc-800 rounded-xl p-1 border border-white/10 w-fit">
              
                {canEdit &&
              <button
                onClick={() => {
                  setShowMenu(false);
                  onEdit(comment);
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-zinc-700 rounded-lg w-full">
                
                    <Edit3 size={12} /> Edit
                  </button>
              }
                {canDelete &&
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDelete(comment.id);
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-zinc-700 rounded-lg w-full">
                
                    <Trash2 size={12} /> Delete
                  </button>
              }
                <button
                onClick={() => {
                  setShowMenu(false);
                  onReport(comment.id);
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs text-amber-400 hover:bg-zinc-700 rounded-lg w-full">
                
                  <Flag size={12} /> Report
                </button>
              </motion.div>
            }
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showMedia && <MediaViewer url={showMedia} onClose={() => setShowMedia(null)} />}
      </AnimatePresence>
    </>);

};

// ========== MAIN OVERLAY ==========
interface RealCommentsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  video: any;
  commentCount?: number;
}

export const CommentsOverlay = ({ isOpen, onClose, video }: RealCommentsOverlayProps) => {
  const { user } = useAuth();
  const {
    comments,
    loading,
    hasMore,
    addComment,
    editComment,
    deleteComment,
    toggleCommentLike,
    reportComment,
    toggleReplies,
    loadMore,
    uploadCommentMedia
  } = useComments(video?.id || "");

  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when replying
  useEffect(() => {
    if (replyTo || editingComment) textareaRef.current?.focus();
  }, [replyTo, editingComment]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newComment]);

  // Start editing
  const handleStartEdit = (comment: Comment) => {
    setEditingComment(comment);
    setNewComment(comment.content);
    setReplyTo(null);
  };

  // Submit comment
  const handleSubmit = async () => {
    if (submitting) return;
    if (!newComment.trim() && !mediaFile) return;

    setSubmitting(true);
    try {
      let mediaUrl: string | null = null;
      if (mediaFile) {
        mediaUrl = await uploadCommentMedia(mediaFile);
      }

      if (editingComment) {
        const ok = await editComment(editingComment.id, newComment);
        if (ok) toast.success("Comment updated");else
        toast.error("Failed to update");
      } else {
        const ok = await addComment(newComment, replyTo?.id || null, isPrivate, mediaUrl);
        if (!ok) toast.error("Failed to post comment");
      }

      setNewComment("");
      setReplyTo(null);
      setEditingComment(null);
      setMediaPreview(null);
      setMediaFile(null);
      setIsPrivate(false);
      setShowEmojiPicker(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete
  const handleDelete = async (commentId: string) => {
    const ok = await deleteComment(commentId);
    if (ok) toast.success("Comment deleted");else
    toast.error("Cannot delete this comment");
  };

  // Report
  const handleReport = async (reason: string) => {
    if (!reportingId) return;
    const ok = await reportComment(reportingId, reason);
    if (ok) toast.success("Comment reported");else
    toast.error("Failed to report");
    setReportingId(null);
  };

  // View replies toggle
  const handleViewReplies = async (parentId: string) => {
    toggleReplies(parentId);
  };

  // Like
  const handleLike = (commentId: string, currentlyLiked: boolean) => {
    toggleCommentLike(commentId, currentlyLiked);
  };

  // Scroll to load more
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100 && hasMore && !loading) {
      loadMore();
    }
  };

  // File selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      const offset = window.innerHeight - vv.height;
      setKeyboardOffset(offset > 50 ? offset : 0);
    };

    vv.addEventListener("resize", handleResize);
    vv.addEventListener("scroll", handleResize);
    return () => {
      vv.removeEventListener("resize", handleResize);
      vv.removeEventListener("scroll", handleResize);
    };
  }, [isOpen]);

  // Dismiss keyboard on tap outside input
  const handleBackdropTap = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("[data-comment-input]")) {
      textareaRef.current?.blur();
      setShowEmojiPicker(false);
    }
  }, []);

  const topEmojis = ["🥰", "😏", "😈", "😁", "😂", "😲"];

  if (!isOpen) return null;

  return (
    <div
      className="flex flex-col h-full bg-background border-t border-border"
      onClick={handleBackdropTap}
      style={{ paddingBottom: keyboardOffset > 0 ? `${keyboardOffset}px` : "env(safe-area-inset-bottom, 8px)" }}>
      
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-3 border-b border-border/30 shrink-0">
        <h2 className="text-foreground text-base font-bold flex-1 text-center">{comments.length} comments</h2>
        <div className="flex items-center gap-3">
          <button className="text-muted-foreground">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              
              <line x1="4" y1="6" x2="16" y2="6" />
              <line x1="8" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="12" y2="18" />
              <polyline points="18 9 21 6 18 3" />
              <polyline points="14 15 11 18 14 21" />
            </svg>
          </button>
          <X onClick={onClose} className="text-foreground w-5 h-5 cursor-pointer" />
        </div>
      </div>

      {/* Comments list */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide min-h-0">
        
        {loading && comments.length === 0 &&
        <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
          </div>
        }
        {!loading && comments.length === 0 &&
        <p className="text-center text-zinc-500 text-xs py-8">No comments yet. Be the first!</p>
        }
        {comments.map((comment) =>
        <CommentItem
          key={comment.id}
          comment={comment}
          videoOwnerId={video?.user_id}
          currentUserId={user?.id}
          onReply={(c) => {
            setReplyTo(c);
            setEditingComment(null);
          }}
          onDelete={handleDelete}
          onEdit={handleStartEdit}
          onLike={handleLike}
          onReport={(id) => setReportingId(id)}
          onViewReplies={handleViewReplies} />

        )}
        {loading && comments.length > 0 &&
        <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
          </div>
        }
      </div>

      {/* Bottom input area */}
      <div data-comment-input className="bg-background border-t border-border/30 shrink-0">
        {/* Reply/Edit indicator */}
        {(replyTo || editingComment) &&
        <div className="text-[11px] text-muted-foreground px-4 py-2 flex justify-between border-b border-border/30">
            <span>
              {editingComment ?
            "Editing comment" :

            <>
                  Replying to <b className="text-blue-400">@{replyTo?.profile?.username || "user"}</b>
                </>
            }
            </span>
            <X
            size={12}
            className="cursor-pointer"
            onClick={() => {
              setReplyTo(null);
              setEditingComment(null);
              setNewComment("");
            }} />
          
          </div>
        }

        {/* Media preview */}
        {mediaPreview &&
        <div className="relative w-16 h-16 mx-4 mt-2 ml-14">
            <img
            src={mediaPreview}
            alt="preview"
            className="w-full h-full object-cover rounded-lg border border-white/10" />
          
            <button
            onClick={() => {
              setMediaPreview(null);
              setMediaFile(null);
            }}
            className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5">
            
              <X size={10} className="text-white" />
            </button>
          </div>
        }

        {/* Compact emoji bar */}
        









        

        {/* Input row with avatar and integrated buttons */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar className="w-9 h-9 shrink-0 border-2 border-border">
            <AvatarFallback className="bg-muted text-foreground text-xs font-bold">
              {user?.email?.[0]?.toUpperCase() || "K"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={replyTo ? `Reply to @${replyTo.profile?.username || "user"}...` : "Add comment..."}
              className="w-full bg-muted/50 text-foreground text-sm rounded-2xl px-4 py-2 pr-20 outline-none resize-none min-h-[44px] max-h-24 placeholder:text-muted-foreground border border-border focus:border-primary/50 transition-colors"
              rows={1}
              style={{ fontSize: "14px" }} />
            
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-full transition-colors">
                
                <Image size={18} />
              </button>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-full transition-colors">
                
                <Smile size={18} />
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !newComment.trim() && !mediaFile}
                className="p-1.5 text-primary-foreground bg-primary hover:bg-primary/90 rounded-full transition-colors disabled:opacity-30 disabled:pointer-events-none">
                
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Full emoji picker */}
        <AnimatePresence>
          {showEmojiPicker &&
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/30">
            
              <div className="p-2 grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                {fullEmojiList.map((e, i) =>
              <button
                key={i}
                onClick={() => setNewComment((p) => p + e)}
                className="hover:bg-muted p-1.5 rounded-lg transition-colors text-lg text-center">
                
                    {e}
                  </button>
              )}
              </div>
            </motion.div>
          }
        </AnimatePresence>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />

      {/* Report modal */}
      <AnimatePresence>
        {reportingId && <ReportModal onSubmit={handleReport} onClose={() => setReportingId(null)} />}
      </AnimatePresence>
    </div>);

};

export const App = CommentsOverlay;
export default CommentsOverlay;