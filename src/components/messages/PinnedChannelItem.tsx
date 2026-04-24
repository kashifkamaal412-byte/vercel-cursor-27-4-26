import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useIsUserOnline } from "@/hooks/usePresence";
import { Conversation } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";

interface PinnedChannelItemProps {
  conversation: Conversation;
  index: number;
  currentUserId: string;
}

export const PinnedChannelItem = ({ conversation, index, currentUserId }: PinnedChannelItemProps) => {
  const navigate = useNavigate();
  const otherUserId = conversation.participant_one === currentUserId 
    ? conversation.participant_two 
    : conversation.participant_one;
  
  const { isOnline, status } = useIsUserOnline(conversation.other_user?.user_id);

  return (
    <motion.button
      key={conversation.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={() => navigate(`/chat/${otherUserId}`)}
      className="flex flex-col items-center gap-2 min-w-[70px]"
    >
      <div className="relative">
        {/* Glowing border */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-lg opacity-60" />
        <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-background">
          <Avatar className="w-full h-full rounded-none">
            <AvatarImage 
              src={conversation.other_user?.avatar_url || ""} 
              className="object-cover"
            />
            <AvatarFallback className="bg-muted text-lg rounded-none">
              {conversation.other_user?.display_name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
        </div>
        {/* Online indicator - realtime */}
        <span className={cn(
          "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background transition-colors",
          isOnline 
            ? status === "away" 
              ? "bg-yellow-500" 
              : "bg-green-500"
            : "bg-muted-foreground/50"
        )} />
        {/* Notification badge */}
        {conversation.unread_count && conversation.unread_count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground font-medium truncate w-full text-center">
        {conversation.other_user?.username || conversation.other_user?.display_name?.split(" ")[0] || "User"}
      </span>
    </motion.button>
  );
};
