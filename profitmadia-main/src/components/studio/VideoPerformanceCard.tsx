import { Eye, Heart, MessageCircle, Share2, Bookmark, Gift, Clock, TrendingUp, Users } from "lucide-react";
import { VideoPerformance } from "@/hooks/useCreatorAnalytics";
import { formatDistanceToNow } from "date-fns";

interface VideoPerformanceCardProps {
  video: VideoPerformance;
  rank?: number;
  highlight?: "views" | "likes" | "gifts";
}

export const VideoPerformanceCard = ({ video, rank, highlight }: VideoPerformanceCardProps) => {
  const avgWatchTime = video.view_count > 0 
    ? Math.round((video.total_watch_time || 0) / video.view_count) 
    : 0;

  const formatWatchTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className={`glass rounded-xl p-4 relative overflow-hidden ${
      highlight ? "ring-2 ring-primary/50" : ""
    }`}>
      {rank && (
        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
          {rank}
        </div>
      )}
      
      {video.is_trending && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-accent/20 text-accent px-2 py-0.5 rounded-full text-xs">
          <TrendingUp className="w-3 h-3" />
          Trending
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : video.video_url ? (
            <video
              src={`${video.video_url}#t=0.5`}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
              playsInline
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground text-xs">No thumb</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate mb-1">
            {video.caption || "Untitled video"}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
          </p>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className={`flex items-center gap-1 ${highlight === "views" ? "text-primary" : "text-muted-foreground"}`}>
              <Eye className="w-3 h-3" />
              <span>{video.view_count.toLocaleString()}</span>
            </div>
            <div className={`flex items-center gap-1 ${highlight === "likes" ? "text-accent" : "text-muted-foreground"}`}>
              <Heart className="w-3 h-3" />
              <span>{video.like_count.toLocaleString()}</span>
            </div>
            <div className={`flex items-center gap-1 ${highlight === "gifts" ? "text-secondary" : "text-muted-foreground"}`}>
              <Gift className="w-3 h-3" />
              <span>{(video.gift_count || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageCircle className="w-3 h-3" />
              <span>{video.comment_count}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Share2 className="w-3 h-3" />
              <span>{video.share_count}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Bookmark className="w-3 h-3" />
              <span>{video.save_count}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border/50 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Avg: {formatWatchTime(avgWatchTime)}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>+{video.followers_gained} fans</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
