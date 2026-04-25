import {
  Bell,
  MoreVertical,
  Grid3X3,
  Film,
  Radio,
  Play,
  UserPlus,
  UserCheck,
  Share2,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  Settings,
  LogIn,
  Gift,
  BarChart3,
  Bookmark,
  Download,
  WifiOff,
  MoreHorizontal,
  Globe,
  Users,
  Lock,
  Trash2,
  Pin,
  Edit,
  BarChart,
  X,
  Search,
  Filter,
  CheckCheck,
  Eye,
  Package,
  FileText,
  Pause,
  Maximize2,
  Minimize2,
  RotateCw,
  Volume2,
  VolumeX,
  Camera,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserVideos, useUserProfile } from "@/hooks/useUserVideos";
import { useVideoActions, Video, VideoStatus } from "@/hooks/useVideos";
import { useSavedVideos } from "@/hooks/useSavedVideos";
import { useDrafts } from "@/hooks/useDrafts";
import { useDownloadManager } from "@/hooks/useDownloadManager";
import { useProfileShare } from "@/hooks/useProfileShare";
import { useOfflineDetection } from "@/hooks/useOfflineDetection";
import { VideoStatusBadge } from "@/components/profile/VideoStatusBadge";
import { AccountAgeBadge } from "@/components/profile/AccountAgeBadge";
import { CreatorScoreBadge } from "@/components/profile/CreatorScoreBadge";
import { ActivityStatus } from "@/components/profile/ActivityStatus";
import { GiftHistory } from "@/components/gifts/GiftHistory";
import { NotificationSheet } from "@/components/notifications/NotificationSheet";
import { OfflineVideoPlayer } from "@/components/downloads/OfflineVideoPlayer";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Feed components for in-profile playback
import { ProfilePostsTab } from "@/components/posts/ProfilePostsTab";
import { RealVideoFeed } from "@/components/video/RealVideoFeed";
import { WatchChatPlayer } from "@/components/video/WatchChatPlayer";

// Categorized sub-tab components
import { DraftsTab } from "@/components/profile/DraftsTab";
import { PrivateContentTab } from "@/components/profile/PrivateContentTab";
import { SavedContentTab } from "@/components/profile/SavedContentTab";

// Base tabs (always visible) - Videos and Posts tabs restored
const baseTabs = [
 { id: "shorts", label: "Shorts", icon: Grid3X3 },
 { id: "videos", label: "Videos", icon: Film },
 { id: "saved", label: "Saved", icon: Bookmark },
 { id: "live", label: "Live", icon: Radio },
 { id: "posts", label: "Posts", icon: FileText },
];
// Additional tabs for profile owner only
const ownerTabs = [
  { id: "private", label: "Private", icon: Lock },
  { id: "drafts", label: "Drafts", icon: Package },
];

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Mock data for preview mode (unchanged)
const mockProfile = {
  user_id: "mock-user",
  username: "creative_star",
  display_name: "Creative Star ✨",
  bio: "Digital Artist & Motion Designer 🎨 Creating stunning visuals",
  avatar_url: null,
  cover_url: null,
  website: "https://creative.design",
  trust_level: 4,
  creator_score: 850,
  activity_status: "active",
  total_followers: 12500,
  total_following: 890,
  total_likes: 45200,
  total_views: 128000,
  created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
};

const mockVideos: Video[] = [
  {
    id: "1",
    video_url: "",
    thumbnail_url: "https://picsum.photos/seed/v1/300/500",
    caption: "Amazing sunset timelapse",
    view_count: 15420,
    like_count: 892,
    comment_count: 45,
    share_count: 0,
    save_count: 0,
    gift_count: 120,
    status: "ready",
    video_type: "short",
    user_id: "mock",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    duration: 30,
    is_public: true,
    allow_comments: true,
    allow_duet: true,
    tags: null,
    music_title: null,
    description: null,
    external_link: null,
    location: null,
    age_restriction: "everyone",
    pinned_at: null,
  },
];

interface UnifiedProfileProps {
  isOwnProfilePage?: boolean;
}

