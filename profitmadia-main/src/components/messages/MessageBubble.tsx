import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck, Heart, ThumbsUp, Smile, Flame, Star, Copy, Trash2, Reply, Forward } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Message } from "@/hooks/useMessages";
import { freeGifts, premiumGifts } from "@/data/giftData";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReaction?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: Message) => void;
  senderName?: string;
  senderAvatar?: string;
}

const reactionEmojis = [
  { icon: Heart, emoji: "❤️" },
  { icon: ThumbsUp, emoji: "👍" },
  { icon: Smile, emoji: "😊" },
  { icon: Flame, emoji: "🔥" },
  { icon: Star, emoji: "⭐" }
];

export const MessageBubble = ({
  message,
  isOwn,
  onReaction,
  onDelete,
  onReply,
  senderName,
  senderAvatar
}: MessageBubbleProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleLongPress = () => {
    setShowOptions(true);
  };

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
    setShowOptions(false);
  };

  const renderContent = () => {
    if (message.message_type === "gift") {
      const allGifts = [...freeGifts, ...premiumGifts];
      const gift = allGifts.find(g => g.id === message.content);
      return (
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center p-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl border border-primary/30"
        >
          <span className="text-4xl mb-2">{gift?.emoji || "🎁"}</span>
          <span className="text-sm font-medium text-foreground">{gift?.name || "Gift"}</span>
          <span className="text-xs text-muted-foreground">₹{gift?.value || 0}</span>
        </motion.div>
      );
    }

    if (message.message_type === "image" && message.media_url) {
      return (
        <img 
          src={message.media_url} 
          alt="Shared image"
          className="max-w-[240px] rounded-xl"
        />
      );
    }

    if (message.message_type === "voice") {
      return (
        <div className="flex items-center gap-3 min-w-[180px]">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <div className="w-0 h-0 border-l-[8px] border-l-primary border-y-[5px] border-y-transparent ml-1" />
          </div>
          <div className="flex-1 h-8 flex items-center gap-0.5">
            {Array.from({ length: 20 }).map((_, i) => (
              <div 
                key={i}
                className="w-1 bg-muted-foreground/50 rounded-full"
                style={{ height: `${Math.random() * 20 + 8}px` }}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">0:12</span>
        </div>
      );
    }

    return <p className="text-sm leading-relaxed">{message.content}</p>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "flex gap-2 group relative",
        isOwn ? "justify-end" : "justify-start"
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        handleLongPress();
      }}
    >
      {/* Avatar for received messages */}
      {!isOwn && senderAvatar && (
        <img 
          src={senderAvatar} 
          alt={senderName}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
      )}

      <div className={cn("max-w-[75%] relative", isOwn ? "items-end" : "items-start")}>
        {/* Message Bubble */}
        <div
          className={cn(
            "px-4 py-2.5 rounded-2xl relative",
            isOwn 
              ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-br-md" 
              : "bg-muted/80 backdrop-blur-sm text-foreground rounded-bl-md border border-glass-border/50",
            "shadow-lg"
          )}
          style={{
            boxShadow: isOwn 
              ? "0 4px 20px hsl(var(--primary) / 0.3)" 
              : "0 4px 15px hsl(0 0% 0% / 0.2)"
          }}
        >
          {renderContent()}

          {/* Reactions display */}
          {message.reactions && message.reactions.length > 0 && (
            <div className={cn(
              "absolute -bottom-3 flex gap-0.5 bg-card/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 border border-glass-border/50 shadow-md",
              isOwn ? "left-0" : "right-0"
            )}>
              {message.reactions.slice(0, 3).map((r: any, i: number) => (
                <span key={i} className="text-xs">{r.emoji}</span>
              ))}
              {message.reactions.length > 3 && (
                <span className="text-xs text-muted-foreground">+{message.reactions.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Timestamp & Status */}
        <div className={cn(
          "flex items-center gap-1 mt-1.5 px-1",
          isOwn ? "justify-end" : "justify-start"
        )}>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(message.created_at), "HH:mm")}
          </span>
          {isOwn && (
            <span className="text-muted-foreground">
              {message.is_read ? (
                <CheckCheck className="w-3.5 h-3.5 text-primary" />
              ) : message.is_delivered ? (
                <CheckCheck className="w-3.5 h-3.5" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </span>
          )}
        </div>

        {/* Reaction picker (hover) */}
        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className={cn(
                "absolute bottom-full mb-2 flex gap-1 bg-card/95 backdrop-blur-xl rounded-full px-2 py-1.5 border border-glass-border shadow-xl z-50",
                isOwn ? "right-0" : "left-0"
              )}
            >
              {reactionEmojis.map(({ emoji }) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReaction?.(message.id, emoji);
                    setShowReactions(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform"
                >
                  <span className="text-lg">{emoji}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Long press options */}
        <AnimatePresence>
          {showOptions && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setShowOptions(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "absolute z-50 bg-card/95 backdrop-blur-xl rounded-xl border border-glass-border shadow-2xl overflow-hidden min-w-[160px]",
                  isOwn ? "right-0" : "left-0",
                  "bottom-full mb-2"
                )}
              >
                <button
                  onClick={() => {
                    setShowReactions(true);
                    setShowOptions(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-muted/50 flex items-center gap-3 transition-colors"
                >
                  <Smile className="w-4 h-4 text-muted-foreground" />
                  React
                </button>
                <button
                  onClick={() => {
                    onReply?.(message);
                    setShowOptions(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-muted/50 flex items-center gap-3 transition-colors"
                >
                  <Reply className="w-4 h-4 text-muted-foreground" />
                  Reply
                </button>
                <button
                  onClick={handleCopy}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-muted/50 flex items-center gap-3 transition-colors"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                  Copy
                </button>
                <button
                  onClick={() => setShowOptions(false)}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-muted/50 flex items-center gap-3 transition-colors"
                >
                  <Forward className="w-4 h-4 text-muted-foreground" />
                  Forward
                </button>
                {isOwn && (
                  <button
                    onClick={() => {
                      onDelete?.(message.id);
                      setShowOptions(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-destructive/20 flex items-center gap-3 transition-colors text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
