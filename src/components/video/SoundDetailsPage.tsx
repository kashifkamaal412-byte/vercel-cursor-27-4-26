import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, Music2, Camera, Upload } from "lucide-react";
import { Video } from "@/hooks/useVideos";
import { supabase } from "@/integrations/supabase/client";
import { resolveVideoUrls } from "@/lib/storageUrl";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface SoundDetailsPageProps {
  isOpen: boolean;
  onClose: () => void;
  musicTitle: string;
  video: Video;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

export const SoundDetailsPage = ({
  isOpen,
  onClose,
  musicTitle,
  video,
}: SoundDetailsPageProps) => {
  const navigate = useNavigate();
  const [soundVideos, setSoundVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalVideos, setTotalVideos] = useState(0);

  useEffect(() => {
    if (!isOpen || !musicTitle) return;

    const fetchSoundVideos = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("videos")
          .select("id, thumbnail_url, video_url, view_count, like_count, caption, user_id, duration")
          .eq("is_public", true)
          .eq("music_title", musicTitle)
          .order("view_count", { ascending: false })
          .limit(30);

        if (!error && data) {
          const resolved = await resolveVideoUrls(data as any);
          setSoundVideos(resolved);
          setTotalVideos(resolved.length);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetchSoundVideos();
  }, [isOpen, musicTitle]);

  const handleUseSound = () => {
    onClose();
    navigate("/create", {
      state: {
        preloadedMusic: musicTitle,
        musicUrl: video.video_url,
        soundMode: true,
      },
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
          {/* Header */}
          <div className="flex items-center gap-3 p-4 pt-12 border-b border-border">
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}>
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </motion.button>
            <span className="text-lg font-bold text-foreground">Sound</span>
          </div>

          {/* Sound Info Banner */}
          <div className="p-4 flex items-center gap-4 border-b border-border">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary via-accent to-primary overflow-hidden flex-shrink-0 flex items-center justify-center">
              {video.profile?.avatar_url ? (
                <img src={video.profile.avatar_url} alt="Sound" className="w-full h-full object-cover" />
              ) : (
                <Music2 className="w-8 h-8 text-primary-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-foreground truncate">{musicTitle}</h2>
              <p className="text-sm text-muted-foreground truncate">
                {video.profile?.display_name || video.profile?.username || "Original Sound"}
              </p>
            </div>
          </div>

          {/* Use Sound Button - YouTube style */}
          <div className="p-4 border-b border-border">
            <Button
              variant="glow"
              className="w-full py-5 text-base font-bold gap-2"
              onClick={handleUseSound}
            >
              <Camera className="w-5 h-5" />
              Use This Sound
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Music2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {video.duration ? formatDuration(video.duration) : "0:30"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {formatNumber(totalVideos)} videos
              </span>
            </div>
          </div>

          {/* Viral Video Grid */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : soundVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Music2 className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">No videos with this sound yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {soundVideos.map((sv) => (
                  <motion.div
                    key={sv.id}
                    whileTap={{ scale: 0.97 }}
                    className="relative aspect-[9/16] rounded-md overflow-hidden bg-muted"
                  >
                    {sv.thumbnail_url ? (
                      <img src={sv.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Play className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
                      <Play className="w-3 h-3 text-white fill-white" />
                      <span className="text-[10px] font-semibold text-white">
                        {formatNumber(sv.view_count || 0)}
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
