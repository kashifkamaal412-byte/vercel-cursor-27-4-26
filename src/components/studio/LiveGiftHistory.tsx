import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Radio, Gift, Coins, Clock, User, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface LiveGiftRecord {
  id: string;
  gift_type: string;
  gift_value: number;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
  stream_title: string;
}

interface LiveSessionRecord {
  id: string;
  title: string;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number;
  gift_count: number;
  peak_viewers: number;
  duration_seconds: number;
}

export const LiveGiftHistory = () => {
  const { user } = useAuth();
  const [gifts, setGifts] = useState<LiveGiftRecord[]>([]);
  const [sessions, setSessions] = useState<LiveSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"gifts" | "sessions">("gifts");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);

      // Fetch creator's streams
      const { data: streams } = await (supabase as any)
        .from("live_streams")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (streams) {
        setSessions(streams);

        // Fetch gifts for all streams
        const streamIds = streams.map((s: any) => s.id);
        if (streamIds.length > 0) {
          const { data: giftData } = await (supabase as any)
            .from("live_gifts")
            .select("*")
            .in("stream_id", streamIds)
            .order("created_at", { ascending: false })
            .limit(200);

          if (giftData) {
            // Enrich with sender profiles
            const senderIds = [...new Set(giftData.map((g: any) => g.sender_id))];
            const { data: profiles } = await supabase
              .from("public_profile_view")
              .select("user_id, display_name, username, avatar_url")
              .in("user_id", senderIds as string[]);
            const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
            const streamMap = new Map(streams.map((s: any) => [s.id, s.title]));

            setGifts(giftData.map((g: any) => ({
              ...g,
              sender_name: profileMap.get(g.sender_id)?.display_name || profileMap.get(g.sender_id)?.username || "User",
              sender_avatar: profileMap.get(g.sender_id)?.avatar_url || null,
              stream_title: streamMap.get(g.stream_id) || "Live Stream",
            })));
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const totalCoins = gifts.reduce((sum, g) => sum + g.gift_value, 0);
  const totalGifts = gifts.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Radio className="w-5 h-5 text-red-500" />
        Live Gifts
      </h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-xl p-3 text-center">
          <Gift className="w-5 h-5 mx-auto mb-1 text-pink-500" />
          <p className="text-lg font-bold">{totalGifts}</p>
          <p className="text-[10px] text-muted-foreground">Total Gifts</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Coins className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
          <p className="text-lg font-bold">{totalCoins.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Total Coins</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Radio className="w-5 h-5 mx-auto mb-1 text-red-500" />
          <p className="text-lg font-bold">{sessions.length}</p>
          <p className="text-[10px] text-muted-foreground">Live Sessions</p>
        </div>
      </div>

      {/* Tab Switch */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
        <button
          onClick={() => setTab("gifts")}
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${tab === "gifts" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Gift History
        </button>
        <button
          onClick={() => setTab("sessions")}
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${tab === "sessions" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Sessions
        </button>
      </div>

      {tab === "gifts" ? (
        <div className="space-y-2">
          {gifts.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No live gifts received yet</p>
            </div>
          ) : (
            gifts.map(gift => (
              <div key={gift.id} className="glass rounded-xl p-3 flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={gift.sender_avatar || ""} />
                  <AvatarFallback className="text-xs">{gift.sender_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{gift.sender_name}</p>
                  <p className="text-[10px] text-muted-foreground">sent {gift.gift_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-yellow-500">{gift.gift_value} coins</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(gift.created_at), "MMM d, HH:mm")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Radio className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No live sessions yet</p>
            </div>
          ) : (
            sessions.map(session => (
              <div key={session.id} className="glass rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold truncate flex-1">{session.title}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    session.ended_at ? "bg-muted text-muted-foreground" : "bg-red-500/20 text-red-400"
                  }`}>
                    {session.ended_at ? "Ended" : "Live"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs font-bold">{session.peak_viewers}</p>
                    <p className="text-[9px] text-muted-foreground">Peak Viewers</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-yellow-500">{session.gift_count}</p>
                    <p className="text-[9px] text-muted-foreground">Gifts</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold">{Math.floor((session.duration_seconds || 0) / 60)}m</p>
                    <p className="text-[9px] text-muted-foreground">Duration</p>
                  </div>
                </div>
                {session.started_at && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(session.started_at), "MMM d, yyyy · HH:mm")}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
