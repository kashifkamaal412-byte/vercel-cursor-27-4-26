import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PresenceState {
  user_id: string;
  online_at: string;
  status: "online" | "away" | "offline";
}

interface OnlineUser {
  user_id: string;
  online_at: string;
  status: "online" | "away" | "offline";
  lastSeen?: string;
}

// Global store for online users (shared across components)
let globalOnlineUsers = new Map<string, OnlineUser>();
let globalListeners = new Set<() => void>();

const notifyListeners = () => {
  globalListeners.forEach(listener => listener());
};

export const usePresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(globalOnlineUsers);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isInitializedRef = useRef(false);

  // Subscribe to global state changes
  useEffect(() => {
    const updateState = () => {
      setOnlineUsers(new Map(globalOnlineUsers));
    };
    
    globalListeners.add(updateState);
    return () => {
      globalListeners.delete(updateState);
    };
  }, []);

  // Initialize presence channel
  useEffect(() => {
    if (!user || isInitializedRef.current) return;
    isInitializedRef.current = true;

    const channel = supabase.channel("global-presence", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    // Handle presence sync
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const newOnlineUsers = new Map<string, OnlineUser>();

      Object.entries(state).forEach(([userId, presences]) => {
        if (presences && presences.length > 0) {
          const latestPresence = presences[presences.length - 1] as unknown as PresenceState;
          newOnlineUsers.set(userId, {
            user_id: userId,
            online_at: latestPresence.online_at || new Date().toISOString(),
            status: latestPresence.status || "online",
            lastSeen: new Date().toISOString(),
          });
        }
      });

      globalOnlineUsers = newOnlineUsers;
      notifyListeners();
    });

    // Handle user joining
    channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
      if (newPresences && newPresences.length > 0) {
        const presence = newPresences[0] as unknown as PresenceState;
        globalOnlineUsers.set(key, {
          user_id: key,
          online_at: presence.online_at || new Date().toISOString(),
          status: presence.status || "online",
          lastSeen: new Date().toISOString(),
        });
        notifyListeners();
      }
    });

    // Handle user leaving
    channel.on("presence", { event: "leave" }, ({ key }) => {
      globalOnlineUsers.delete(key);
      notifyListeners();
    });

    // Subscribe and track own presence
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
          status: "online" as const,
        });
      }
    });

    // Handle visibility change (tab switch, minimize)
    const handleVisibilityChange = async () => {
      if (!channelRef.current) return;
      
      if (document.hidden) {
        await channelRef.current.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
          status: "away" as const,
        });
      } else {
        await channelRef.current.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
          status: "online" as const,
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Handle beforeunload (closing tab/browser)
    const handleBeforeUnload = () => {
      if (channelRef.current) {
        channelRef.current.untrack();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
      isInitializedRef.current = false;
    };
  }, [user]);

  // Check if a specific user is online
  const isUserOnline = useCallback((userId: string): boolean => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  // Get user's status
  const getUserStatus = useCallback((userId: string): "online" | "away" | "offline" => {
    const presence = onlineUsers.get(userId);
    return presence?.status || "offline";
  }, [onlineUsers]);

  // Get last seen time
  const getLastSeen = useCallback((userId: string): string | null => {
    const presence = onlineUsers.get(userId);
    return presence?.lastSeen || null;
  }, [onlineUsers]);

  return {
    onlineUsers,
    isUserOnline,
    getUserStatus,
    getLastSeen,
  };
};

// Hook for components that just need to check online status
export const useIsUserOnline = (userId: string | undefined) => {
  const { isUserOnline, getUserStatus } = usePresence();
  
  if (!userId) return { isOnline: false, status: "offline" as const };
  
  return {
    isOnline: isUserOnline(userId),
    status: getUserStatus(userId),
  };
};
