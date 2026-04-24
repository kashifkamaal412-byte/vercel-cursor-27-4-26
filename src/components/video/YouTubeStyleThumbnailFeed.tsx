import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  ArrowLeft,
  Flame,
  Upload,
  Search,
  Bell,
  BadgeCheck,
  Eye,
  MoreVertical,
  Download,
  Share2,
  Bookmark,
  X,
  ChevronRight,
  EyeOff,
  Flag,
  Lock,
  Globe,
  BellOff,
  Trash2,
  UserX,
} from "lucide-react";
import { Video, useVideoActions } from "@/hooks/useVideos";
import { useSavedVideos } from "@/hooks/useSavedVideos";
import { useDownloadManager } from "@/hooks/useDownloadManager";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThreeDotMenu } from "./ThreeDotMenu";

interface YouTubeStyleThumbnailFeedProps {
  longVideos: Video[];
  shortVideos: Video[];
  loading: boolean;
  onBack: () => void;
  onLongVideoClick: (video: Video) => void;
  onShortVideoClick: (video: Video) => void;
}

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
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M plays`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K plays`;
  return `${count} plays`;
};

const formatTimeAgo = (date: string) => formatDistanceToNow(new Date(date), { addSuffix: false });

export const YouTubeStyleThumbnailFeed = ({
  longVideos,
  shortVideos,
  loading,
  onBack,
  onLongVideoClick,
  onShortVideoClick,
}: YouTubeStyleThumbnailFeedProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/10 md:static md:border-0">
        <div className="flex items-center justify-between px-4 pt-2 md:pt-2 pb-2 md:max-w-6xl md:mx-auto">
          <button onClick={onBack} className="p-2 -ml-2 md:hover:bg-muted md:rounded-lg md:transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20"
          >
            <Upload className="w-4 h-4 text-white" />
            <span className="text-xs font-semibold text-white">Upload, Watch & Earn</span>
          </motion.button>
          <div className="flex items-center gap-3">
            <button className="p-2" onClick={() => navigate("/discover")}>
              <Search className="w-5 h-5 text-foreground" />
            </button>
            <button className="p-2 relative">
              <Bell className="w-5 h-5 text-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-0 md:max-w-6xl md:mx-auto md:px-4 md:py-4">
          {(() => {
            // Interleave: 3 long videos → shorts carousel → 3 long → shorts → repeat
            const CHUNK_SIZE = 3;
            const chunks: JSX.Element[] = [];
            let longIdx = 0;
            let sectionCount = 0;

            while (longIdx < longVideos.length) {
              const chunk = longVideos.slice(longIdx, longIdx + CHUNK_SIZE);
              chunks.push(
                <div key={`long-${longIdx}`} className="md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
                  {chunk.map((video, i) => (
                    <LongVideoCard
                      key={video.id}
                      video={video}
                      onClick={() => onLongVideoClick(video)}
                      index={longIdx + i}
                    />
                  ))}
                </div>
              );
              longIdx += CHUNK_SIZE;
              sectionCount++;

              // After every chunk, alternate between shorts and styled-long carousels
              if (shortVideos.length > 0) {
                if (sectionCount % 2 === 1) {
                  // Shorts carousel
                  chunks.push(
                    <div key={`shorts-${longIdx}`} className="py-4 space-y-3">
                      <div className="flex items-center gap-3 px-4 md:px-0">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                            <Flame className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-base font-bold text-foreground">Short Videos</span>
                        </div>
                      </div>
                      <div className="overflow-x-auto scrollbar-hide">
                        <div className="flex gap-3 px-4 md:px-0 pb-2">
                          {shortVideos.slice(0, 10).map((video, index) => (
                            <ShortVideoCard
                              key={video.id}
                              video={video}
                              onClick={() => onShortVideoClick(video)}
                              index={index}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Styled long videos carousel (smaller, scrollable like shorts)
                  const styledLongs = longVideos.filter((_, i) => i >= longIdx).slice(0, 6);
                  if (styledLongs.length > 0) {
                    chunks.push(
                      <div key={`styled-long-${longIdx}`} className="py-4 space-y-3">
                        <div className="flex items-center gap-3 px-4 md:px-0">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                              <Play className="w-4 h-4 text-white fill-white" />
                            </div>
                            <span className="text-base font-bold text-foreground">More Videos</span>
                          </div>
                        </div>
                        <div className="overflow-x-auto scrollbar-hide">
                          <div className="flex gap-3 px-4 md:px-0 pb-2">
                            {styledLongs.map((video, index) => (
                              <motion.button
                                key={video.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => onLongVideoClick(video)}
                                className="flex-shrink-0 text-left group"
                              >
                                <div className="relative w-48 aspect-video rounded-xl overflow-hidden bg-black/20">
                                  {video.thumbnail_url ? (
                                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                                  ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                      <Play className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                  )}
                                  {video.duration && video.duration > 0 && (
                                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80">
                                      <span className="text-[9px] font-semibold text-white">{formatDuration(video.duration)}</span>
                                    </div>
                                  )}
                                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
                                </div>
                                <h4 className="text-[11px] font-semibold text-foreground line-clamp-1 mt-1.5 w-48">{video.caption || "Untitled"}</h4>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                  <Eye className="w-2.5 h-2.5" />
                                  <span>{formatViews(video.view_count)}</span>
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }
                }
              }
            }

            // If no long videos but have shorts
            if (longVideos.length === 0 && shortVideos.length > 0) {
              chunks.push(
                <div key="shorts-only" className="py-4 space-y-3">
                  <div className="flex items-center gap-3 px-4 md:px-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                        <Flame className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-base font-bold text-foreground">Short Videos</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex gap-3 px-4 md:px-0 pb-2">
                      {shortVideos.slice(0, 10).map((video, index) => (
                        <ShortVideoCard
                          key={video.id}
                          video={video}
                          onClick={() => onShortVideoClick(video)}
                          index={index}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return chunks;
          })()}
        </div>
      )}
    </div>
  );
};

// Long Video Card - rectangular thumbnail
const LongVideoCard = ({ video, onClick, index }: { video: Video; onClick: () => void; index: number }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { deleteVideo } = useVideoActions();
  const { isSaved, toggleSave } = useSavedVideos();
  const { downloadVideo, isDownloaded, getProgress } = useDownloadManager();
  const [showMenu, setShowMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [realDuration, setRealDuration] = useState<number | null>(null);
  const videoIsSaved = isSaved(video.id);
  const currentProgress = getProgress(video.id);
  const isOwner = user?.id === video.user_id;

  const displayDuration = realDuration || (video.duration && video.duration > 0 ? video.duration : null);

  const reportReasons = [
    "Spam or misleading", "Harassment or bullying", "Violence or dangerous acts",
    "Hate speech", "Nudity or sexual content", "Minor safety", "Copyright violation", "Other",
  ];

  const handleReport = async (reason: string) => {
    if (!user) { toast.error("Please sign in to report"); return; }
    setSubmitting(true);
    try {
      await supabase.functions.invoke("ai-moderator", {
        body: { action: "report", videoId: video.id, reporterId: user.id, reason, videoUrl: video.video_url, caption: video.caption, creatorId: video.user_id },
      });
      toast.success("Report submitted for review.");
    } catch { toast.success("Report submitted for review."); }
    finally { setSubmitting(false); setReportOpen(false); setShowMenu(false); }
  };

  const handleNotInterested = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success("We'll show you less content like this");
    setShowMenu(false);
  };

  const handleTogglePrivacy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !isOwner) return;
    const { error } = await supabase
      .from("videos")
      .update({ is_public: !video.is_public })
      .eq("id", video.id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to update privacy");
      return;
    }
    toast.success(video.is_public ? "Video moved to private" : "Video is now public");
    setShowMenu(false);
  };

  const handleToggleComments = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !isOwner) return;
    const { error } = await supabase
      .from("videos")
      .update({ allow_comments: !video.allow_comments })
      .eq("id", video.id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to update comments setting");
      return;
    }
    toast.success(video.allow_comments ? "Comments turned off" : "Comments turned on");
    setShowMenu(false);
  };

  const handleDeleteVideo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !isOwner) return;
    const ok = await deleteVideo(video.id);
    if (!ok) {
      toast.error("Failed to delete video");
      return;
    }
    toast.success("Video deleted");
    setShowMenu(false);
  };

  const handleBlockUser = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || isOwner) return;
    const { error } = await supabase
      .from("blocked_users")
      .insert({ blocker_id: user.id, blocked_id: video.user_id });
    if (error) {
      toast.error("Failed to block user");
      return;
    }
    toast.success("User blocked");
    setShowMenu(false);
  };

  useEffect(() => {
    if (currentProgress) {
      setDownloadProgress(currentProgress.progress);
      setIsDownloading(currentProgress.status === "downloading");
    }
  }, [currentProgress]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation(); setShowMenu(false);
    if (isDownloaded(video.id)) { toast.info("Already downloaded!"); return; }
    setIsDownloading(true); setDownloadProgress(0);
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="w-full"
    >
      {/* Thumbnail - rectangular, not round */}
      <button onClick={onClick} className="relative w-full aspect-video overflow-hidden bg-black group rounded-none md:rounded-xl">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading={index < 6 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={index < 3 ? "high" : "auto"}
          />
        ) : (
          <video
            src={`${video.video_url}#t=0.1`}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.duration && v.duration > 0 && isFinite(v.duration) && !realDuration) {
                setRealDuration(v.duration);
              }
            }}
          />
        )}
        {/* Hidden video to capture real duration when thumbnail exists */}
        {video.thumbnail_url && !displayDuration && (
          <video
            src={`${video.video_url}#t=0.1`}
            className="hidden"
            muted
            preload="metadata"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.duration && v.duration > 0 && isFinite(v.duration)) {
                setRealDuration(v.duration);
              }
            }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <div className="w-16 h-16 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
        </div>
        {displayDuration && displayDuration > 0 && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/90">
            <span className="text-[10px] font-semibold text-white">
              {formatDuration(displayDuration)}
            </span>
          </div>
        )}
        {isDownloading && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-lg font-bold text-white">{downloadProgress}%</span>
            </div>
          </div>
        )}
      </button>

      {/* Info */}
      <div className="flex gap-3 px-3 py-3">
        <button onClick={(e) => { e.stopPropagation(); navigate(`/user/${video.user_id}`); }} className="flex-shrink-0">
          <Avatar className="w-10 h-10 border-2 border-primary/30">
            <AvatarImage src={video.profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
              {video.profile?.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm line-clamp-2 leading-snug">
            {video.caption || "Untitled Video"}
          </h3>
          <button onClick={(e) => { e.stopPropagation(); navigate(`/user/${video.user_id}`); }}
            className="flex items-center gap-1 mt-1 text-xs text-foreground/60 hover:underline">
            <span className="font-medium">{video.profile?.display_name || video.profile?.username || "Creator"}</span>
            <BadgeCheck className="w-3.5 h-3.5 text-primary fill-primary/20" />
          </button>
          <div className="flex items-center text-xs text-foreground/50 mt-0.5">
            <span>{formatViews(video.view_count)}</span>
            <span className="mx-1">•</span>
            <span>{formatTimeAgo(video.created_at)} ago</span>
          </div>
        </div>
        <div className="relative self-start">
          <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1 text-foreground/50 hover:text-foreground rounded-full hover:bg-muted transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
          <AnimatePresence>
            {showMenu && !reportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                <motion.div initial={{ opacity: 0, scale: 0.9, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="absolute right-0 top-full mt-1 w-48 bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  {isOwner ? (
                    <>
                      <button onClick={handleTogglePrivacy} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                        {video.is_public ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />} {video.is_public ? "Make Private" : "Make Public"}
                      </button>
                      <button onClick={handleToggleComments} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                        {video.allow_comments ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />} {video.allow_comments ? "Turn Off Comments" : "Turn On Comments"}
                      </button>
                      <button onClick={handleDownload} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                        <Download className="w-4 h-4" /> {isDownloading ? `Downloading ${downloadProgress}%` : "Download"}
                      </button>
                      <button onClick={handleShare} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                        <Share2 className="w-4 h-4" /> Share
                      </button>
                      <button onClick={handleDeleteVideo}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-muted transition-colors">
                        <Trash2 className="w-4 h-4" /> Delete Video
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleNotInterested} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                        <EyeOff className="w-4 h-4" /> Not Interested
                      </button>
                      <button onClick={handleBlockUser} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                        <UserX className="w-4 h-4" /> Block User
                      </button>
                      <button onClick={handleDownload} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                        <Download className="w-4 h-4" /> {isDownloading ? `Downloading ${downloadProgress}%` : "Download"}
                      </button>
                      <button onClick={handleShare} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                        <Share2 className="w-4 h-4" /> Share
                      </button>
                      <button onClick={handleSave} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                        <Bookmark className={`w-4 h-4 ${videoIsSaved ? "fill-current text-primary" : ""}`} />
                        {videoIsSaved ? "Saved" : "Save"}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setReportOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-muted transition-colors">
                        <Flag className="w-4 h-4" /> Report
                      </button>
                    </>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {reportOpen && (
              <>
                <div className="fixed inset-0 bg-black/50 z-[70]" onClick={(e) => { e.stopPropagation(); setReportOpen(false); setShowMenu(false); }} />
                <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 z-[70] bg-card rounded-t-2xl border-t border-border max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
                    <h3 className="text-lg font-bold text-foreground">Report</h3>
                    <button onClick={(e) => { e.stopPropagation(); setReportOpen(false); setShowMenu(false); }}>
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  <p className="px-4 pt-3 text-sm text-muted-foreground">Why are you reporting this video?</p>
                  <div className="p-4 space-y-1">
                    {reportReasons.map((reason) => (
                      <button key={reason} disabled={submitting} onClick={(e) => { e.stopPropagation(); handleReport(reason); }}
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
      </div>
    </motion.div>
  );
};

// Short Video Card
const ShortVideoCard = ({ video, onClick, index }: { video: Video; onClick: () => void; index: number }) => {
  const isNew = index === 0;
  const [realDuration, setRealDuration] = useState<number | null>(null);
  const displayDuration = realDuration || (video.duration && video.duration > 0 ? video.duration : null);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="flex-shrink-0 text-left group"
    >
      <div className="relative w-32 aspect-[9/16] rounded-xl overflow-hidden bg-black/20">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading={index < 6 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={index < 3 ? "high" : "auto"}
          />
        ) : (
          <video
            src={video.video_url}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.duration && v.duration > 0 && isFinite(v.duration) && !realDuration) {
                setRealDuration(v.duration);
              }
            }}
          />
        )}
        {/* Hidden video to capture real duration when thumbnail exists */}
        {video.thumbnail_url && !displayDuration && (
          <video
            src={`${video.video_url}#t=0.1`}
            className="hidden"
            muted
            preload="metadata"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.duration && v.duration > 0 && isFinite(v.duration)) {
                setRealDuration(v.duration);
              }
            }}
          />
        )}
        <div className="absolute top-2 left-2 z-20" onClick={(e) => e.stopPropagation()}>
          <ThreeDotMenu video={video} />
        </div>
        {isNew && (
          <div className="absolute top-2 left-10 px-1.5 py-0.5 rounded bg-destructive">
            <span className="text-[10px] font-bold text-destructive-foreground">New</span>
          </div>
        )}
        {displayDuration && displayDuration > 0 && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80">
            <span className="text-[9px] font-semibold text-white">
              {formatDuration(displayDuration)}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <h4 className="text-[11px] font-semibold text-white line-clamp-2 leading-tight">{video.caption || "Untitled"}</h4>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-white/70">
            <Eye className="w-2.5 h-2.5" />
            <span>{formatViews(video.view_count)}</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
};
