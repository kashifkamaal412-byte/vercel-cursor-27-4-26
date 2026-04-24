import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LiveBadgeProps {
  userId: string;
  className?: string;
}

export const LiveBadge = ({ userId, className = "" }: LiveBadgeProps) => {
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const checkLive = async () => {
      const { data } = await (supabase as any)
        .from("live_streams")
        .select("id")
        .eq("creator_id", userId)
        .eq("status", "live")
        .limit(1);
      setIsLive((data || []).length > 0);
    };
    checkLive();

    const channel = supabase
      .channel(`live-badge-${userId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "live_streams",
        filter: `creator_id=eq.${userId}`,
      }, () => checkLive())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  if (!isLive) return null;

  return (
    <div className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-red-600 px-1.5 py-0.5 rounded-full z-10 ${className}`}>
      <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
      <span className="text-[7px] font-bold text-white leading-none">LIVE</span>
    </div>
  );
};
