import { X, Heart, Send, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Comment {
  id: string;
  username: string;
  avatar: string;
  text: string;
  likes: number;
  replies: number;
  time: string;
  isLiked: boolean;
}

interface CommentsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  videoId?: string;
  commentCount: number;
}

const mockComments: Comment[] = [
  {
    id: "1",
    username: "alex_vibe",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
    text: "This content is fire! Keep it up. 🔥",
    likes: 1240,
    replies: 12,
    time: "1h",
    isLiked: false,
  },
  {
    id: "2",
    username: "pixel_master",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=pixel",
    text: "Can you share the camera settings used for this?",
    likes: 45,
    replies: 3,
    time: "3h",
    isLiked: true,
  },
];

export const CommentsOverlay = ({ isOpen, onClose, commentCount }: CommentsOverlayProps) => {
  const [comments, setComments] = useState(mockComments);
  const [newComment, setNewComment] = useState("");

  const handleLikeComment = (id: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 } : c)),
    );
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: Date.now().toString(),
      username: "Guest_User",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=guest",
      text: newComment,
      likes: 0,
      replies: 0,
      time: "Just now",
      isLiked: false,
    };
    setComments([comment, ...comments]);
    setNewComment("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Transparent Backdrop to keep video visible */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />

          {/* Professional Comments Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 h-[65vh] bg-zinc-950/95 backdrop-blur-2xl rounded-t-[30px] z-50 flex flex-col border-t border-white/10"
          >
            {/* Grab Handle */}
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Comments <span className="text-zinc-500 ml-1">{commentCount.toLocaleString()}</span>
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/10 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Comments Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {comments.map((comment, index) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex gap-4"
                >
                  <Avatar className="w-9 h-9 border border-white/10">
                    <AvatarImage src={comment.avatar} />
                    <AvatarFallback>{comment.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-xs text-zinc-200">@{comment.username}</span>
                      <span className="text-[10px] text-zinc-500">{comment.time}</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-snug">{comment.text}</p>

                    {/* Action Buttons: Like & Reply */}
                    <div className="flex items-center gap-5 mt-3">
                      <button
                        onClick={() => handleLikeComment(comment.id)}
                        className={`flex items-center gap-1.5 text-[11px] transition-colors ${comment.isLiked ? "text-rose-500" : "text-zinc-500 hover:text-white"}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? "fill-current" : ""}`} />
                        {comment.likes}
                      </button>

                      <button className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-white transition-colors">
                        <MessageCircle className="w-3.5 h-3.5" />
                        Reply {comment.replies > 0 && `(${comment.replies})`}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input Section - Grows with text */}
            <div className="p-4 bg-zinc-900/50 border-t border-white/5 pb-8">
              <div className="flex items-end gap-3 max-w-3xl mx-auto">
                <div className="flex-1 bg-zinc-800/50 rounded-2xl border border-white/5 focus-within:border-white/20 transition-all">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a public comment..."
                    className="min-h-[44px] max-h-[160px] bg-transparent border-none text-white placeholder:text-zinc-600 resize-none focus-visible:ring-0 py-3 px-4 text-sm"
                  />
                </div>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                  className="bg-white text-black hover:bg-zinc-200 rounded-xl h-[44px] w-[44px] p-0 shadow-lg"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
