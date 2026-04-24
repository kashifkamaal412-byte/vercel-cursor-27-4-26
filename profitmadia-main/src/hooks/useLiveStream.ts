import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface LiveStream {
  id: string;
  creator_id: string;
  title: string;
  category: string;
  audience_type: string;
  status: string;
  viewer_count: number;
  like_count: number;
  gift_count: number;
  peak_viewers: number;
  thumbnail_url: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  created_at: string;
  creator_name?: string;
  creator_avatar?: string;
}

export interface LiveChatMessage {
  id: string;
  stream_id: string;
  user_id: string;
  content: string;
  message_type: string;
  is_pinned: boolean;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

export interface LiveGift {
  id: string;
  stream_id: string;
  sender_id: string;
  gift_type: string;
  gift_value: number;
  gift_image: string | null;
  created_at: string;
  sender_name?: string;
}

export const useLiveStream = () => {
  const { user } = useAuth();

  const createStream = async (title: string, category: string, audienceType: string, thumbnailUrl?: string | null) => {
    if (!user) throw new Error("Must be logged in");
    const { data, error } = await (supabase as any)
      .from("live_streams")
      .insert({
        creator_id: user.id,
        title,
        category,
        audience_type: audienceType,
        status: "live",
        started_at: new Date().toISOString(),
        thumbnail_url: thumbnailUrl || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const endStream = async (streamId: string) => {
    const { error } = await (supabase as any)
      .from("live_streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", streamId);
    if (error) throw error;
  };

  const fetchActiveStreams = async (): Promise<LiveStream[]> => {
    const { data, error } = await (supabase as any)
      .from("live_streams")
      .select("*")
      .eq("status", "live")
      .order("viewer_count", { ascending: false });
    if (error) throw error;

    // Fetch creator profiles
    const creatorIds = (data || []).map((s: any) => s.creator_id);
    const { data: profiles } = await supabase.from("public_profile_view").select("user_id, display_name, username, avatar_url").in("user_id", creatorIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    return (data || []).map((s: any) => ({
      ...s,
      creator_name: profileMap.get(s.creator_id)?.display_name || profileMap.get(s.creator_id)?.username || "Creator",
      creator_avatar: profileMap.get(s.creator_id)?.avatar_url,
    }));
  };

  const joinStream = async (streamId: string) => {
    if (!user) return;
    await (supabase as any)
      .from("live_viewers")
      .upsert({ stream_id: streamId, user_id: user.id, is_active: true, joined_at: new Date().toISOString() }, { onConflict: "stream_id,user_id" });
  };

  const leaveStream = async (streamId: string) => {
    if (!user) return;
    await (supabase as any)
      .from("live_viewers")
      .update({ is_active: false, left_at: new Date().toISOString() })
      .eq("stream_id", streamId)
      .eq("user_id", user.id);
  };

  const sendChatMessage = async (streamId: string, content: string, messageType = "text") => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from("live_chat")
      .insert({ stream_id: streamId, user_id: user.id, content, message_type: messageType });
    if (error) throw error;
  };

  const sendLiveGift = async (streamId: string, giftType: string, giftValue: number, giftImage?: string) => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from("live_gifts")
      .insert({ stream_id: streamId, sender_id: user.id, gift_type: giftType, gift_value: giftValue, gift_image: giftImage || null });
    if (error) throw error;
  };

  const likeStream = async (streamId: string) => {
    await (supabase as any)
      .from("live_streams")
      .update({ like_count: (supabase as any).rpc ? undefined : 0 })
      .eq("id", streamId);
    // Use raw increment via RPC or manual
    await (supabase as any).rpc("increment_live_likes", { stream_id: streamId }).catch(() => {
      // fallback: just send a chat reaction
      sendChatMessage(streamId, "❤️", "reaction");
    });
  };

  const requestToJoinAsGuest = async (streamId: string) => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from("live_guests")
      .insert({ stream_id: streamId, user_id: user.id, status: "pending" });
    if (error) throw error;
  };

  const updateGuestStatus = async (guestId: string, status: string) => {
    const { error } = await (supabase as any)
      .from("live_guests")
      .update({ status, joined_at: status === "accepted" ? new Date().toISOString() : undefined })
      .eq("id", guestId);
    if (error) throw error;
  };

  return {
    createStream,
    endStream,
    fetchActiveStreams,
    joinStream,
    leaveStream,
    sendChatMessage,
    sendLiveGift,
    likeStream,
    requestToJoinAsGuest,
    updateGuestStatus,
  };
};

// Hook for real-time subscriptions
export const useLiveRealtimeChat = (streamId: string | null) => {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!streamId) return;

    // Load existing messages
    (supabase as any)
      .from("live_chat")
      .select("*")
      .eq("stream_id", streamId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(async ({ data }: any) => {
        if (data) {
          const userIds = [...new Set(data.map((m: any) => m.user_id))];
          const { data: profiles } = await supabase.from("public_profile_view").select("user_id, display_name, username, avatar_url").in("user_id", userIds as string[]);
          const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
          setMessages(data.map((m: any) => ({
            ...m,
            user_name: profileMap.get(m.user_id)?.display_name || profileMap.get(m.user_id)?.username || "User",
            user_avatar: profileMap.get(m.user_id)?.avatar_url,
          })));
        }
      });

    // Subscribe to new messages
    const channel = supabase
      .channel(`live-chat-${streamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat", filter: `stream_id=eq.${streamId}` }, async (payload: any) => {
        const msg = payload.new;
        const { data: profile } = await supabase.from("public_profile_view").select("display_name, username, avatar_url").eq("user_id", msg.user_id).single();
        setMessages(prev => [...prev.slice(-200), {
          ...msg,
          user_name: profile?.display_name || profile?.username || "User",
          user_avatar: profile?.avatar_url,
        }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  return messages;
};

export const useLiveRealtimeGifts = (streamId: string | null) => {
  const [gifts, setGifts] = useState<LiveGift[]>([]);
  const [latestGift, setLatestGift] = useState<LiveGift | null>(null);

  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`live-gifts-${streamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_gifts", filter: `stream_id=eq.${streamId}` }, async (payload: any) => {
        const gift = payload.new;
        const { data: profile } = await supabase.from("public_profile_view").select("display_name, username").eq("user_id", gift.sender_id).single();
        const enriched = { ...gift, sender_name: profile?.display_name || profile?.username || "Someone" };
        setGifts(prev => [...prev, enriched]);
        setLatestGift(enriched);
        setTimeout(() => setLatestGift(null), 4000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  return { gifts, latestGift };
};

export const useLiveRealtimeViewers = (streamId: string | null) => {
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (!streamId) return;

    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("live_streams")
        .select("viewer_count")
        .eq("id", streamId)
        .single();
      if (data) setViewerCount(data.viewer_count);
    };
    fetch();

    const channel = supabase
      .channel(`live-viewers-${streamId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_streams", filter: `id=eq.${streamId}` }, (payload: any) => {
        if (payload.new.viewer_count !== undefined) setViewerCount(payload.new.viewer_count);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  return viewerCount;
};
