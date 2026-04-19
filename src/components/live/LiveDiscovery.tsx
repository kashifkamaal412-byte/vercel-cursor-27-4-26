import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Radio, Eye, Search, TrendingUp, Sparkles, RefreshCw,
  Swords, Users, Clock, Crown, Flame, Trophy,
  ChevronRight, Star, Zap, Gift,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLiveStream, LiveStream } from "@/hooks/useLiveStream";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface LiveDiscoveryProps {
  onSelectStream: (stream: LiveStream) => void;
}

const formatDuration = (startedAt: string | null) => {
  if (!startedAt) return "";
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const formatViewerCount = (count: number) => {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

interface DailyRanking {
  userId: string;
  name: string;
  avatar: string;
  score: number;
}

export const LiveDiscovery = ({ onSelectStream }: LiveDiscoveryProps) => {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "trending" | "new" | "battle">("all");
  const [dailyRankings, setDailyRankings] = useState<DailyRanking[]>([]);
  const [showRankings, setShowRankings] = useState(false);
  const { fetchActiveStreams } = useLiveStream();

  const loadStreams = async () => {
    setLoading(true);
    try {
      const data = await fetchActiveStreams();
      setStreams(data);
    } catch {}
    setLoading(false);
  };

  // Load daily rankings
  const loadRankings = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data } = await (supabase as any)
      .from("live_gifts")
      .select("sender_id, gift_value")
      .gte("created_at", today.toISOString());

    if (!data) return;

    const agg: Record<string, number> = {};
    data.forEach((g: any) => { agg[g.sender_id] = (agg[g.sender_id] || 0) + g.gift_value; });

    const sorted = Object.entries(agg)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10);

    if (sorted.length === 0) return;

    const senderIds = sorted.map(([id]) => id);
    const { data: profiles } = await supabase
      .from("public_profile_view")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", senderIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id as string, p]));
    setDailyRankings(sorted.map(([id, score]) => ({
      userId: id,
      name: profileMap.get(id)?.display_name || profileMap.get(id)?.username || "User",
      avatar: profileMap.get(id)?.avatar_url || "",
      score: score as number,
    })));
  };

  useEffect(() => {
    loadStreams();
    loadRankings();
  }, []);

  const filtered = streams.filter(s => {
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.creator_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "trending") return s.viewer_count > 50;
    return true;
  }).sort((a, b) => {
    if (filter === "new") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return b.viewer_count - a.viewer_count;
  });

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      {/* Premium Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border/20">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg shadow-red-500/30"
              >
                <Radio className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-extrabold text-foreground tracking-tight">Live</h1>
                <p className="text-[10px] text-muted-foreground -mt-0.5">
                  {streams.length > 0 ? `${streams.length} streams active` : "Go live now!"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              {/* Daily Rankings Button */}
              {dailyRankings.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowRankings(!showRankings)}
                  className="w-9 h-9 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center"
                >
                  <Trophy className="w-4 h-4 text-yellow-400" />
                </motion.button>
              )}
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search creators or streams..."
              className="pl-9 bg-card/80 border-border/30 h-10 text-sm rounded-xl"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { id: "all" as const, label: "For You", icon: Sparkles },
              { id: "trending" as const, label: "Popular", icon: Flame },
              { id: "new" as const, label: "New", icon: Clock },
              { id: "battle" as const, label: "VS Battle", icon: Swords },
            ].map(f => (
              <Button
                key={f.id}
                size="sm"
                variant={filter === f.id ? "default" : "outline"}
                className={`rounded-full h-8 text-xs gap-1.5 font-semibold transition-all whitespace-nowrap ${
                  filter === f.id
                    ? "bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 shadow-lg shadow-red-500/20"
                    : "bg-card/50 border-border/30 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setFilter(f.id)}
              >
                <f.icon className="w-3.5 h-3.5" />
                {f.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" className="rounded-full h-8 ml-auto text-muted-foreground" onClick={loadStreams}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Daily Rankings Banner */}
      <AnimatePresence>
        {showRankings && dailyRankings.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/10"
          >
            <div className="p-4 bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-red-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold text-foreground">Today's Top Gifters</span>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {dailyRankings.slice(0, 5).map((r, i) => (
                  <motion.div
                    key={r.userId}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex flex-col items-center min-w-[60px]"
                  >
                    <div className="relative mb-1">
                      <Avatar className={`w-11 h-11 ${i === 0 ? "border-2 border-yellow-400 shadow-lg shadow-yellow-400/20" : "border border-white/10"}`}>
                        <AvatarImage src={r.avatar || ""} />
                        <AvatarFallback className="text-[10px] bg-muted">{r.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-1 -right-1 text-sm">{i < 3 ? medals[i] : `#${i + 1}`}</span>
                    </div>
                    <p className="text-[10px] font-semibold text-foreground truncate max-w-[60px]">{r.name}</p>
                    <p className="text-[9px] text-yellow-400 font-bold">{r.score.toLocaleString()}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stream Grid */}
      <div className="p-4 md:max-w-6xl md:mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-card/50 animate-pulse border border-border/10" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-red-500/10 to-pink-500/10 flex items-center justify-center"
            >
              <Radio className="w-10 h-10 text-muted-foreground" />
            </motion.div>
            <h3 className="text-lg font-bold text-foreground mb-2">No Live Streams</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-[200px] mx-auto">
              No one is live right now. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtered.map((stream, i) => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                onClick={() => onSelectStream(stream)}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-card cursor-pointer group border border-border/10 shadow-lg shadow-black/10"
              >
                {/* Thumbnail */}
                <div className="absolute inset-0">
                  {stream.thumbnail_url ? (
                    <img src={stream.thumbnail_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-card via-muted to-card flex items-center justify-center">
                      <Avatar className="w-20 h-20 border-3 border-red-500/50 shadow-xl shadow-red-500/20">
                        <AvatarImage src={stream.creator_avatar || ""} />
                        <AvatarFallback className="text-3xl bg-gradient-to-br from-red-500/20 to-pink-500/20 text-foreground">
                          {(stream.creator_name || "C")[0]}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                </div>

                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

                {/* Top badges */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded-md shadow-lg shadow-red-600/40">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-white tracking-wide">LIVE</span>
                    </div>
                    {stream.viewer_count > 100 && (
                      <div className="flex items-center gap-0.5 bg-orange-500/90 px-1.5 py-0.5 rounded-md">
                        <TrendingUp className="w-2.5 h-2.5 text-white" />
                        <span className="text-[8px] font-bold text-white">HOT</span>
                      </div>
                    )}
                    {stream.gift_count > 50 && (
                      <div className="flex items-center gap-0.5 bg-yellow-500/90 px-1.5 py-0.5 rounded-md">
                        <Gift className="w-2.5 h-2.5 text-white" />
                        <span className="text-[8px] font-bold text-white">GIFTS</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md border border-white/10">
                    <Eye className="w-3 h-3 text-white/80" />
                    <span className="text-[10px] font-bold text-white">{formatViewerCount(stream.viewer_count)}</span>
                  </div>
                </div>

                {/* Duration */}
                {stream.started_at && (
                  <div className="absolute top-10 right-2.5">
                    <div className="flex items-center gap-0.5 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                      <Clock className="w-2.5 h-2.5 text-white/60" />
                      <span className="text-[9px] text-white/70">{formatDuration(stream.started_at)}</span>
                    </div>
                  </div>
                )}

                {/* Bottom Info */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Avatar className="w-7 h-7 border border-white/20">
                      <AvatarImage src={stream.creator_avatar || ""} />
                      <AvatarFallback className="text-[10px] bg-white/10 text-white">{(stream.creator_name || "C")[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-white truncate">{stream.creator_name}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/80 truncate mb-1.5 font-medium">{stream.title}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[8px] border-white/15 text-white/70 h-4 bg-white/5 px-1.5">
                      {stream.category}
                    </Badge>
                    {stream.peak_viewers > 200 && (
                      <Badge variant="outline" className="text-[8px] border-yellow-500/30 text-yellow-400 h-4 bg-yellow-500/10 px-1.5 gap-0.5">
                        <Crown className="w-2 h-2" /> Top
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Hover shimmer */}
                <motion.div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