// Full-screen user list modal with follow buttons (TikTok style)
const FullScreenUserList = ({
  title,
  users,
  loading,
  onClose,
  currentUserId,
}: {
  title: string;
  users: any[];
  loading: boolean;
  onClose: () => void;
  currentUserId?: string;
}) => {
  const navigate = useNavigate();
  const { followUser, unfollowUser, checkFollowing } = useVideoActions();
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({});
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Check follow status for all users
  useEffect(() => {
    if (!currentUserId || users.length === 0) return;
    const checkAll = async () => {
      const states: Record<string, boolean> = {};
      for (const u of users) {
        if (u.user_id !== currentUserId) {
          states[u.user_id] = await checkFollowing(u.user_id);
        }
      }
      setFollowStates(states);
    };
    checkAll();
  }, [users, currentUserId, checkFollowing]);

  const handleToggleFollow = async (userId: string) => {
    if (!currentUserId || followLoading[userId]) return;
    setFollowLoading((p) => ({ ...p, [userId]: true }));
    try {
      if (followStates[userId]) {
        await unfollowUser(userId);
        setFollowStates((p) => ({ ...p, [userId]: false }));
      } else {
        await followUser(userId);
        setFollowStates((p) => ({ ...p, [userId]: true }));
        toast.success("Now a fan!");
      }
    } catch {
      toast.error("Failed");
    }
    setFollowLoading((p) => ({ ...p, [userId]: false }));
  };

  const filteredUsers = searchQuery
    ? users.filter(
        (u) =>
          u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.username?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : users;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background"
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold">{title}</h2>
          <span className="text-sm text-muted-foreground">({users.length})</span>
        </div>
      </div>
      {/* Search */}
      <div className="px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="overflow-y-auto h-full pb-20">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{searchQuery ? "No results" : "No users found"}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredUsers.map((user) => (
              <div key={user.user_id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <div
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => {
                    navigate(`/profile/${user.user_id}`);
                    onClose();
                  }}
                >
                  <Avatar className="w-12 h-12 shrink-0">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                      {user.display_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{user.display_name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">@{user.username || "user"}</p>
                  </div>
                </div>
                {currentUserId && user.user_id !== currentUserId && (
                  <Button
                    variant={followStates[user.user_id] ? "outline" : "default"}
                    size="sm"
                    disabled={followLoading[user.user_id]}
                    onClick={() => handleToggleFollow(user.user_id)}
                    className="shrink-0 text-xs px-4"
                  >
                    {followStates[user.user_id] ? "Following" : "Follow"}
                  </Button>
                )}
                {currentUserId && user.user_id === currentUserId && (
                  <span className="text-xs text-muted-foreground px-2">You</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Video Detail Modal Component (unchanged)
const VideoDetailModal = ({
  video,
  isOpen,
  onClose,
  isOwnProfile,
  onUpdate,
}: {
  video: Video;
  isOpen: boolean;
  onClose: () => void;
  isOwnProfile: boolean;
  onUpdate: () => void;
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handlePin = async () => {
    if (!isOwnProfile) return;
    try {
      if (video.pinned_at) {
        await supabase.from("videos").update({ pinned_at: null }).eq("id", video.id);
        toast.success("Video unpinned");
      } else {
        const { count } = await supabase
          .from("videos")
          .select("*", { count: "exact", head: true })
          .eq("user_id", video.user_id)
          .not("pinned_at", "is", null);
        if (count && count >= 6) {
          toast.error("You can only pin up to 6 videos");
          return;
        }
        await supabase.from("videos").update({ pinned_at: new Date().toISOString() }).eq("id", video.id);
        toast.success("Video pinned");
      }
      onUpdate();
    } catch (error) {
      toast.error("Failed to update pin");
    }
  };

  const handlePrivacy = async (privacy: "public" | "friends" | "private") => {
    if (!isOwnProfile) return;
    try {
      const updates: any = {
        is_public: privacy === "public",
        privacy: privacy,
      };
      const { error } = await supabase.from("videos").update(updates).eq("id", video.id);
      if (error) throw error;
      toast.success(`Video set to ${privacy}`);
      onUpdate();
    } catch (error) {
      toast.error("Failed to update privacy");
    }
  };

  const handleDelete = async () => {
    if (!isOwnProfile || !confirm("Delete this video?")) return;
    try {
      await supabase.from("videos").delete().eq("id", video.id);
      toast.success("Video deleted");
      onUpdate();
      onClose();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleDownload = async () => {
    if (!video.video_url) return;
    try {
      const response = await fetch(video.video_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${video.caption || "video"}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Download failed");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            className="w-full max-w-4xl bg-card text-card-foreground rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/2 relative">
                {video.video_url ? (
                  <video
                    src={video.video_url}
                    controls
                    className="w-full h-full object-cover"
                    style={{ borderRadius: 0 }}
                  />
                ) : (
                  <img
                    src={video.thumbnail_url}
                    alt={video.caption}
                    className="w-full h-full object-cover"
                    style={{ borderRadius: 0 }}
                  />
                )}
                {video.duration && (
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.duration)}
                  </span>
                )}
              </div>
              <div className="md:w-1/2 p-6 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xl font-semibold line-clamp-2">{video.caption || "Untitled"}</h3>
                  {isOwnProfile && (
                    <button onClick={() => setMenuOpen(true)} className="p-2 rounded-full hover:bg-muted/50">
                      <MoreHorizontal className="w-6 h-6" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <span>{formatNumber(video.view_count || 0)} views</span>
                  <span>•</span>
                  <span>{formatTimeAgo(video.created_at)}</span>
                </div>
              </div>
            </div>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetContent side="bottom" className="bg-card border-t border-border">
                <SheetHeader>
                  <SheetTitle className="text-card-foreground">Video Options</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-2">
                  <button
                    onClick={() => {
                      handlePin();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <Pin className="w-5 h-5" /> {video.pinned_at ? "Unpin" : "Pin"}
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/edit-video/${video.id}`);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <Edit className="w-5 h-5" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/studio?video=${video.id}`);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <BarChart className="w-5 h-5" /> Analytics
                  </button>
                  <button
                    onClick={() => {
                      handleDownload();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <Download className="w-5 h-5" /> Download
                  </button>
                  <div className="border-t border-border my-2" />
                  <button
                    onClick={() => {
                      handlePrivacy("public");
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <Globe className="w-5 h-5" /> Public
                  </button>
                  <button
                    onClick={() => {
                      handlePrivacy("friends");
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <Users className="w-5 h-5" /> Friends
                  </button>
                  <button
                    onClick={() => {
                      handlePrivacy("private");
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <Lock className="w-5 h-5" /> Private
                  </button>
                  <div className="border-t border-border my-2" />
                  <button
                    onClick={() => {
                      handleDelete();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" /> Delete
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ========== SIMPLE DOWNLOADS SHEET WITH VIDEO PLAYER ==========
interface SimpleDownloadsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlayVideo?: (videoId: string, blobUrl: string) => void;
}

const SimpleDownloadsSheet = ({ open, onOpenChange, onPlayVideo }: SimpleDownloadsSheetProps) => {
  const { downloadedVideos, loading, getVideoUrl } = useDownloadManager();
  const [selectedVideo, setSelectedVideo] = useState<{ id: string; blobUrl: string; caption?: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (!open) {
      setSelectedVideo(null);
    }
  }, [open]);

  const handleVideoSelect = (videoId: string) => {
    const blobUrl = getVideoUrl(videoId);
    if (blobUrl) {
      const video = downloadedVideos.find((v) => v.videoId === videoId);
      setSelectedVideo({ id: videoId, blobUrl, caption: video?.caption });
    } else {
      toast.error("Video not found");
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const vol = value[0];
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
    if (vol === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleRotate = () => {
    toast.info("Rotate screen (demo)");
  };

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const handleVideoTap = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleClose = () => {
    setSelectedVideo(null);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] bg-card p-0 border-t border-border">
        {selectedVideo ? (
          <div className="relative w-full h-full flex flex-col bg-black">
            {/* Video player */}
            <div className="flex-1 relative" onClick={handleVideoTap}>
              <video
                ref={videoRef}
                src={selectedVideo.blobUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onClick={handleVideoTap}
              />

              {/* Controls overlay */}
              <AnimatePresence>
                {showControls && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 flex flex-col justify-between p-4"
                  >
                    {/* Top bar with back button */}
                    <div className="flex justify-between items-center">
                      <button onClick={handleClose} className="p-2 rounded-full bg-black/50 text-white">
                        <ArrowLeft className="w-6 h-6" />
                      </button>
                      <div className="flex gap-2">
                        <button onClick={toggleFullscreen} className="p-2 rounded-full bg-black/50 text-white">
                          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </button>
                        <button onClick={handleRotate} className="p-2 rounded-full bg-black/50 text-white">
                          <RotateCw className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Center controls */}
                    <div className="flex justify-center items-center gap-4">
                      <button onClick={() => handleSkip(-10)} className="p-3 rounded-full bg-black/50 text-white">
                        <span className="text-lg">⏪</span>
                      </button>
                      <button onClick={togglePlay} className="p-4 rounded-full bg-white text-black">
                        {playing ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                      </button>
                      <button onClick={() => handleSkip(10)} className="p-3 rounded-full bg-black/50 text-white">
                        <span className="text-lg">⏩</span>
                      </button>
                    </div>

                    {/* Bottom controls */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white text-sm">
                        <span>{formatDuration(currentTime)}</span>
                        <Slider
                          value={[currentTime]}
                          max={duration}
                          step={0.1}
                          onValueChange={handleSeek}
                          className="flex-1"
                        />
                        <span>{formatDuration(duration)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={toggleMute} className="text-white">
                          {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <Slider
                          value={[isMuted ? 0 : volume]}
                          max={1}
                          step={0.01}
                          onValueChange={handleVolumeChange}
                          className="w-24"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          // List of downloaded videos
          <div className="h-full bg-background">
            <SheetHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle>Downloads</SheetTitle>
                <button onClick={() => onOpenChange(false)} className="p-2 rounded-full hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </SheetHeader>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : downloadedVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-8">
                <Download className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No downloads yet</h3>
                <p className="text-sm text-muted-foreground">Download videos to watch them offline</p>
              </div>
            ) : (
              <div className="overflow-y-auto h-full pb-20">
                {downloadedVideos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center gap-3 p-3 border-b hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleVideoSelect(video.videoId)}
                  >
                    <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                      {video.thumbnail ? (
                        <img src={video.thumbnail} alt={video.caption} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium line-clamp-1">{video.caption || "Untitled"}</h4>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(video.duration || 0)} • {new Date(video.downloadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

// Main component
const UnifiedProfile = ({ isOwnProfilePage = false }: UnifiedProfileProps) => {
  const navigate = useNavigate();
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const isPreviewMode = searchParams.get("preview") === "true";

  const { user } = useAuth();

  const targetUserId = isOwnProfilePage ? user?.id : paramUserId;
  const isOwnProfile = user?.id === targetUserId;

  const { profile, loading: profileLoading } = useUserProfile(targetUserId || "");
  const { userVideos, loading: videosLoading, mutate: mutateVideos } = useUserVideos(targetUserId);
  const { followUser, unfollowUser, checkFollowing } = useVideoActions();

  const { savedVideos } = useSavedVideos();
  const { downloadedVideos, downloadVideo } = useDownloadManager();
  const { shareProfile, shareToWhatsApp, shareToFacebook, shareToTwitter, copyLink } = useProfileShare();
  const { isOnline: isNetworkOnline } = useOfflineDetection();

  const [activeTab, setActiveTab] = useState("shorts");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [giftHistoryOpen, setGiftHistoryOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [downloadsSheetOpen, setDownloadsSheetOpen] = useState(false);
  const [offlinePlayerVideo, setOfflinePlayerVideo] = useState<{
    id: string;
    blobUrl: string;
    caption?: string;
  } | null>(null);
  const { unreadCount } = useNotifications();
  const [liveStats, setLiveStats] = useState({
    total_views: 0,
    total_likes: 0,
    total_followers: 0,
    total_following: 0,
    total_gift_count: 0,
  });
  const [postLikesCount, setPostLikesCount] = useState(0);

  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [shortsPlayerOpen, setShortsPlayerOpen] = useState(false);
  const [shortsVideos, setShortsVideos] = useState<Video[]>([]);
  const [shortsPlayerIndex, setShortsPlayerIndex] = useState(0);
  const [menuVideo, setMenuVideo] = useState<Video | null>(null);

  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  const displayProfile = isPreviewMode ? mockProfile : profile;
  const displayVideos = isPreviewMode ? mockVideos : userVideos;

  // Counts for tabs (real counts)
  const shortsCount = displayVideos.filter(
    (v) => (v.video_type === "short" || !v.video_type) && v.is_public !== false,
  ).length;
  const videosCount = displayVideos.filter((v) => v.video_type === "long" && v.is_public !== false).length;
  const liveCount = displayVideos.filter((v) => v.video_type === "live" && v.is_public !== false).length;
  const privateCount = displayVideos.filter((v) => !v.is_public).length;
  const savedCount = isOwnProfile ? savedVideos.length : 0;
  const { drafts, loading: draftsLoading, deleteDraft } = useDrafts();
  const dropsCount = drafts.length;

  // Fetch actual post count from supabase
  const [postsCount, setPostsCount] = useState(0);
  useEffect(() => {
    if (!targetUserId) return;
    const fetchPostsCount = async () => {
      const query = supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", targetUserId);
      if (!isOwnProfile) query.eq("is_public", true);
      const { count } = await query;
      setPostsCount(count || 0);
    };
    fetchPostsCount();
  }, [targetUserId, isOwnProfile]);

  // Fetch post likes count
  useEffect(() => {
    if (!targetUserId) return;
    const fetchPostLikes = async () => {
      const { data } = await supabase
        .from("posts")
        .select("like_count")
        .eq("user_id", targetUserId)
        .eq("is_public", true);
      const total = (data || []).reduce((sum: number, p: any) => sum + (p.like_count || 0), 0);
      setPostLikesCount(total);
    };
    fetchPostLikes();
  }, [targetUserId]);

  // Total videos = public shorts + public long videos (NOT posts)
  const totalVideos = shortsCount + videosCount;
  const pinnedCount = displayVideos.filter((v) => v.pinned_at).length;

  // Fetch actual gift count
  useEffect(() => {
    if (!targetUserId || isPreviewMode) return;
    const fetchGiftCount = async () => {
      const { count } = await supabase
        .from("gifts")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", targetUserId);
      setLiveStats((prev) => ({ ...prev, total_gift_count: count || 0 }));
    };
    fetchGiftCount();
  }, [targetUserId, isPreviewMode]);

  // Sync stats
  useEffect(() => {
    if (displayProfile && !isPreviewMode) {
      setLiveStats((prev) => ({
        ...prev,
        total_views: (displayProfile as any).total_views || 0,
        total_likes: displayProfile.total_likes || 0,
        total_followers: displayProfile.total_followers || 0,
        total_following: displayProfile.total_following || 0,
      }));
    } else if (isPreviewMode) {
      setLiveStats({
        total_views: mockProfile.total_views,
        total_likes: mockProfile.total_likes,
        total_followers: mockProfile.total_followers,
        total_following: mockProfile.total_following,
        total_gift_count: 48,
      });
    }
  }, [displayProfile, isPreviewMode]);

  // Follow status
  useEffect(() => {
    if (user && targetUserId && !isOwnProfile && !isPreviewMode) {
      checkFollowing(targetUserId).then(setIsFollowing);
    }
  }, [user, targetUserId, isOwnProfile, isPreviewMode, checkFollowing]);

  // Realtime profile updates
  useEffect(() => {
    if (!targetUserId || isPreviewMode) return;
    const channel = supabase
      .channel(`profile-stats-${targetUserId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${targetUserId}` },
        (payload) => {
          const updated = payload.new as any;
          setLiveStats((prev) => ({
            ...prev,
            total_views: updated.total_views || 0,
            total_likes: updated.total_likes || 0,
            total_followers: updated.total_followers || 0,
            total_following: updated.total_following || 0,
          }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, isPreviewMode]);

  const handleFollow = async () => {
    if (!targetUserId || followLoading || !user) return;
    setFollowLoading(true);
    if (isFollowing) {
      await unfollowUser(targetUserId);
      setIsFollowing(false);
      setLiveStats((prev) => ({ ...prev, total_followers: Math.max(0, prev.total_followers - 1) }));
    } else {
      await followUser(targetUserId);
      setIsFollowing(true);
      setLiveStats((prev) => ({ ...prev, total_followers: prev.total_followers + 1 }));
    }
    setFollowLoading(false);
  };

  // Fetch followers
  const fetchFollowers = async () => {
    if (!targetUserId) return;
    setLoadingFollowers(true);
    try {
      const { data: followRows } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", targetUserId);
      const ids = (followRows || []).map((f: any) => f.follower_id);
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", ids);
        setFollowersList(profiles || []);
      } else {
        setFollowersList([]);
      }
    } catch (error) {
      console.error("Error fetching followers:", error);
      toast.error("Failed to load followers");
    } finally {
      setLoadingFollowers(false);
    }
  };

  // Fetch following
  const fetchFollowing = async () => {
    if (!targetUserId) return;
    setLoadingFollowing(true);
    try {
      const { data: followRows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", targetUserId);
      const ids = (followRows || []).map((f: any) => f.following_id);
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", ids);
        setFollowingList(profiles || []);
      } else {
        setFollowingList([]);
      }
    } catch (error) {
      console.error("Error fetching following:", error);
      toast.error("Failed to load following");
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleOpenFollowers = () => {
    fetchFollowers();
    setFollowersModalOpen(true);
  };

  const handleOpenFollowing = () => {
    fetchFollowing();
    setFollowingModalOpen(true);
  };

  // Trending videos
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const trendingVideos = useMemo(
    () =>
      [...displayVideos]
        .filter((v) => v.status === "ready" && v.video_type === "short" && new Date(v.created_at) >= oneWeekAgo)
        .sort((a, b) => (b.like_count || 0) + (b.view_count || 0) - ((a.like_count || 0) + (a.view_count || 0)))
        .slice(0, 3),
    [displayVideos],
  );

  const handlePinVideo = async (videoId: string, currentlyPinned: boolean) => {
    if (!isOwnProfile || !user) return;
    try {
      if (currentlyPinned) {
        await supabase.from("videos").update({ pinned_at: null }).eq("id", videoId);
        toast.success("Video unpinned");
      } else {
        const { count, error } = await supabase
          .from("videos")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .not("pinned_at", "is", null);
        if (error) throw error;
        if (count && count >= 6) {
          toast.error("You can only pin up to 6 videos");
          return;
        }
        await supabase.from("videos").update({ pinned_at: new Date().toISOString() }).eq("id", videoId);
        toast.success("Video pinned");
      }
      mutateVideos();
    } catch (error) {
      console.error("Error pinning video:", error);
      toast.error("Failed to update pin");
    }
  };

  const handleUpdatePrivacy = async (videoId: string, privacy: "public" | "friends" | "private") => {
    try {
      const updates: any = {
        is_public: privacy === "public",
        privacy: privacy,
      };
      const { error } = await supabase.from("videos").update(updates).eq("id", videoId);
      if (error) throw error;
      toast.success(`Video set to ${privacy}`);
      mutateVideos();
    } catch (error) {
      console.error("Error updating video privacy:", error);
      toast.error("Failed to update privacy");
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return;
    try {
      const { error } = await supabase.from("videos").delete().eq("id", videoId);
      if (error) throw error;
      toast.success("Video deleted");
      mutateVideos();
    } catch (error) {
      console.error("Error deleting video:", error);
      toast.error("Failed to delete video");
    }
  };

  const handleDownloadVideo = async (video: Video) => {
    if (!video.video_url) return;
    try {
      const success = await downloadVideo(video);
      if (!success) {
        toast.error("Download failed");
        return;
      }
      toast.success("Video downloaded and saved to library");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  // Modified getActiveContent with privacy filter
  const getActiveContent = (): Video[] => {
    let videos: Video[] = [];
    switch (activeTab) {
      case "shorts":
        videos = displayVideos.filter((v) => (v.video_type === "short" || !v.video_type) && v.is_public !== false);
        break;
      case "videos":
        videos = displayVideos.filter((v) => v.video_type === "long" && v.is_public !== false);
        break;
      case "saved":
        videos = isOwnProfile ? savedVideos : [];
        break;
      case "live":
        videos = displayVideos.filter((v) => v.video_type === "live" && v.is_public !== false);
        break;
      case "private":
        videos = displayVideos.filter((v) => !v.is_public);
        break;
      case "drafts":
        videos = [];
        break;
      case "posts":
        videos = [];
        break;
      default:
        videos = [];
    }
    return videos.sort((a, b) => {
      if (a.pinned_at && !b.pinned_at) return -1;
      if (!a.pinned_at && b.pinned_at) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const handleShare = async () => {
    if (!displayProfile) return;
    await shareProfile({
      userId: targetUserId || "",
      username: displayProfile.username,
      displayName: displayProfile.display_name,
    });
  };

  const handleVideoClick = (video: Video, index: number) => {
    if (isPreviewMode) return;
    if (video.video_type === "short" || !video.video_type) {
      const shorts = displayVideos.filter((v) => (v.video_type === "short" || !v.video_type) && v.is_public !== false);
      const clickedIdx = shorts.findIndex((v) => v.id === video.id);
      const reordered = clickedIdx > 0 ? [...shorts.slice(clickedIdx), ...shorts.slice(0, clickedIdx)] : shorts;
      setShortsVideos(reordered);
      setShortsPlayerOpen(true);
    } else if (video.video_type === "long") {
      setSelectedVideo(video);
    } else {
      setSelectedVideo(video);
    }
  };

  // Not logged in check
  if (isOwnProfilePage && !user && !isPreviewMode) {
    return (
      <MainLayout>
        <div className="min-h-screen pb-20 flex flex-col items-center justify-center px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full glass flex items-center justify-center">
              <UserPlus className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Join the Community</h2>
            <p className="text-muted-foreground mb-8 max-w-xs">
              Sign in to create your profile, follow creators, and share your content
            </p>
            <Link to="/auth">
              <Button variant="glow" size="lg" className="gap-2">
                <LogIn className="w-5 h-5" /> Sign In / Sign Up
              </Button>
            </Link>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  if ((profileLoading || videosLoading) && !isPreviewMode) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  if (!displayProfile && !isPreviewMode) {
    return (
      <MainLayout>
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          <h2 className="text-xl font-bold text-foreground mb-2">User not found</h2>
          <p className="text-muted-foreground mb-4">This profile doesn't exist.</p>
          <Button variant="glow" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isOnline = displayProfile?.activity_status === "active";
  const contentTabs = isOwnProfile ? [...baseTabs, ...ownerTabs] : baseTabs.filter((t) => t.id !== "saved"); // Hide saved from non-owners

  // Build tabs with counts
  const tabsWithCounts = contentTabs.map((tab) => {
    let count = 0;
    switch (tab.id) {
      case "shorts":
        count = shortsCount;
        break;
      case "videos":
        count = videosCount;
        break;
      case "saved":
        count = savedCount;
        break;
      case "live":
        count = liveCount;
        break;
      case "private":
        count = privateCount;
        break;
      case "drafts":
        count = dropsCount;
        break;
      case "posts":
        count = postsCount;
        break;
    }
    return { ...tab, count };
  });

  return (
    <MainLayout>
      <div className="min-h-screen pb-20 bg-background md:pb-6">
        {/* Cover Banner */}
        <div className="relative h-48 md:h-56 lg:h-64 overflow-hidden">
          {displayProfile?.cover_url ? (
            <img src={displayProfile.cover_url} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/40 via-accent/30 to-secondary/40" />
          )}
          {/* Gradient only from very bottom for text readability - no overlay on cover photo */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />

          {/* Top controls */}
          <div className="absolute top-3 left-0 right-0 px-4 z-20 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="text-foreground p-2 rounded-full bg-background/50 backdrop-blur-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              {isOwnProfile && user && (
                <button
                  onClick={() => setNotificationOpen(true)}
                  className="text-foreground p-2 rounded-full bg-background/50 backdrop-blur-sm relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
              )}
              {isOwnProfile && (
                <button
                  onClick={() => navigate("/profile/settings")}
                  className="text-foreground p-2 rounded-full bg-background/50 backdrop-blur-sm"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}
              <div className="relative group">
                <button className="text-foreground p-2 rounded-full bg-background/50 backdrop-blur-sm">
                  <MoreVertical className="w-5 h-5" />
                </button>
                <div className="absolute right-0 top-full mt-1 w-44 bg-background/95 backdrop-blur-xl border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  {isOwnProfile && (
                    <>
                      <button
                        onClick={() => navigate("/studio")}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors rounded-t-lg"
                      >
                        <BarChart3 className="w-4 h-4" /> Studio
                      </button>
                      <button
                        onClick={() => setDownloadsSheetOpen(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Download className="w-4 h-4" /> Downloads
                        {downloadedVideos.length > 0 && (
                          <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            {downloadedVideos.length}
                          </span>
                        )}
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleShare}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors rounded-b-lg"
                  >
                    <Share2 className="w-4 h-4" /> Share Profile
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cover edit */}
          {isOwnProfile && (
            <button
              onClick={() => navigate("/profile/edit")}
              className="absolute bottom-3 right-3 p-2 rounded-full bg-background/70 backdrop-blur-sm text-foreground hover:bg-background/90 transition-colors z-20"
            >
              <Camera className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Avatar overlapping cover bottom */}
        <div className="relative px-4 -mt-14 z-20 mb-3">
          <div className="flex items-end gap-3">
            <div className="relative shrink-0">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary via-accent to-secondary opacity-60"
              />
              <Avatar className="relative w-24 h-24 border-4 border-background shadow-xl">
                <AvatarImage src={displayProfile?.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-muted text-foreground text-2xl font-bold">
                  {displayProfile?.display_name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              {isOnline && (
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full animate-pulse z-10" />
              )}
              {isOwnProfile && (
                <button
                  onClick={() => navigate("/profile/edit")}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-background z-10"
                >
                  <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                </button>
              )}
            </div>
            <div className="min-w-0 pb-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-bold text-foreground truncate">{displayProfile?.display_name || "User"}</h2>
                {displayProfile?.trust_level && displayProfile.trust_level >= 3 && (
                  <CheckCircle2 className="w-5 h-5 text-primary fill-primary/20 shrink-0" />
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">@{displayProfile?.username || "username"}</p>
            </div>
          </div>
        </div>

        {/* Bio, badges, stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center px-4 pb-4 md:max-w-3xl md:mx-auto"
        >
          {displayProfile?.bio && (
            <p className="text-sm text-muted-foreground text-center w-full px-4 break-words mb-2">
              {displayProfile.bio}
            </p>
          )}
          {(displayProfile as any)?.website && (
            <a
              href={(displayProfile as any).website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-secondary hover:underline flex items-center gap-1 mb-2"
            >
              {(displayProfile as any).website.replace(/^https?:\/\//, "").slice(0, 25)}{" "}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <AccountAgeBadge createdAt={displayProfile?.created_at || null} />
            <CreatorScoreBadge score={displayProfile?.creator_score || null} />
            <ActivityStatus status={displayProfile?.activity_status || null} />
          </div>
          <div className="flex items-center gap-4 mb-6 flex-wrap justify-center">
            <button
              onClick={handleOpenFollowers}
              className="text-center cursor-pointer hover:opacity-80 transition-opacity"
            >
              <p className="text-xl font-bold text-foreground">{formatNumber(liveStats.total_followers)}</p>
              <p className="text-xs text-muted-foreground">Fans</p>
            </button>
            <button
              onClick={handleOpenFollowing}
              className="text-center cursor-pointer hover:opacity-80 transition-opacity"
            >
              <p className="text-xl font-bold text-foreground">{formatNumber(liveStats.total_following)}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </button>
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">
                {formatNumber(liveStats.total_likes + postLikesCount)}
              </p>
              <p className="text-xs text-muted-foreground">Likes</p>
            </div>
            <button
              onClick={() => setGiftHistoryOpen(true)}
              className="text-center cursor-pointer hover:opacity-80 transition-opacity"
            >
              <p className="text-xl font-bold text-foreground flex items-center gap-1 justify-center">
                <Gift className="w-4 h-4 text-amber-400" /> {formatNumber(liveStats.total_gift_count)}
              </p>
              <p className="text-xs text-muted-foreground">Gifts</p>
            </button>
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{formatNumber(totalVideos)}</p>
              <p className="text-xs text-muted-foreground">Videos</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{formatNumber(postsCount)}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
          </div>

          <AnimatePresence>
            {followersModalOpen && (
              <FullScreenUserList
                title="Fans"
                users={followersList}
                loading={loadingFollowers}
                onClose={() => setFollowersModalOpen(false)}
                currentUserId={user?.id}
              />
            )}
            {followingModalOpen && (
              <FullScreenUserList
                title="Following"
                users={followingList}
                loading={loadingFollowing}
                onClose={() => setFollowingModalOpen(false)}
                currentUserId={user?.id}
              />
            )}
          </AnimatePresence>

          <GiftHistory open={giftHistoryOpen} onOpenChange={setGiftHistoryOpen} userId={targetUserId || ""} />

          <div className="flex items-center gap-3 w-full max-w-sm mt-2">
            {isOwnProfile ? (
              <Button variant="glow" className="flex-1 gap-2" onClick={() => navigate("/profile/edit")}>
                <Settings className="w-4 h-4" /> Edit Profile
              </Button>
            ) : user ? (
              <Button
                variant={isFollowing ? "glass" : "glow"}
                className="flex-1 gap-2"
                onClick={handleFollow}
                disabled={followLoading}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4" /> Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Follow
                  </>
                )}
              </Button>
            ) : (
              <Link to="/auth" className="flex-1">
                <Button variant="glow" className="w-full gap-2">
                  <UserPlus className="w-4 h-4" /> Follow
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              className="flex-1 gap-2 border-muted-foreground/30"
              onClick={() => navigate(isOwnProfile ? "/messages" : `/chat/${targetUserId}`)}
            >
              <MessageSquare className="w-4 h-4" /> {isOwnProfile ? "Inbox" : "Message"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border-muted-foreground/30"
              onClick={() => setShareMenuOpen(true)}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Trending Now */}
        {trendingVideos.length > 0 && (
          <div className="px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔥</span>
              <h3 className="text-sm font-semibold text-foreground tracking-wide">TRENDING NOW</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {trendingVideos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex-shrink-0 w-28"
                  onClick={() => handleVideoClick(video, index)}
                >
                  <div className="aspect-[4/5] rounded-xl overflow-hidden relative cursor-pointer group">
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={video.caption || "Video"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Grid3X3 className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-foreground font-medium">
                      <Play className="w-3 h-3 fill-foreground" /> {formatNumber(video.view_count || 0)}
                    </div>
                  </div>
                  <p className="text-xs text-foreground mt-2 line-clamp-1">{video.caption || `Video ${index + 1}`}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Content Tabs with Counts */}
        <div className="border-b border-glass-border px-4 md:max-w-5xl md:mx-auto">
          <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar md:justify-center">
            {tabsWithCounts.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id ? "text-foreground border-secondary" : "text-muted-foreground border-transparent"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
                {tab.count > 0 && (
                  <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded-full">{formatNumber(tab.count)}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Posts Tab Content */}
        {activeTab === "posts" ? (
          <ProfilePostsTab userId={targetUserId || user?.id || ""} isOwnProfile={isOwnProfile} />
        ) : activeTab === "drafts" ? (
          <DraftsTab drafts={drafts} loading={draftsLoading} onDelete={deleteDraft} />
        ) : activeTab === "private" ? (
          <PrivateContentTab
            videos={displayVideos}
            userId={targetUserId || user?.id || ""}
            onVideoClick={handleVideoClick}
            onMenuClick={setMenuVideo}
            isOwnProfile={isOwnProfile}
          />
        ) : activeTab === "saved" ? (
          <SavedContentTab savedVideos={isOwnProfile ? savedVideos : []} onVideoClick={handleVideoClick} />
        ) : getActiveContent().length > 0 ? (
          activeTab === "videos" ? (
            <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3">
              {getActiveContent().map((video, index) => (
                <div
                  key={video.id}
                  className="flex p-3 gap-3 border-b border-border/10 hover:bg-muted/30 transition-colors relative cursor-pointer"
                  onClick={() => handleVideoClick(video, index)}
                >
                  <div className="relative w-40 h-24 md:w-full md:h-auto md:aspect-video flex-shrink-0 bg-muted md:rounded-lg md:overflow-hidden">
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        className="w-full h-full object-cover rounded-none md:rounded-lg"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    {video.duration && (
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 font-medium rounded-sm">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                    {video.pinned_at && (
                      <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] px-1 rounded-sm flex items-center gap-1">
                        <Pin className="w-2 h-2" /> Pinned
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 pr-6 md:pt-2">
                    <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                      {video.caption || "Untitled Video"}
                    </h4>
                    <div className="mt-1 flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">{formatNumber(video.view_count || 0)} plays</span>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(video.created_at)}</span>
                    </div>
                  </div>
                  {isOwnProfile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuVideo(video);
                      }}
                      className="absolute right-2 top-3 p-1 text-muted-foreground hover:text-foreground"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0.5 p-0.5"
            >
              {getActiveContent().map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="aspect-[9/16] relative overflow-hidden cursor-pointer bg-muted group"
                  onClick={() => handleVideoClick(video, index)}
                >
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.caption || "Video"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Grid3X3 className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />

                  {video.pinned_at && (
                    <div className="absolute top-1 left-1 z-10 bg-primary/80 text-primary-foreground text-xs px-1 py-0.5 rounded flex items-center gap-0.5">
                      <Pin className="w-3 h-3" /> Pinned
                    </div>
                  )}

                  {video.status && video.status !== "ready" && (
                    <VideoStatusBadge status={video.status as VideoStatus} />
                  )}

                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="flex items-center gap-1 text-xs text-foreground font-medium">
                      <Play className="w-3 h-3 fill-foreground" /> {formatNumber(video.view_count || 0)}
                    </div>
                  </div>

                  {isOwnProfile && (
                    <div className="absolute top-1 right-1 z-20" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setMenuVideo(video)}
                        className="p-1 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background/90"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              {activeTab === "live" ? (
                <Radio className="w-8 h-8 text-muted-foreground" />
              ) : (
                <Grid3X3 className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No {activeTab} yet</h3>
            <p className="text-sm text-muted-foreground">
              {isOwnProfile ? "Start creating to see your content here" : "This user hasn't uploaded any content"}
            </p>
          </motion.div>
        )}

        {/* Long video → WatchChatPlayer */}
        <AnimatePresence>
          {selectedVideo && selectedVideo.video_type === "long" && (
            <motion.div
              key="long-player"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black"
            >
              <WatchChatPlayer
                video={selectedVideo}
                relatedVideos={displayVideos.filter(
                  (v) => v.video_type === "long" && v.id !== selectedVideo.id && v.is_public !== false,
                )}
                onBack={() => setSelectedVideo(null)}
                onVideoClick={(video) => setSelectedVideo(video)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Non-long video detail modal fallback */}
        {selectedVideo && selectedVideo.video_type !== "long" && (
          <VideoDetailModal
            video={selectedVideo}
            isOpen={!!selectedVideo}
            onClose={() => setSelectedVideo(null)}
            isOwnProfile={isOwnProfile}
            onUpdate={() => mutateVideos()}
          />
        )}

        {/* Shorts Player → RealVideoFeed */}
        <AnimatePresence>
          {shortsPlayerOpen && (
            <motion.div
              key="shorts-feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black"
            >
              <button
                onClick={() => setShortsPlayerOpen(false)}
                className="absolute top-12 left-4 z-50 p-2 rounded-full bg-black/50 backdrop-blur-xl border border-white/10"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <RealVideoFeed videos={shortsVideos} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Sheet for thumbnail menu */}
        <Sheet open={!!menuVideo} onOpenChange={() => setMenuVideo(null)}>
          <SheetContent side="bottom" className="bg-card border-t border-border">
            <SheetHeader>
              <SheetTitle className="text-card-foreground">Video Options</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-2">
              {menuVideo && (
                <>
                  <button
                    onClick={() => {
                      handlePinVideo(menuVideo.id, !!menuVideo.pinned_at);
                      setMenuVideo(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <Pin className="w-5 h-5" /> {menuVideo.pinned_at ? "Unpin" : "Pin"}
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/edit-video/${menuVideo.id}`);
                      setMenuVideo(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <Edit className="w-5 h-5" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/studio?video=${menuVideo.id}`);
                      setMenuVideo(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <BarChart className="w-5 h-5" /> Analytics
                  </button>
                  <button
                    onClick={() => {
                      handleDownloadVideo(menuVideo);
                      setMenuVideo(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <Download className="w-5 h-5" /> Download
                  </button>
                  <div className="border-t border-border my-2" />
                  <button
                    onClick={() => {
                      handleUpdatePrivacy(menuVideo.id, "public");
                      setMenuVideo(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <Globe className="w-5 h-5" /> Public
                  </button>
                  <button
                    onClick={() => {
                      handleUpdatePrivacy(menuVideo.id, "friends");
                      setMenuVideo(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <Users className="w-5 h-5" /> Friends
                  </button>
                  <button
                    onClick={() => {
                      handleUpdatePrivacy(menuVideo.id, "private");
                      setMenuVideo(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <Lock className="w-5 h-5" /> Private
                  </button>
                  <div className="border-t border-border my-2" />
                  <button
                    onClick={() => {
                      handleDeleteVideo(menuVideo.id);
                      setMenuVideo(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" /> Delete
                  </button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Notification Sheet */}
        <NotificationSheet open={notificationOpen} onOpenChange={setNotificationOpen} />

        {/* Simple Downloads Sheet */}
        <SimpleDownloadsSheet
          open={downloadsSheetOpen}
          onOpenChange={setDownloadsSheetOpen}
          onPlayVideo={(videoId, blobUrl) => {
            const video = downloadedVideos.find((v) => v.videoId === videoId);
            setOfflinePlayerVideo({ id: videoId, blobUrl, caption: video?.caption || undefined });
          }}
        />

        <AnimatePresence>
          {offlinePlayerVideo && (
            <OfflineVideoPlayer
              blobUrl={offlinePlayerVideo.blobUrl}
              caption={offlinePlayerVideo.caption}
              onClose={() => setOfflinePlayerVideo(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isNetworkOnline && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-20 left-4 right-4 z-40 bg-amber-500/90 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-3">
                <WifiOff className="w-5 h-5 text-amber-900" />
                <div>
                  <p className="text-sm font-medium text-amber-900">You're offline</p>
                  <p className="text-xs text-amber-800">Watch your downloaded videos</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setDownloadsSheetOpen(true)}
                className="bg-amber-900 text-amber-50 hover:bg-amber-800"
              >
                Downloads
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
};

export default UnifiedProfile;
