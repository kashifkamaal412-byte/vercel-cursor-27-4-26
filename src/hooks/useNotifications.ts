import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  user_id: string;
  from_user_id: string;
  video_id: string | null;
  type: "like" | "comment" | "gift" | "follow";
  message: string;
  is_read: boolean;
  metadata: {
    video_caption?: string;
    comment?: string;
    gift_type?: string;
    gift_value?: number;
  } | null;
  created_at: string;
  from_user?: {
    display_name: string;
    avatar_url: string;
  };
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
      return;
    }

    if (data) {
      // Fetch profile info for each notification sender
      const fromUserIds = [...new Set(data.map((n) => n.from_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", fromUserIds);

      const notificationsWithProfiles = data.map((n) => {
        const profile = profiles?.find((p) => p.user_id === n.from_user_id);
        return {
          ...n,
          type: n.type as "like" | "comment" | "gift" | "follow",
          metadata: n.metadata as Notification["metadata"],
          from_user: profile
            ? {
                display_name: profile.display_name || "Unknown",
                avatar_url: profile.avatar_url || "",
              }
            : undefined,
        };
      });

      setNotifications(notificationsWithProfiles);
      setUnreadCount(notificationsWithProfiles.filter((n) => !n.is_read).length);
    }

    setLoading(false);
  }, [user]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [user]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [user]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", user.id);

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    },
    [user]
  );

  const clearAll = useCallback(async () => {
    if (!user) return;

    await supabase.from("notifications").delete().eq("user_id", user.id);

    setNotifications([]);
    setUnreadCount(0);
  }, [user]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // Fetch profile for new notification
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .eq("user_id", (payload.new as any).from_user_id)
            .single();

          const newNotification: Notification = {
            ...(payload.new as any),
            type: (payload.new as any).type as Notification["type"],
            metadata: (payload.new as any).metadata,
            from_user: profile
              ? {
                  display_name: profile.display_name || "Unknown",
                  avatar_url: profile.avatar_url || "",
                }
              : undefined,
          };

          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refetch: fetchNotifications,
  };
};
