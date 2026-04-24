import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Crown, Medal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

interface TopGifter {
  sender_id: string;
  total_value: number;
  sender_name: string;
  sender_avatar: string | null;
}

interface TopGifterLeaderboardProps {
  streamId: string;
}

export const TopGifterLeaderboard = ({ streamId }: TopGifterLeaderboardProps) => {
  const [gifters, setGifters] = useState<TopGifter[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("live_gifts")
        .select("sender_id, gift_value")
        .eq("stream_id", streamId);

      if (!data) return;

      // Aggregate by sender
      const agg: Record<string, number> = {};
      data.forEach((g: any) => { agg[g.sender_id] = (agg[g.sender_id] || 0) + g.gift_value; });

      const sorted = Object.entries(agg).sort(([, a], [, b]) => b - a).slice(0, 10);
      const senderIds = sorted.map(([id]) => id);

      const { data: profiles } = await supabase.from("public_profile_view").select("user_id, display_name, username, avatar_url").in("user_id", senderIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      setGifters(sorted.map(([id, total]) => ({
        sender_id: id,
        total_value: total,
        sender_name: profileMap.get(id)?.display_name || profileMap.get(id)?.username || "User",
        sender_avatar: profileMap.get(id)?.avatar_url || null,
      })));
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, [streamId]);

  const badges = [
    <Crown key="1" className="w-4 h-4 text-yellow-400" />,
    <Medal key="2" className="w-4 h-4 text-gray-300" />,
    <Medal key="3" className="w-4 h-4 text-amber-600" />,
  ];

  if (gifters.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {gifters.slice(0, 3).map((g, i) => (
        <motion.div
          key={g.sender_id}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="relative"
        >
          <Avatar className="w-7 h-7 border-2 border-primary/40">
            <AvatarImage src={g.sender_avatar || ""} />
            <AvatarFallback className="text-[9px] bg-muted">{g.sender_name[0]}</AvatarFallback>
          </Avatar>
          <div className="absolute -top-1 -right-1">{badges[i]}</div>
        </motion.div>
      ))}
    </div>
  );
};
