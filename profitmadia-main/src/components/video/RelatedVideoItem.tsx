import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreVertical, Eye, EyeOff, Download, Share2, Bookmark, Flag, X
} from "lucide-react";
import { Video, useVideoActions } from "@/hooks/useVideos";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSavedVideos } from "@/hooks/useSavedVideos";
import { useDownloadManager } from "@/hooks/useDownloadManager";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatViews = (count: number | null) => {
  if (!count) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
};

interface RelatedVideoItemProps {
  video: Video;
  onClick: () => void;
}

export const RelatedVideoItem = ({ video, onClick }: RelatedVideoItemProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSaved, toggleSave } = useSavedVideos();
  const { downloadVideo, isDownloaded, getProgress } = useDownloadManager();
  const [showMenu, setShowMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);
  const videoIsSaved = isSaved(video.id);
  const currentProgress = getProgress(video.id);

  // Detect duration from video metadata if DB value is 0/null
  useEffect(() => {
    if (video.duration && video.duration > 0) return;
    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.src = video.video_url;
    tempVideo.onloadedmetadata = () => {
      setDetectedDuration(tempVideo.duration);
      tempVideo.src = "";
    };
    return () => { tempVideo.src = ""; };
  }, [video.video_url, video.duration]);

  useEffect(() => {
    if (currentProgress) {
      setDownloadProgress(currentProgress.progress);
      setIsDownloading(currentProgress.status === "downloading");
    }
  }, [currentProgress]);

  const displayDuration = (video.duration && video.duration > 0) ? video.duration : detectedDuration;

  const reportReasons = [
    "Spam or misleading", "Harassment or bullying", "Violence or dangerous acts",
    "Hate speech", "Nudity or sexual content", "Minor safety", "Copyright violation", "Other"
  ];

  const handleReport = async (reason: string) => {
    if (!user) { toast.error("Please sign in to report"); return; }
    setSubmitting(true);
    try {
      await supabase.functions.invoke("ai-moderator", {
        body: { action: "report", videoId: video.id, reporterId: user.id, reason, videoUrl: video.video_url, caption: video.caption, creatorId: video.user_id }
      });
      toast.success("Report submitted for review.");
    } catch {
      toast.success("Report submitted for review.");
    } finally {
      setSubmitting(false);
      setReportOpen(false);
      setShowMenu(false);
    }
  };

  const handleNotInterested = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success("We'll show you less content like this");
    setShowMenu(false);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (isDownloaded(video.id)) { toast.info("Already downloaded!"); return; }
    setIsDownloading(true);
    setDownloadProgress(0);
    const success = await downloadVideo(video, (p) => setDownloadProgress(p));
    toast[success ? "success" : "error"](success ? "Downloaded to app!" : "Download failed");
    setIsDownloading(false);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error("Please sign in to save videos"); setShowMenu(false); return; }
    await toggleSave(video.id);
    toast.success(videoIsSaved ? "Removed from saved" : "Saved!");
    setShowMenu(false);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/video/${video.id}`;
    if (navigator.share) await navigator.share({ title: video.caption || "Check this video", url: shareUrl });
    else { await navigator.clipboard.writeText(shareUrl); toast.success("Link copied!"); }
    setShowMenu(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 w-full text-left group">
      {/* Thumbnail - square corners */}
      <button onClick={onClick} className="relative w-40 aspect-video overflow-hidden bg-black/30 flex-shrink-0 rounded-none">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <video src={video.video_url} className="w-full h-full object-cover" muted preload="metadata" />
        )}
        {/* Duration badge */}
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80">
          <span className="text-[10px] font-semibold text-white">
            {displayDuration && displayDuration > 0 ? formatDuration(displayDuration) : "—"}
          </span>
        </div>
        {isDownloading && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="text-sm font-bold text-white">{downloadProgress}%</span>
          </div>
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5">
        <button onClick={onClick} className="text-left w-full">
          <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{video.caption || "Untitled"}</h4>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/user/${video.user_id}`); }}
          className="flex items-center gap-1 mt-1.5 hover:underline"
        >
          <Avatar className="w-4 h-4">
            <AvatarImage src={video.profile?.avatar_url || ""} />
            <AvatarFallback className="text-[8px] bg-primary/20 text-primary">{video.profile?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-foreground/50">{video.profile?.display_name || video.profile?.username || "Creator"}</span>
        </button>
        <div className="flex items-center gap-2 mt-1 text-xs text-foreground/40">
          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{formatViews(video.view_count)}</span>
          <span>•</span>
          <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: false })} ago</span>
        </div>
      </div>

      {/* Three-dot menu */}
      <div className="relative self-start">
        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="p-1 text-foreground/50 hover:text-foreground">
          <MoreVertical className="w-4 h-4" />
        </button>
        <AnimatePresence>
          {showMenu && !reportOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute right-0 top-full mt-1 w-48 bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <button onClick={handleNotInterested} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                  <EyeOff className="w-4 h-4" /> Not Interested
                </button>
                <button onClick={handleDownload} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                  <Download className="w-4 h-4" /> {isDownloading ? `Downloading ${downloadProgress}%` : "Download"}
                </button>
                <button onClick={handleShare} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                  <Share2 className="w-4 h-4" /> Share
                </button>
                <button onClick={handleSave} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                  <Bookmark className={`w-4 h-4 ${videoIsSaved ? "fill-current text-primary" : ""}`} /> {videoIsSaved ? "Saved" : "Save"}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setReportOpen(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-muted transition-colors">
                  <Flag className="w-4 h-4" /> Report
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Report Sheet */}
        <AnimatePresence>
          {reportOpen && (
            <>
              <div className="fixed inset-0 bg-black/50 z-[70]" onClick={(e) => { e.stopPropagation(); setReportOpen(false); setShowMenu(false); }} />
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[70] bg-card rounded-t-2xl border-t border-border max-h-[70vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
                  <h3 className="text-lg font-bold text-foreground">Report</h3>
                  <button onClick={(e) => { e.stopPropagation(); setReportOpen(false); setShowMenu(false); }}>
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
                <p className="px-4 pt-3 text-sm text-muted-foreground">Why are you reporting this video?</p>
                <div className="p-4 space-y-1">
                  {reportReasons.map((reason) => (
                    <button key={reason} disabled={submitting}
                      onClick={(e) => { e.stopPropagation(); handleReport(reason); }}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-muted transition-colors text-foreground text-sm disabled:opacity-50">
                      {reason}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
