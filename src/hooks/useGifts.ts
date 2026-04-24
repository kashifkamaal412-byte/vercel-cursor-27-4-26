import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Gift } from "@/data/giftData";

export interface GiftRecord {
  id: string;
  sender_id: string;
  receiver_id: string;
  video_id: string;
  gift_type: string;
  gift_value: number;
  created_at: string;
  sender_profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  video?: {
    caption: string | null;
    thumbnail_url: string | null;
  };
}

export const useGifts = () => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

  const sendGift = useCallback(async (
    gift: Gift, 
    quantity: number, 
    videoId: string, 
    receiverId: string
  ): Promise<boolean> => {
    if (!user) {
      toast.error("Sign in to send gifts");
      return false;
    }

    if (user.id === receiverId) {
      toast.error("You can't send gifts to yourself");
      return false;
    }

    setSending(true);
    try {
      // Insert gift record(s) - one for each quantity
      const giftRecords = Array(quantity).fill({
        sender_id: user.id,
        receiver_id: receiverId,
        video_id: videoId,
        gift_type: gift.id,
        gift_value: gift.value,
      });

      const { error } = await supabase
        .from("gifts")
        .insert(giftRecords);

      if (error) throw error;

      return true;
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Gift send error:", error);
      }
      toast.error("Failed to send gift");
      return false;
    } finally {
      setSending(false);
    }
  }, [user]);

  const fetchReceivedGifts = useCallback(async (userId: string): Promise<GiftRecord[]> => {
    try {
      const { data: gifts, error } = await supabase
        .from("gifts")
        .select("*")
        .eq("receiver_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      if (!gifts || gifts.length === 0) return [];

      // Get unique sender IDs and video IDs
      const senderIds = [...new Set(gifts.map(g => g.sender_id))];
      const videoIds = [...new Set(gifts.map(g => g.video_id))];

      // Fetch sender profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", senderIds);

      // Fetch videos
      const { data: videos } = await supabase
        .from("videos")
        .select("id, caption, thumbnail_url")
        .in("id", videoIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const videosMap = new Map(videos?.map(v => [v.id, v]) || []);

      return gifts.map(gift => ({
        ...gift,
        sender_profile: profilesMap.get(gift.sender_id) || undefined,
        video: videosMap.get(gift.video_id) || undefined,
      }));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching gifts:", error);
      }
      return [];
    }
  }, []);

  const fetchGiftsByVideo = useCallback(async (videoId: string): Promise<GiftRecord[]> => {
    try {
      const { data: gifts, error } = await supabase
        .from("gifts")
        .select("*")
        .eq("video_id", videoId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!gifts || gifts.length === 0) return [];

      // Get unique sender IDs
      const senderIds = [...new Set(gifts.map(g => g.sender_id))];

      // Fetch sender profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", senderIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return gifts.map(gift => ({
        ...gift,
        sender_profile: profilesMap.get(gift.sender_id) || undefined,
      }));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching video gifts:", error);
      }
      return [];
    }
  }, []);

  const getGiftStats = useCallback(async (userId: string): Promise<{
    totalGifts: number;
    totalValue: number;
    giftCounts: Record<string, number>;
  }> => {
    try {
      const { data: gifts, error } = await supabase
        .from("gifts")
        .select("gift_type, gift_value")
        .eq("receiver_id", userId);

      if (error) throw error;

      const giftCounts: Record<string, number> = {};
      let totalValue = 0;

      gifts?.forEach(gift => {
        giftCounts[gift.gift_type] = (giftCounts[gift.gift_type] || 0) + 1;
        totalValue += gift.gift_value;
      });

      return {
        totalGifts: gifts?.length || 0,
        totalValue,
        giftCounts,
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error getting gift stats:", error);
      }
      return { totalGifts: 0, totalValue: 0, giftCounts: {} };
    }
  }, []);

  return {
    sendGift,
    sending,
    fetchReceivedGifts,
    fetchGiftsByVideo,
    getGiftStats,
  };
};
