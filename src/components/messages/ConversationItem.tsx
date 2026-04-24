import { motion } from "framer-motion";
import { Mic, Gift, Image, Download, Clock, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { Conversation } from "@/hooks/useMessages";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useIsUserOnline } from "@/hooks/usePresence";
import { RequestActions } from "./RequestActions";
import { Badge } from "@/components/ui/badge";

interface ConversationItemProps {
  conversation: Conversation;
  onClick: () => void;
  isActive?: boolean;
  isTyping?: boolean;
  showRequestActions?: boolean;
  onRequestAction?: () => void;
}

const formatTime = (dateString: string | null) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isToday(date)) return format(date, "h:mm a").toUpperCase().replace(" ", " ");
  if (isYesterday(date)) return "YESTERDAY";
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return `${diffDays}D AGO`;
  return format(date, "MM/dd").toUpperCase();
};

export const ConversationItem = ({ 
  conversation, 
  onClick, 
  isActive,
  isTyping = false,
  showRequestActions = false,
  onRequestAction
}: ConversationItemProps) => {
  const { other_user, last_message, unread_count, is_pending_sent, status } = conversation;
  const { isOnline, status: onlineStatusValue } = useIsUserOnline(other_user?.user_id);

  const getMessagePreview = () => {
    if (isTyping) {
      return (
        <span className="flex items-center gap-1.5 text-primary font-medium">
          <span className="flex gap-0.5">
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
              className="w-1 h-1 bg-primary rounded-full"
            />
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
              className="w-1 h-1 bg-primary rounded-full"
            />
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
              className="w-1 h-1 bg-primary rounded-full"
            />
          </span>
        </span>
      );
    }

    if (!last_message) return "No messages yet";
    
    if (last_message.message_type === "voice") {
      return (
        <span className="flex items-center gap-1.5">
          <Mic className="w-3.5 h-3.5" />
          Voice message
        </span>
      );
    }
    
    if (last_message.message_type === "gift") {
      return (
        <span className="flex items-center gap-1.5 text-primary">
          <Gift className="w-3.5 h-3.5" />
          Sent a gift
        </span>
      );
    }
    
    if (last_message.message_type === "image") {
      return (
        <span className="flex items-center gap-1.5">
          <Image className="w-3.5 h-3.5" />
          Sent a photo
        </span>
      );
    }
    
    return last_message.content || "";
  };

  const getStatusIcon = () => {
    if (last_message?.message_type === "image") {
      return <Image className="w-4 h-4 text-muted-foreground" />;
    }
    if (last_message?.message_type === "gift") {
      return <Download className="w-4 h-4 text-primary" />;
    }
    return null;
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
        "bg-card/50 hover:bg-muted/50 active:bg-muted/70 border border-glass-border/20",
        isActive && "bg-muted/60 border-primary/30"
      )}
    >
      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        <div className="relative">
          {/* Subtle glow for active conversations */}
          {(unread_count && unread_count > 0) && (
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 to-purple-500/40 rounded-full blur-sm" />
          )}
          <Avatar className="w-14 h-14 border border-glass-border/50 relative">
            <AvatarImage src={other_user?.avatar_url || ""} className="object-cover" />
            <AvatarFallback className="bg-muted text-lg">
              {other_user?.display_name?.[0] || other_user?.username?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
        </div>
        {/* Online indicator - realtime */}
        <span className={cn(
          "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card transition-colors",
          isOnline 
            ? onlineStatusValue === "away" 
              ? "bg-yellow-500" 
              : "bg-green-500"
            : "bg-muted-foreground/50"
        )} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className={cn(
              "font-semibold truncate",
              unread_count && unread_count > 0 ? "text-foreground" : "text-foreground/90"
            )}>
              {other_user?.display_name || other_user?.username || "Unknown"}
            </h3>
            {/* Pending Request Badge - show when user sent a request waiting for acceptance */}
            {is_pending_sent && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/50 text-yellow-500 bg-yellow-500/10">
                <Clock className="w-2.5 h-2.5 mr-1" />
                Pending
              </Badge>
            )}
            {/* Accepted Badge - show briefly after acceptance */}
            {status === 'accepted' && !is_pending_sent && !showRequestActions && last_message && (
              <CheckCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            )}
          </div>
          <span className={cn(
            "text-[10px] font-medium flex-shrink-0 ml-2 uppercase tracking-wide",
            isTyping ? "text-primary" : "text-muted-foreground"
          )}>
            {isTyping ? "TYPING..." : formatTime(conversation.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "text-sm truncate flex-1",
            unread_count && unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
          )}>
            {getMessagePreview()}
          </p>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Request Actions for unknown users */}
            {showRequestActions ? (
              <RequestActions
                conversationId={conversation.id}
                otherUserId={other_user?.user_id || ""}
                otherUserName={other_user?.display_name || other_user?.username || "User"}
                onActionComplete={onRequestAction || (() => {})}
              />
            ) : (
              <>
                {/* Status icon */}
                {getStatusIcon()}
                
                {/* Unread badge */}
                {unread_count && unread_count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg shadow-primary/30"
                  >
                    {unread_count > 99 ? "99+" : unread_count}
                  </motion.span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
};
