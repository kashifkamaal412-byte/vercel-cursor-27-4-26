import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Bookmark, Gift, Download,
  MoreVertical, MapPin, X, ChevronRight
} from "lucide-react";
import { Post } from "@/hooks/usePosts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PostCommentsSheet } from "./PostCommentsSheet";
import { PostThreeDotMenu } from "./PostThreeDotMenu";
import { PostShareSheet } from "./PostShareSheet";
import { GiftSheet } from "@/components/gifts/GiftSheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onSave?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (post: Post) => void;
  onTogglePrivacy?: (postId: string, isPublic: boolean) => void;
  onToggleComments?: (postId: string, allow: boolean) => void;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

export const PostCard = ({ post, onLike, onSave, onDelete, onEdit, onTogglePrivacy, onToggleComments }: PostCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [doubleTapLike, setDoubleTapLike] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [fansCount, setFansCount] = useState(0);
  const likeInFlightRef = useRef(false);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Animation states for action buttons
  const [commentAnimating, setCommentAnimating] = useState(false);
  const [shareAnimating, setShareAnimating] = useState(false);
  const [giftAnimating, setGiftAnimating] = useState(false);
  const [saveAnimating, setSaveAnimating] = useState(false);
  const [downloadAnimating, setDownloadAnimating] = useState(false);

  const isOwner = user?.id === post.user_id;
  const displayName = post.profile?.display_name || post.profile?.username || "User";
  const avatarUrl = post.profile?.avatar_url;
  const caption = post.content || "";
  const isLong = caption.length > 200;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false });

  useEffect(() => {
    if (!user || isOwner) return;
    const checkFollow = async () => {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", post.user_id)
        .maybeSingle();
      setIsFollowing(!!data);
    };
    checkFollow();
  }, [user, post.user_id, isOwner]);

  useEffect(() => {
    const fetchFans = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("total_followers")
        .eq("user_id", post.user_id)
        .maybeSingle();
      setFansCount(data?.total_followers || 0);
    };
    fetchFans();
  }, [post.user_id]);

  useEffect(() => {
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); };
  }, []);

  const handleCreatorClick = () => {
    if (user?.id === post.user_id) navigate("/profile");
    else navigate(`/user/${post.user_id}`);
  };

  const handleFollow = useCallback(async () => {
    if (!user || followLoading || isOwner) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", post.user_id);
        setIsFollowing(false);
        setFansCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase.from("follows").insert({ follower_id: user.id, following_id: post.user_id });
        setIsFollowing(true);
        setFansCount(prev => prev + 1);
      }
    } catch { toast.error("Failed to update follow"); }
    finally { setFollowLoading(false); }
  }, [user, isFollowing, followLoading, post.user_id, isOwner]);

  const handleLike = useCallback(() => {
    if (likeInFlightRef.current) return;
    likeInFlightRef.current = true;
    setLikeAnimating(true);
    setTimeout(() => { setLikeAnimating(false); likeInFlightRef.current = false; }, 500);
    onLike(post.id);
  }, [onLike, post.id]);

  const handleDoubleTap = () => {
    if (!post.isLiked) {
      setDoubleTapLike(true);
      setTimeout(() => setDoubleTapLike(false), 1000);
      handleLike();
    }
  };

  const handleSave = () => {
    setSaveAnimating(true);
    setTimeout(() => setSaveAnimating(false), 400);
    setSaved(!saved);
    onSave?.(post.id);
    toast.success(saved ? "Removed from saved" : "Saved to collection!");
  };

  const handleDownload = async () => {
    if (!post.image_url) { toast.error("No image to download"); return; }
    setDownloadAnimating(true);
    try {
      const res = await fetch(post.image_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `post-${post.id}.jpg`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success("Downloaded!");
    } catch { toast.error("Download failed"); }
    finally { setTimeout(() => setDownloadAnimating(false), 400); }
  };

  const handleDeleteWithUndo = (postId: string) => {
    setPendingDelete(true);
    toast("Post deleted", {
      action: { label: "Undo", onClick: () => { setPendingDelete(false); if (undoTimerRef.current) clearTimeout(undoTimerRef.current); toast.success("Post restored!"); } },
      duration: 5000,
    });
    undoTimerRef.current = setTimeout(() => { onDelete?.(postId); }, 5000);
  };

  const handleSendGift = (gift: any, quantity: number) => {
    toast.success(`Sent ${quantity}x ${gift.name}!`);
  };

  if (pendingDelete) return null;

  return (
    <>
      <div className="bg-card overflow-hidden border-b border-border/20 md:rounded-2xl md:border md:border-border/20 md:shadow-sm md:mb-4">
        {/* ═══ Creator Header ═══ */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
          <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={handleCreatorClick}>
            <Avatar className="w-11 h-11 ring-2 ring-border/20 flex-shrink-0">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-muted text-foreground text-sm font-bold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold text-foreground leading-tight truncate">{displayName}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted-foreground">{formatNumber(fansCount)} Fans</span>
                <span className="text-[11px] text-muted-foreground/70">• {timeAgo} ago</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isOwner && (
              <AuthGuard action="follow">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`h-8 px-5 text-[13px] font-semibold rounded-full transition-all ${
                    isFollowing
                      ? "bg-muted text-muted-foreground"
                      : "bg-[hsl(var(--primary))] text-primary-foreground"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </motion.button>
              </AuthGuard>
            )}
            <button onClick={() => setShowMenu(true)} className="p-1.5 rounded-full hover:bg-muted/50 transition-colors" aria-label="More options">
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* ═══ Caption Title (max 2 lines) ═══ */}
        {caption && (
          <div className="px-4 pt-1 pb-2">
            <p className="text-[15px] font-semibold text-foreground leading-snug line-clamp-2">
              {caption}
            </p>
            {isLong && (
              <button onClick={() => setShowFullCaption(!showFullCaption)} className="inline-flex items-center gap-0.5 text-[13px] text-primary font-medium mt-0.5">
                {showFullCaption ? "Show less" : "See more"} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            {showFullCaption && isLong && (
              <p className="text-[14px] text-foreground leading-[1.5] mt-1">{caption}</p>
            )}
          </div>
        )}

        {/* ═══ Separator ═══ */}
        <div className="mx-4 border-t border-border/20" />

        {/* ═══ Image ═══ */}
        {post.image_url && (
          <div className="relative w-full cursor-pointer" onDoubleClick={handleDoubleTap} onClick={() => setShowPhotoViewer(true)}>
            <img
              src={post.image_url}
              alt="Post"
              className="w-full object-contain"
              loading="lazy"
              style={{ maxHeight: '65vh' }}
            />
            <AnimatePresence>
              {doubleTapLike && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <Heart className="w-20 h-20 text-red-500 fill-red-500 drop-shadow-2xl" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ═══ Engagement Stats Row with Animations ═══ */}
        <div className="flex items-center gap-3 px-4 py-2.5 overflow-x-auto scrollbar-hide">
          <motion.button
            whileTap={{ scale: 0.8 }}
            animate={likeAnimating ? { scale: [1, 1.3, 1] } : {}}
            onClick={handleLike}
            className="flex items-center gap-1 shrink-0 active:scale-90 transition-transform"
          >
            <Heart className={`w-4 h-4 transition-all duration-200 ${post.isLiked ? "text-destructive fill-destructive scale-110" : "text-destructive/70"}`} />
            <span className="text-[13px] text-foreground font-medium">{formatNumber(post.like_count)}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.8 }}
            animate={commentAnimating ? { y: [0, -3, 0] } : {}}
            onClick={() => {
              if (!post.allow_comments) { toast.error("Comments are turned off"); return; }
              setCommentAnimating(true);
              setTimeout(() => setCommentAnimating(false), 300);
              setShowComments(true);
            }}
            className="flex items-center gap-1 shrink-0"
          >
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-[13px] text-foreground font-medium">{formatNumber(post.comment_count)}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.8, rotate: 15 }}
            animate={shareAnimating ? { rotate: [0, -10, 10, 0] } : {}}
            onClick={() => {
              setShareAnimating(true);
              setTimeout(() => setShareAnimating(false), 300);
              setShowShare(true);
            }}
            className="flex items-center gap-1 shrink-0"
          >
            <Share2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-[13px] text-foreground font-medium">{formatNumber(post.share_count || 0)}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.8 }}
            animate={giftAnimating ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
            onClick={() => {
              setGiftAnimating(true);
              setTimeout(() => setGiftAnimating(false), 400);
              setShowGifts(true);
            }}
            className="flex items-center gap-1 shrink-0"
          >
            <Gift className="w-4 h-4 text-amber-500" />
            <span className="text-[13px] text-foreground font-medium">{formatNumber(post.gift_count || 0)}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.8 }}
            animate={saveAnimating ? { y: [0, -4, 0] } : {}}
            onClick={handleSave}
            className="flex items-center gap-1 shrink-0"
          >
            <Bookmark className={`w-4 h-4 transition-all duration-200 ${saved ? "text-primary fill-primary" : "text-muted-foreground"}`} />
            <span className="text-[13px] text-foreground font-medium">{formatNumber(post.save_count || 0)}</span>
          </motion.button>
        </div>

        {/* ═══ Comment Previews ═══ */}
        <div className="px-4 pb-2">
          {post.comment_count > 0 && (
            <button
              onClick={() => {
                if (!post.allow_comments) { toast.error("Comments are turned off"); return; }
                setShowComments(true);
              }}
              className="text-[13px] text-primary font-medium flex items-center gap-1 pt-1"
            >
              View all comments <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Full-screen Photo Viewer */}
      <AnimatePresence>
        {showPhotoViewer && post.image_url && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div className="flex items-center justify-between p-3 absolute top-0 left-0 right-0 z-10 safe-area-inset-top">
              <button onClick={() => setShowPhotoViewer(false)} className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm">
                <X className="w-5 h-5 text-white" />
              </button>
              <button onClick={handleDownload} className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm">
                <Download className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <img src={post.image_url} alt="Post" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="p-4 bg-gradient-to-t from-black/80 to-transparent safe-area-inset-bottom">
              <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => { setShowPhotoViewer(false); handleCreatorClick(); }}>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-white/20 text-white text-xs">{displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white text-sm font-semibold">{displayName}</p>
                  <p className="text-white/60 text-xs">{timeAgo} ago</p>
                </div>
              </div>
              {caption && <p className="text-white/80 text-sm line-clamp-3">{caption}</p>}
              <div className="flex items-center gap-6 mt-3">
                <button onClick={handleLike} className="flex items-center gap-1.5">
                  <Heart className={`w-5 h-5 ${post.isLiked ? "text-red-500 fill-red-500" : "text-white"}`} />
                  <span className="text-white text-xs">{formatNumber(post.like_count)}</span>
                </button>
                <button onClick={() => { setShowPhotoViewer(false); setShowComments(true); }} className="flex items-center gap-1.5">
                  <MessageCircle className="w-5 h-5 text-white" />
                  <span className="text-white text-xs">{formatNumber(post.comment_count)}</span>
                </button>
                <button onClick={() => { setShowPhotoViewer(false); setShowShare(true); }} className="flex items-center gap-1.5">
                  <Share2 className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheets */}
      <PostCommentsSheet open={showComments} onOpenChange={setShowComments} postId={post.id} commentCount={post.comment_count} />
      <PostThreeDotMenu open={showMenu} onOpenChange={setShowMenu} post={post} isOwner={isOwner} onDelete={handleDeleteWithUndo} onEdit={onEdit} onTogglePrivacy={onTogglePrivacy} onToggleComments={onToggleComments} onDownload={handleDownload} />
      <PostShareSheet open={showShare} onOpenChange={setShowShare} post={post} />
      <GiftSheet open={showGifts} onOpenChange={setShowGifts} onSendGift={handleSendGift} creatorName={displayName} creatorAvatar={avatarUrl || undefined} />
    </>
  );
};
