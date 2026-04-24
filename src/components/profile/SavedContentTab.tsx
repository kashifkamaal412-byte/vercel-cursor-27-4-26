import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Play, Film, Grid3X3, MoreHorizontal } from "lucide-react";
import { Video } from "@/hooks/useVideos";
import { ContentSubTabs, getVideoSubTabs, SubTabId } from "./ContentSubTabs";

interface SavedContentTabProps {
  savedVideos: Video[];
  onVideoClick: (video: Video, index: number) => void;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const SavedContentTab = ({ savedVideos, onVideoClick }: SavedContentTabProps) => {
  const [subTab, setSubTab] = useState<SubTabId>("shorts");

  const savedShorts = savedVideos.filter((v) => v.video_type === "short" || !v.video_type);
  const savedLong = savedVideos.filter((v) => v.video_type === "long");

  const tabs = getVideoSubTabs(savedShorts.length, savedLong.length);
  const activeVideos = subTab === "shorts" ? savedShorts : savedLong;

  return (
    <div>
      <ContentSubTabs tabs={tabs} activeTab={subTab} onTabChange={setSubTab} />

      {activeVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
            <Bookmark className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            No Saved {subTab === "shorts" ? "Shorts" : "Long Videos"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Save {subTab === "shorts" ? "shorts" : "long videos"} to watch later
          </p>
        </div>
      ) : subTab === "long" ? (
        <div className="flex flex-col">
          {activeVideos.map((video, index) => (
            <div
              key={video.id}
              className="flex p-3 gap-3 border-b border-border/10 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => onVideoClick(video, index)}
            >
              <div className="relative w-40 h-24 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                {video.duration > 0 && (
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded-sm">
                    {formatDuration(video.duration)}
                  </div>
                )}
              </div>
              <div className="flex flex-col flex-1">
                <h4 className="text-sm font-medium text-foreground line-clamp-2">{video.caption || "Untitled"}</h4>
                <span className="text-xs text-muted-foreground mt-1">{formatNumber(video.view_count || 0)} plays</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-0.5 p-0.5">
          {activeVideos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className="aspect-[9/16] relative overflow-hidden cursor-pointer bg-muted"
              onClick={() => onVideoClick(video, index)}
            >
              {video.thumbnail_url ? (
                <img src={video.thumbnail_url} alt={video.caption || ""} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Grid3X3 className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-1 left-1 flex items-center gap-1 text-xs text-white font-medium">
                <Play className="w-3 h-3 fill-white" /> {formatNumber(video.view_count || 0)}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};
