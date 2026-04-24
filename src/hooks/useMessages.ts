import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  message_type: string;
  media_url: string | null;
  gift_id: string | null;
  is_read: boolean;
  is_delivered: boolean;
  reply_to_id: string | null;
  reactions: any[];
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  participant_one: string;
  participant_two: string;
  last_message_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  status: "pending" | "accepted" | "rejected";
  initiated_by: string | null;
  request_message_count: number;
  other_user?: {
    user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  last_message?: Message | null;
  unread_count?: number;
  is_request?: boolean; // True if this is a pending request TO the current user
  is_pending_sent?: boolean; // True if current user sent a pending request
}

export const useMessages = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Get or create conversation
  const getOrCreateConversation = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // First check if conversation exists
      const p1 = user.id < otherUserId ? user.id : otherUserId;
      const p2 = user.id < otherUserId ? otherUserId : user.id;
      
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("participant_one", p1)
        .eq("participant_two", p2)
        .maybeSingle();
        
      if (existing) {
        return existing.id;
      }
      
      // Create new conversation with pending status and initiated_by
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          participant_one: p1,
          participant_two: p2,
          status: 'pending',
          initiated_by: user.id,
          request_message_count: 0
        })
        .select("id")
        .single();

      if (error) throw error;
      return newConv.id;
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error getting/creating conversation:", error);
      return null;
    }
  }, [user]);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: convs, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      if (!convs || convs.length === 0) {
        setConversations([]);
        return;
      }

      // Get other user IDs
      const otherUserIds = convs.map(c => 
        c.participant_one === user.id ? c.participant_two : c.participant_one
      );

      // Fetch profiles, last messages, unread counts, and following status in parallel
      const [profilesResult, followsResult, unreadResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", otherUserIds),
        supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id)
          .in("following_id", otherUserIds),
        supabase
          .from("messages")
          .select("conversation_id")
          .eq("receiver_id", user.id)
          .eq("is_read", false)
      ]);

      const profiles = profilesResult.data;
      const followedUsers = new Set(followsResult.data?.map(f => f.following_id) || []);

      // Fetch last messages
      const lastMessageIds = convs.filter(c => c.last_message_id).map(c => c.last_message_id);
      let lastMessages: Message[] = [];
      if (lastMessageIds.length > 0) {
        const { data } = await supabase
          .from("messages")
          .select("*")
          .in("id", lastMessageIds);
        lastMessages = (data || []) as Message[];
      }

      // Count unread messages per conversation
      const unreadMap = new Map<string, number>();
      unreadResult.data?.forEach(m => {
        unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
      });

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const messagesMap = new Map(lastMessages.map(m => [m.id, m]));

      const enrichedConvs: Conversation[] = convs.map(conv => {
        const otherUserId = conv.participant_one === user.id ? conv.participant_two : conv.participant_one;
        const convStatus = (conv.status || 'accepted') as "pending" | "accepted" | "rejected";
        const isPendingRequest = convStatus === 'pending' && conv.initiated_by !== user.id;
        const isPendingSent = convStatus === 'pending' && conv.initiated_by === user.id;
        return {
          ...conv,
          status: convStatus,
          other_user: profilesMap.get(otherUserId),
          last_message: conv.last_message_id ? messagesMap.get(conv.last_message_id) : null,
          unread_count: unreadMap.get(conv.id) || 0,
          is_request: isPendingRequest, // Request TO current user (they need to accept/decline)
          is_pending_sent: isPendingSent // Request FROM current user (waiting for other to accept)
        };
      });

      setConversations(enrichedConvs);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages((data || []) as Message[]);

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .eq("receiver_id", user.id)
        .eq("is_read", false);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Send message
  const sendMessage = useCallback(async (
    conversationId: string,
    receiverId: string,
    content: string,
    messageType: string = "text",
    mediaUrl?: string,
    replyToId?: string
  ): Promise<boolean> => {
    if (!user) {
      toast.error("Sign in to send messages");
      return false;
    }

    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          receiver_id: receiverId,
          content,
          message_type: messageType,
          media_url: mediaUrl,
          reply_to_id: replyToId
        });

      if (error) throw error;
      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error sending message:", error);
      toast.error("Failed to send message");
      return false;
    }
  }, [user]);

  // Add reaction to message
  const addReaction = useCallback(async (messageId: string, reaction: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data: message, error: fetchError } = await supabase
        .from("messages")
        .select("reactions")
        .eq("id", messageId)
        .single();

      if (fetchError) throw fetchError;

      const existingReactions = Array.isArray(message?.reactions) ? message.reactions : [];
      const reactions = [...existingReactions];
      const existingIndex = reactions.findIndex((r: any) => r.user_id === user.id);
      
      if (existingIndex >= 0) {
        reactions[existingIndex] = { user_id: user.id, emoji: reaction };
      } else {
        reactions.push({ user_id: user.id, emoji: reaction });
      }

      const { error } = await supabase
        .from("messages")
        .update({ reactions })
        .eq("id", messageId);

      if (error) throw error;
      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error adding reaction:", error);
      return false;
    }
  }, [user]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId)
        .eq("sender_id", user.id);

      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== messageId));
      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error deleting message:", error);
      return false;
    }
  }, [user]);

  // Subscribe to realtime messages
  const subscribeToMessages = useCallback((conversationId: string) => {
    if (!user) return () => {};

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            if (prev.find(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          // Auto-mark as read if receiver
          if (newMessage.receiver_id === user.id) {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", newMessage.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setMessages(prev => prev.filter(m => m.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Subscribe to conversation updates
  const subscribeToConversations = useCallback(() => {
    if (!user) return () => {};

    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    messages,
    loading,
    typingUsers,
    fetchConversations,
    fetchMessages,
    sendMessage,
    addReaction,
    deleteMessage,
    getOrCreateConversation,
    subscribeToMessages,
    subscribeToConversations,
    setMessages
  };
};
