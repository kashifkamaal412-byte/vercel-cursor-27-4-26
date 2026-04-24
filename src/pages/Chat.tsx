import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MoreVertical, Phone, Video, Circle, Ban, Flag, Loader2, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { ChatInput } from "@/components/messages/ChatInput";
import { ChatGiftSheet } from "@/components/messages/ChatGiftSheet";
import { useMessages, Message, Conversation } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useIsUserOnline } from "@/hooks/usePresence";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gift } from "@/data/giftData";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RecipientProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const Chat = () => {
  const { recipientId } = useParams<{ recipientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipientProfile, setRecipientProfile] = useState<RecipientProfile | null>(null);
  const {
    messages,
    loading,
    sendMessage,
    addReaction,
    deleteMessage,
    getOrCreateConversation,
    fetchMessages,
    subscribeToMessages
  } = useMessages();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationData, setConversationData] = useState<Partial<Conversation> | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showGiftSheet, setShowGiftSheet] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Computed states for request handling
  const isPendingSent = conversationData?.status === 'pending' && conversationData?.initiated_by === user?.id;
  const isPendingReceived = conversationData?.status === 'pending' && conversationData?.initiated_by !== user?.id;
  const canSendMessages = !isPendingSent || messages.length === 0; // Can only send first message if pending

  // Real-time typing indicator
  const { isAnyoneTyping, typingUsers, startTyping, stopTyping } = useTypingIndicator(conversationId);
  
  // Real-time online status
  const { isOnline, status: onlineStatus } = useIsUserOnline(recipientId);

  // Fetch recipient profile
  useEffect(() => {
    const fetchRecipient = async () => {
      if (!recipientId) return;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .eq("user_id", recipientId)
        .maybeSingle();
      if (data) setRecipientProfile(data);
    };
    fetchRecipient();
  }, [recipientId]);

  // Initialize conversation
  useEffect(() => {
    const init = async () => {
      if (user && recipientId) {
        const convId = await getOrCreateConversation(recipientId);
        if (convId) {
          setConversationId(convId);
          await fetchMessages(convId);
          
          // Fetch conversation data to check status
          const { data: convData } = await supabase
            .from("conversations")
            .select("status, initiated_by, request_message_count")
            .eq("id", convId)
            .maybeSingle();
          
          if (convData) {
            setConversationData(convData as Partial<Conversation>);
          }
        }
      }
    };
    init();
  }, [user, recipientId, getOrCreateConversation, fetchMessages]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (conversationId) {
      const unsubscribe = subscribeToMessages(conversationId);
      return unsubscribe;
    }
  }, [conversationId, subscribeToMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleBlockUser = async () => {
    if (!user || !recipientId) return;
    
    setIsBlocking(true);
    try {
      // Insert into blocked_users table
      const { error } = await supabase
        .from("blocked_users")
        .insert({
          blocker_id: user.id,
          blocked_id: recipientId
        });

      if (error) {
        if (error.code === '23505') {
          toast.info("User is already blocked");
        } else {
          throw error;
        }
      } else {
        toast.success(`${recipientProfile?.display_name || "User"} has been blocked`);
      }
      
      // Navigate back to messages
      navigate("/messages");
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error blocking user:", error);
      toast.error("Failed to block user");
    } finally {
      setIsBlocking(false);
      setShowBlockDialog(false);
    }
  };

  const handleSend = async (content: string, type: string = "text") => {
    if (!conversationId || !recipientId) return;

    // Check if user can send messages (pending request with message already sent)
    if (isPendingSent && messages.length > 0) {
      toast.error("Please wait for them to accept your request before sending more messages");
      return;
    }

    const success = await sendMessage(
      conversationId,
      recipientId,
      content,
      type,
      undefined,
      replyingTo?.id
    );
    
    if (success && conversationData?.status === 'pending') {
      // Update request message count
      await supabase
        .from("conversations")
        .update({ request_message_count: 1 })
        .eq("id", conversationId);
    }
    
    setReplyingTo(null);
  };

  const handleSendGift = async (gift: Gift, quantity: number) => {
    if (!conversationId || !recipientId) return;

    // Send gift message
    for (let i = 0; i < quantity; i++) {
      await sendMessage(conversationId, recipientId, gift.id, "gift");
    }

    toast.success(`Sent ${quantity}x ${gift.name} gift!`);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await addReaction(messageId, emoji);
  };

  const handleDelete = async (messageId: string) => {
    await deleteMessage(messageId);
    toast.success("Message deleted");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Sign in to chat</h2>
          <Button variant="glow" onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-glass-border"
      >
        <div className="flex items-center gap-3 px-2 py-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Profile info */}
          <button
            onClick={() => navigate(`/profile/${recipientId}`)}
            className="flex-1 flex items-center gap-3 min-w-0"
          >
            <div className="relative">
              <Avatar className="w-10 h-10 border border-glass-border">
                <AvatarImage src={recipientProfile?.avatar_url || ""} className="object-cover" />
                <AvatarFallback className="bg-muted">
                  {recipientProfile?.display_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator - realtime */}
              <span className={cn(
                "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card transition-colors",
                isOnline 
                  ? onlineStatus === "away" 
                    ? "bg-yellow-500" 
                    : "bg-green-500"
                  : "bg-muted-foreground/50"
              )} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h2 className="font-semibold text-foreground truncate">
                {recipientProfile?.display_name || recipientProfile?.username || "User"}
              </h2>
              <div className="flex items-center gap-1 text-xs">
                {isOnline ? (
                  <span className={cn(
                    "flex items-center gap-1",
                    onlineStatus === "away" ? "text-yellow-500" : "text-green-500"
                  )}>
                    <Circle className="w-2 h-2 fill-current" />
                    <span>{onlineStatus === "away" ? "Away" : "Online"}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Offline</span>
                )}
              </div>
            </div>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon-sm">
              <Video className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl border-glass-border">
                <DropdownMenuItem onClick={() => navigate(`/profile/${recipientId}`)}>
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Search in Chat
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Mute Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => setShowBlockDialog(true)}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Block User
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Flag className="w-4 h-4 mr-2" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Real-time Typing indicator */}
        <AnimatePresence>
          {isAnyoneTyping && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pb-2"
            >
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="flex gap-0.5">
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
                    className="w-1.5 h-1.5 bg-primary rounded-full"
                  />
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                    className="w-1.5 h-1.5 bg-primary rounded-full"
                  />
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                    className="w-1.5 h-1.5 bg-primary rounded-full"
                  />
                </span>
                <span className="text-primary font-medium">
                  {typingUsers[0]?.displayName || recipientProfile?.display_name || "User"}
                </span>
                <span>is typing...</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-28"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <Avatar className="w-20 h-20 mb-4 border-2 border-glass-border">
              <AvatarImage src={recipientProfile?.avatar_url || ""} className="object-cover" />
              <AvatarFallback className="text-2xl bg-muted">
                {recipientProfile?.display_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-semibold text-foreground mb-1">
              {recipientProfile?.display_name || recipientProfile?.username}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Start a conversation! Send a message or a gift to say hello.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === user.id}
                onReaction={handleReaction}
                onDelete={handleDelete}
                onReply={setReplyingTo}
                senderName={
                  message.sender_id === user.id 
                    ? "You" 
                    : recipientProfile?.display_name || recipientProfile?.username || "User"
                }
                senderAvatar={
                  message.sender_id !== user.id 
                    ? recipientProfile?.avatar_url || undefined
                    : undefined
                }
              />
            ))}
          </AnimatePresence>
        )}
        
        {/* Pending Request Status Banner */}
        {isPendingSent && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-yellow-500">Request Pending</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Waiting for {recipientProfile?.display_name || "them"} to accept your message request
            </p>
          </motion.div>
        )}
      </div>

      {/* Input - disabled when pending and already sent a message */}
      {isPendingSent && messages.length > 0 ? (
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-glass-border p-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span className="text-sm">Wait for request acceptance to send more messages</span>
          </div>
        </div>
      ) : (
        <ChatInput
          onSend={handleSend}
          onGiftClick={() => setShowGiftSheet(true)}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          disabled={!conversationId}
          onTyping={startTyping}
          onStopTyping={stopTyping}
        />
      )}
      {/* Gift sheet */}
      <ChatGiftSheet
        isOpen={showGiftSheet}
        onClose={() => setShowGiftSheet(false)}
        onSendGift={handleSendGift}
        recipientName={recipientProfile?.display_name || recipientProfile?.username}
      />

      {/* Block User Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent className="bg-card border-glass-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Block {recipientProfile?.display_name || "User"}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to message you or see your profile. You can unblock them later from settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBlocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              disabled={isBlocking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBlocking ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Ban className="w-4 h-4 mr-2" />
              )}
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Chat;
