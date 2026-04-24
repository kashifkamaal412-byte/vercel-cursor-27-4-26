import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TypingState {
  isTyping: boolean;
  userId: string;
  displayName?: string;
}

export const useTypingIndicator = (conversationId: string | null) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingState>>(new Map());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to typing events using Realtime Presence
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { presence: { key: user.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ isTyping: boolean; displayName?: string }>();
        const newTypingUsers = new Map<string, TypingState>();
        
        Object.entries(state).forEach(([key, presences]) => {
          const presence = presences[0];
          if (presence && key !== user.id && presence.isTyping) {
            newTypingUsers.set(key, {
              isTyping: true,
              userId: key,
              displayName: presence.displayName
            });
          }
        });
        
        setTypingUsers(newTypingUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== user.id && newPresences[0]?.isTyping) {
          setTypingUsers(prev => {
            const updated = new Map(prev);
            updated.set(key, {
              isTyping: true,
              userId: key,
              displayName: newPresences[0]?.displayName
            });
            return updated;
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setTypingUsers(prev => {
          const updated = new Map(prev);
          updated.delete(key);
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ isTyping: false });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, user]);

  // Emit typing start
  const startTyping = useCallback(async (displayName?: string) => {
    if (!channelRef.current) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Track typing state
    await channelRef.current.track({ isTyping: true, displayName });

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(async () => {
      if (channelRef.current) {
        await channelRef.current.track({ isTyping: false });
      }
    }, 3000);
  }, []);

  // Emit typing stop
  const stopTyping = useCallback(async () => {
    if (!channelRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    await channelRef.current.track({ isTyping: false });
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Check if anyone is typing
  const isAnyoneTyping = typingUsers.size > 0;
  const typingUsersList = Array.from(typingUsers.values());

  return {
    typingUsers: typingUsersList,
    isAnyoneTyping,
    startTyping,
    stopTyping
  };
};
