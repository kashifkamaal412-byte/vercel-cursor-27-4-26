import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Music2, Play, Pause, TrendingUp,
  Clock, Heart, X, User, Video, Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SoundLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSound: (sound: SoundItem) => void;
}

export interface SoundItem {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: number;
  useCount: number;
  avatarUrl?: string;
  videoCount?: number;
  creatorUsername?: string;
}

type Tab = "trending" | "recent" | "favorites";

export const SoundLibrary = ({ isOpen, onClose, onSelectSound }: SoundLibraryProps) => {
  const [tab, setTab] = useState<Tab>("trending");
  const [search, setSearch] = useState("");
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchSounds();
  }, [isOpen, tab]);

  const fetchSounds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("id, music_title, video_url, duration, view_count, user_id")
        .not("music_title", "is", null)
        .neq("music_title", "")
        .eq("is_public", true)
        .order(tab === "recent" ? "created_at" : "view_count", { ascending: false })
        .limit(50);

      if (!error && data) {
        // Collect unique user_ids
        const userIds = [...new Set(data.map(v => v.user_id))];
        
        // Fetch profiles for creators
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map<string, { username: string; display_name: string; avatar_url: string }>();
        profiles?.forEach(p => profileMap.set(p.user_id, p as any));

        // Deduplicate by music_title and aggregate
        const seen = new Map<string, SoundItem>();
        for (const v of data) {
          const key = v.music_title!;
          const profile = profileMap.get(v.user_id);
          if (!seen.has(key)) {
            seen.set(key, {
              id: v.id,
              title: key,
              artist: profile?.display_name || profile?.username || "Original Sound",
              url: v.video_url,
              duration: v.duration || 30,
              useCount: v.view_count || 0,
              avatarUrl: profile?.avatar_url || undefined,
              videoCount: 1,
              creatorUsername: profile?.username || undefined,
            });
          } else {
            const existing = seen.get(key)!;
            existing.useCount += (v.view_count || 0);
            existing.videoCount = (existing.videoCount || 1) + 1;
          }
        }
        setSounds(Array.from(seen.values()));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (sound: SoundItem) => {
    if (playingId === sound.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = sound.url;
        audioRef.current.play().catch(() => {});
      }
      setPlayingId(sound.id);
    }
  };

  const handleSelect = (sound: SoundItem) => {
    audioRef.current?.pause();
    setPlayingId(null);
    onSelectSound(sound);
    onClose();
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const formatCount = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toString();
  };

  const filtered = search
    ? sounds.filter(s => 
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.artist.toLowerCase().includes(search.toLowerCase())
      )
    : sounds;

  const tabs: { id: Tab; label: string; icon: typeof TrendingUp }[] = [
    { id: "trending", label: "Trending", icon: TrendingUp },
    { id: "recent", label: "Recent", icon: Clock },
    { id: "favorites", label: "Favorites", icon: Heart },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed inset-0 z-[60] bg-background flex flex-col"
        >
          <audio ref={audioRef} preload="none" />

          {/* Header */}
          <div className="flex items-center gap-3 p-4 pt-12 border-b border-border">
            <button onClick={onClose}>
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <div className="flex-1">
              <span className="text-lg font-bold text-foreground">Sound Library</span>
              <p className="text-xs text-muted-foreground">{sounds.length} sounds available</p>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sounds or artists..."
                className="pl-10"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-4 pb-2">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Sound List */}
          <ScrollArea className="flex-1">
            <div className="px-4 pb-20">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Music2 className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-base font-medium">No sounds found</p>
                  <p className="text-sm mt-1">
                    {search ? "Try a different search" : "Sounds from uploaded videos will appear here"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((sound) => (
                    <motion.div
                      key={sound.id}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      {/* Play button / Avatar */}
                      <button
                        onClick={() => togglePlay(sound)}
                        className="relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                      >
                        {sound.avatarUrl ? (
                          <>
                            <img src={sound.avatarUrl} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              {playingId === sound.id ? (
                                <Pause className="w-5 h-5 text-white" />
                              ) : (
                                <Play className="w-5 h-5 ml-0.5 text-white" />
                              )}
                            </div>
                          </>
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${
                            playingId === sound.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}>
                            {playingId === sound.id ? (
                              <Pause className="w-5 h-5" />
                            ) : (
                              <Play className="w-5 h-5 ml-0.5" />
                            )}
                          </div>
                        )}
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0" onClick={() => handleSelect(sound)}>
                        <p className="text-sm font-semibold text-foreground truncate">
                          {sound.title}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate">
                            {sound.artist}
                            {sound.creatorUsername && sound.creatorUsername !== sound.artist && (
                              <span className="opacity-60"> @{sound.creatorUsername}</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {formatDuration(sound.duration)}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Video className="w-2.5 h-2.5" /> {formatCount(sound.videoCount || 0)} videos
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Play className="w-2.5 h-2.5" /> {formatCount(sound.useCount)}
                          </span>
                        </div>
                      </div>

                      {/* Use button */}
                      <Button
                        variant="glow"
                        size="sm"
                        onClick={() => handleSelect(sound)}
                        className="shrink-0 text-xs"
                      >
                        Use
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
