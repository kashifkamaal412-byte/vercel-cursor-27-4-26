import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, Music2 } from "lucide-react";
import { Sound } from "@/hooks/useSoundLibrary";
import { supabase } from "@/integrations/supabase/client";
import { resolveVideoUrls } from "@/lib/storageUrl";

interface SoundVideosSheetProps {
  sound: Sound;
  isOpen: boolean;
  onClose: () => void;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

export const SoundVideosSheet = ({ sound, isOpen, onClose }: SoundVideosSheetProps) => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("videos")
          .select("id, thumbnail_url, video_url, view_count, like_count, caption, user_id, duration")
          .eq("is_public", true)
          .eq("music_title", sound.title)
          .order("view_count", { ascending: false })
          .limit(50);

        if (!error && data) {
          const resolved = await resolveVideoUrls(data as any);
          setVideos(resolved);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [isOpen, sound.title]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed inset-0 z-[60] bg-background flex flex-col"
        >
          <div className="flex items-center gap-3 p-4 pt-12 border-b border-border">
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}>
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </motion.button>
            <div>
              <span className="text-lg font-bold text-foreground">{sound.title}</span>
              <p className="text-xs text-muted-foreground">
                {formatNumber(sound.use_count)} videos
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Music2 className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">No videos with this sound yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {videos.map((v) => (
                  <motion.div
                    key={v.id}
                    whileTap={{ scale: 0.97 }}
                    className="relative aspect-[9/16] rounded-md overflow-hidden bg-muted"
                  >
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Play className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
                      <Play className="w-3 h-3 text-white fill-white" />
                      <span className="text-[10px] font-semibold text-white">
                        {formatNumber(v.view_count || 0)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
