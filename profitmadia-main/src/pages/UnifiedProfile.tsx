import { Bell, MoreVertical, Grid3X3, Film, Radio, Play, UserPlus, UserCheck, Share2, MessageSquare, CheckCircle2, ExternalLink, ArrowLeft, Settings, LogIn, Gift, BarChart3, Bookmark, Download, WifiOff, MoreHorizontal, Globe, Users, Lock, Trash2, Pin, Edit, BarChart, X, Search, Filter, CheckCheck, Eye, Package, FileText, Pause, Maximize2, Minimize2, RotateCw, Volume2, VolumeX, Camera } from "lucide-react";
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
import { ProfilePostsTab } from "@/components/posts/ProfilePostsTab";
import { RealVideoFeed } from "@/components/video/RealVideoFeed";
import { WatchChatPlayer } from "@/components/video/WatchChatPlayer";
import { DraftsTab } from "@/components/profile/DraftsTab";
import { PrivateContentTab } from "@/components/profile/PrivateContentTab";
import { SavedContentTab } from "@/components/profile/SavedContentTab";

// ---------- Helper functions ----------
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

// Mock data for preview
const mockProfile = { /* unchanged */ };
const mockVideos: Video[] = [ /* unchanged */ ];

// ---------- FullScreenUserList component (unchanged) ----------
const FullScreenUserList = ({ title, users, loading, onClose, currentUserId }: any) => { /* keep as in original */ };

// ---------- Video Detail Modal (unchanged) ----------
const VideoDetailModal = ({ video, isOpen, onClose, isOwnProfile, onUpdate }: any) => { /* keep as in original */ };

// ---------- Full‑page Downloads Page (new) ----------
interface DownloadsPageProps {
  onClose: () => void;
}
const DownloadsPage = ({ onClose }: DownloadsPageProps) => {
  const { downloadedVideos, loading, getVideoUrl, deleteDownload } = useDownloadManager();
  const [selectedVideo, setSelectedVideo] = useState<{ id: string; blobUrl: string; caption?: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (selectedVideo && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [selectedVideo]);

  const handleVideoSelect = (videoId: string) => {
    const blobUrl = getVideoUrl(videoId);
    if (blobUrl) {
      const video = downloadedVideos.find(v => v.videoId === videoId);
      setSelectedVideo({ id: videoId, blobUrl, caption: video?.caption });
    } else {
      toast.error("Video not found");
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      playing ? videoRef.current.pause() : videoRef.current.play();
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
    if (videoRef.current) videoRef.current.volume = vol;
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  const handleSkip = (seconds: number) => {
    if (videoRef.current) videoRef.current.currentTime += seconds;
  };

  const handleVideoTap = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const handleDelete = async (videoId: string) => {
    if (confirm("Delete downloaded video?")) {
      await deleteDownload(videoId);
      if (selectedVideo?.id === videoId) setSelectedVideo(null);
      toast.success("Removed from downloads");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b p-4 flex items-center justify-between">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Offline Downloads</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Video player area */}
        {selectedVideo ? (
          <div className="flex-1 bg-black relative flex items-center justify-center min-h-[300px] md:min-h-full">
            <video
              ref={videoRef}
              src={selectedVideo.blobUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onClick={handleVideoTap}
            />
            {/* Controls overlay */}
            {showControls && (
              <div className="absolute inset-0 bg-black/50 flex flex-col justify-between p-4">
                <div className="flex justify-between">
                  <div />
                  <div className="flex gap-2">
                    <button onClick={handleFullscreen} className="p-2 rounded-full bg-black/50 text-white">
                      <Maximize2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white text-sm">
                    <span>{formatDuration(currentTime)}</span>
                    <Slider value={[currentTime]} max={duration} step={0.1} onValueChange={handleSeek} className="flex-1" />
                    <span>{formatDuration(duration)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      <button onClick={() => handleSkip(-10)} className="text-white">⏪ 10</button>
                      <button onClick={togglePlay} className="text-white">{playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}</button>
                      <button onClick={() => handleSkip(10)} className="text-white">10 ⏩</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={toggleMute} className="text-white">
                        {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <Slider value={[isMuted ? 0 : volume]} max={1} step={0.01} onValueChange={handleVolumeChange} className="w-24" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <Download className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Select a video to play</p>
            </div>
          </div>
        )}

        {/* Playlist sidebar */}
        <div className="w-full md:w-80 border-t md:border-l md:border-t-0 bg-background overflow-y-auto">
          <div className="p-3 border-b">
            <h2 className="font-semibold">Downloaded Videos</h2>
            <p className="text-xs text-muted-foreground">{downloadedVideos.length} videos</p>
          </div>
          {loading ? (
            <div className="flex justify-center p-8"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>
          ) : downloadedVideos.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No downloads yet</div>
          ) : (
            <div className="divide-y">
              {downloadedVideos.map(video => (
                <div key={video.id} className={`p-3 flex gap-3 cursor-pointer hover:bg-muted/50 ${selectedVideo?.id === video.videoId ? 'bg-muted' : ''}`} onClick={() => handleVideoSelect(video.videoId)}>
                  <div className="w-20 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                    {video.thumbnail ? <img src={video.thumbnail} className="w-full h-full object-cover" alt="" /> : <Film className="w-full h-full p-2 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{video.caption || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground">{formatDuration(video.duration || 0)}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(video.videoId); }} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ---------- Main Profile Component ----------
interface UnifiedProfileProps {
  isOwnProfilePage?: boolean;
}

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
  const { unreadCount } = useNotifications();
  const { drafts, loading: draftsLoading, deleteDraft } = useDrafts();

  // State
  const [activeTab, setActiveTab] = useState("shorts");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [giftHistoryOpen, setGiftHistoryOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [downloadsPageOpen, setDownloadsPageOpen] = useState(false);
  const [offlinePlayerVideo, setOfflinePlayerVideo] = useState<{ id: string; blobUrl: string; caption?: string } | null>(null);
  const [liveStats, setLiveStats] = useState({ total_views: 0, total_likes: 0, total_followers: 0, total_following: 0, total_gift_count: 0 });
  const [postLikesCount, setPostLikesCount] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [shortsPlayerOpen, setShortsPlayerOpen] = useState(false);
  const [shortsVideos, setShortsVideos] = useState<Video[]>([]);
  const [menuVideo, setMenuVideo] = useState<Video | null>(null);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [postsCount, setPostsCount] = useState(0);

  const displayProfile = isPreviewMode ? mockProfile : profile;
  const displayVideos = isPreviewMode ? mockVideos : userVideos;

  // Counts
  const shortsCount = displayVideos.filter(v => (v.video_type === "short" || !v.video_type) && v.is_public !== false).length;
  const longVideosCount = displayVideos.filter(v => v.video_type === "long" && v.is_public !== false).length;
  const liveCount = displayVideos.filter(v => v.video_type === "live" && v.is_public !== false).length;
  const privateCount = displayVideos.filter(v => !v.is_public).length;
  const savedCount = isOwnProfile ? savedVideos.length : 0;
  const draftsCount = drafts.length;
  const totalVideos = shortsCount + longVideosCount;

  useEffect(() => {
    if (!targetUserId) return;
    const fetchPostsCount = async () => {
      let query = supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", targetUserId);
      if (!isOwnProfile) query = query.eq("is_public", true);
      const { count } = await query;
      setPostsCount(count || 0);
    };
    fetchPostsCount();
    const fetchPostLikes = async () => {
      const { data } = await supabase.from("posts").select("like_count").eq("user_id", targetUserId).eq("is_public", true);
      const total = (data || []).reduce((sum, p) => sum + (p.like_count || 0), 0);
      setPostLikesCount(total);
    };
    fetchPostLikes();
    const fetchGiftCount = async () => {
      const { count } = await supabase.from("gifts").select("*", { count: "exact", head: true }).eq("receiver_id", targetUserId);
      setLiveStats(prev => ({ ...prev, total_gift_count: count || 0 }));
    };
    fetchGiftCount();
  }, [targetUserId, isOwnProfile]);

  useEffect(() => {
    if (displayProfile && !isPreviewMode) {
      setLiveStats(prev => ({ ...prev, total_views: (displayProfile as any).total_views || 0, total_likes: displayProfile.total_likes || 0, total_followers: displayProfile.total_followers || 0, total_following: displayProfile.total_following || 0 }));
    } else if (isPreviewMode) {
      setLiveStats({ total_views: 128000, total_likes: 45200, total_followers: 12500, total_following: 890, total_gift_count: 48 });
    }
  }, [displayProfile, isPreviewMode]);

  useEffect(() => {
    if (user && targetUserId && !isOwnProfile && !isPreviewMode) checkFollowing(targetUserId).then(setIsFollowing);
  }, [user, targetUserId, isOwnProfile, isPreviewMode, checkFollowing]);

  // Real‑time updates
  useEffect(() => {
    if (!targetUserId || isPreviewMode) return;
    const channel = supabase.channel(`profile-stats-${targetUserId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${targetUserId}` }, (payload) => {
      const updated = payload.new as any;
      setLiveStats(prev => ({ ...prev, total_views: updated.total_views || 0, total_likes: updated.total_likes || 0, total_followers: updated.total_followers || 0, total_following: updated.total_following || 0 }));
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [targetUserId, isPreviewMode]);

  const handleFollow = async () => {
    if (!targetUserId || followLoading || !user) return;
    setFollowLoading(true);
    if (isFollowing) {
      await unfollowUser(targetUserId);
      setIsFollowing(false);
      setLiveStats(prev => ({ ...prev, total_followers: Math.max(0, prev.total_followers - 1) }));
    } else {
      await followUser(targetUserId);
      setIsFollowing(true);
      setLiveStats(prev => ({ ...prev, total_followers: prev.total_followers + 1 }));
    }
    setFollowLoading(false);
  };

  const fetchFollowers = async () => {
    if (!targetUserId) return;
    setLoadingFollowers(true);
    try {
      const { data: followRows } = await supabase.from("follows").select("follower_id").eq("following_id", targetUserId);
      const ids = (followRows || []).map(f => f.follower_id);
      if (ids.length) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", ids);
        setFollowersList(profiles || []);
      } else setFollowersList([]);
    } catch (error) { toast.error("Failed to load followers"); }
    finally { setLoadingFollowers(false); }
  };

  const fetchFollowing = async () => {
    if (!targetUserId) return;
    setLoadingFollowing(true);
    try {
      const { data: followRows } = await supabase.from("follows").select("following_id").eq("follower_id", targetUserId);
      const ids = (followRows || []).map(f => f.following_id);
      if (ids.length) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", ids);
        setFollowingList(profiles || []);
      } else setFollowingList([]);
    } catch (error) { toast.error("Failed to load following"); }
    finally { setLoadingFollowing(false); }
  };

  const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const trendingVideos = useMemo(() => [...displayVideos].filter(v => v.status === "ready" && v.video_type === "short" && new Date(v.created_at) >= oneWeekAgo).sort((a, b) => (b.like_count || 0) + (b.view_count || 0) - ((a.like_count || 0) + (a.view_count || 0))).slice(0, 5), [displayVideos]);

  const handlePinVideo = async (videoId: string, currentlyPinned: boolean) => {
    if (!isOwnProfile || !user) return;
    try {
      if (currentlyPinned) {
        await supabase.from("videos").update({ pinned_at: null }).eq("id", videoId);
        toast.success("Video unpinned");
      } else {
        const { count } = await supabase.from("videos").select("*", { count: "exact", head: true }).eq("user_id", user.id).not("pinned_at", "is", null);
        if (count && count >= 6) { toast.error("You can only pin up to 6 videos"); return; }
        await supabase.from("videos").update({ pinned_at: new Date().toISOString() }).eq("id", videoId);
        toast.success("Video pinned");
      }
      mutateVideos();
    } catch (error) { toast.error("Failed to update pin"); }
  };

  const handleUpdatePrivacy = async (videoId: string, privacy: "public" | "friends" | "private") => {
    try {
      await supabase.from("videos").update({ is_public: privacy === "public", privacy }).eq("id", videoId);
      toast.success(`Video set to ${privacy}`);
      mutateVideos();
    } catch (error) { toast.error("Failed to update privacy"); }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Delete this video?")) return;
    try {
      await supabase.from("videos").delete().eq("id", videoId);
      toast.success("Video deleted");
      mutateVideos();
    } catch (error) { toast.error("Failed to delete"); }
  };

  const handleDownloadVideo = async (video: Video) => {
    if (!video.video_url) return;
    const success = await downloadVideo(video);
    if (success) toast.success("Downloaded to library");
    else toast.error("Download failed");
  };

  const getActiveContent = (): Video[] => {
    switch (activeTab) {
      case "shorts": return displayVideos.filter(v => (v.video_type === "short" || !v.video_type) && v.is_public !== false);
      case "videos": return displayVideos.filter(v => v.video_type === "long" && v.is_public !== false);
      case "saved": return isOwnProfile ? savedVideos : [];
      case "live": return displayVideos.filter(v => v.video_type === "live" && v.is_public !== false);
      case "private": return displayVideos.filter(v => !v.is_public);
      default: return [];
    }
  };

  const handleVideoClick = (video: Video, index: number) => {
    if (isPreviewMode) return;
    if (video.video_type === "short" || !video.video_type) {
      const shorts = displayVideos.filter(v => (v.video_type === "short" || !v.video_type) && v.is_public !== false);
      const clickedIdx = shorts.findIndex(v => v.id === video.id);
      const reordered = clickedIdx > 0 ? [...shorts.slice(clickedIdx), ...shorts.slice(0, clickedIdx)] : shorts;
      setShortsVideos(reordered);
      setShortsPlayerOpen(true);
    } else if (video.video_type === "long") {
      setSelectedVideo(video);
    } else {
      setSelectedVideo(video);
    }
  };

  const handleShare = async () => {
    if (!displayProfile) return;
    await shareProfile({ userId: targetUserId || "", username: displayProfile.username, displayName: displayProfile.display_name });
  };

  // Build tabs with counts and conditionally add "videos" and "posts"
  const baseTabs = [
    { id: "shorts", label: "Shorts", icon: Grid3X3, count: shortsCount },
    { id: "videos", label: "Videos", icon: Film, count: longVideosCount },
    { id: "saved", label: "Saved", icon: Bookmark, count: savedCount, ownerOnly: true },
    { id: "live", label: "Live", icon: Radio, count: liveCount },
    { id: "posts", label: "Posts", icon: FileText, count: postsCount }
  ];
  const ownerTabs = [
    { id: "private", label: "Private", icon: Lock, count: privateCount },
    { id: "drafts", label: "Drafts", icon: Package, count: draftsCount }
  ];
  let contentTabs = baseTabs.filter(t => !t.ownerOnly || isOwnProfile);
  if (isOwnProfile) contentTabs = [...contentTabs, ...ownerTabs];

  // Early returns for loading / not logged in
  if (isOwnProfilePage && !user && !isPreviewMode) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center max-w-sm">
            <LogIn className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Please sign in</h2>
            <p className="text-sm text-muted-foreground mb-4">You need to log in to view your profile.</p>
            <Button onClick={() => navigate("/auth")} className="w-full">Sign In</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if ((profileLoading || videosLoading) && !isPreviewMode) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center">
            <RotateCw className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!displayProfile && !isPreviewMode) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Profile not found</h2>
            <p className="text-sm text-muted-foreground mb-4">This profile may be private, deleted, or unavailable.</p>
            <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const isOnline = displayProfile?.activity_status === "active";

  return (
    <MainLayout>
      <div className="min-h-screen pb-20 bg-background md:pb-6">
        {/* Cover Banner */}
        <div className="relative h-48 md:h-56 lg:h-64 overflow-hidden">
          {displayProfile?.cover_url ? <img src={displayProfile.cover_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-primary/40 via-accent/30 to-secondary/40" />}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
          {/* Header controls */}
          <div className="absolute top-3 left-0 right-0 px-4 z-20 flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="text-foreground p-2 rounded-full bg-background/50 backdrop-blur-sm"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-base font-semibold text-foreground">@{displayProfile?.username || "username"}</h1>
            <div className="flex items-center gap-2">
              {isOwnProfile && user && (
                <button onClick={() => setNotificationOpen(true)} className="relative p-2 rounded-full bg-background/50 backdrop-blur-sm">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                </button>
              )}
              {isOwnProfile && (
                <button onClick={() => navigate("/profile/settings")} className="p-2 rounded-full bg-background/50 backdrop-blur-sm"><Settings className="w-5 h-5" /></button>
              )}
              <div className="relative group">
                <button className="p-2 rounded-full bg-background/50 backdrop-blur-sm"><MoreVertical className="w-5 h-5" /></button>
                <div className="absolute right-0 top-full mt-1 w-44 bg-background/95 backdrop-blur-xl border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  {isOwnProfile && (
                    <>
                      <button onClick={() => navigate("/studio")} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 rounded-t-lg"><BarChart3 className="w-4 h-4" /> Studio</button>
                      <button onClick={() => setDownloadsPageOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50"><Download className="w-4 h-4" /> Downloads {downloadedVideos.length > 0 && <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{downloadedVideos.length}</span>}</button>
                    </>
                  )}
                  <button onClick={handleShare} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 rounded-b-lg"><Share2 className="w-4 h-4" /> Share Profile</button>
                </div>
              </div>
            </div>
          </div>
          {isOwnProfile && (
            <button onClick={() => navigate("/profile/edit")} className="absolute bottom-3 right-3 p-2 rounded-full bg-background/70 backdrop-blur-sm"><Camera className="w-4 h-4" /></button>
          )}
        </div>

        {/* Avatar and info */}
        <div className="relative px-4 -mt-14 z-20 mb-3">
          <div className="flex items-end gap-3">
            <div className="relative shrink-0">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary via-accent to-secondary opacity-60" />
              <Avatar className="relative w-24 h-24 border-4 border-background shadow-xl">
                <AvatarImage src={displayProfile?.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-foreground text-2xl font-bold">{displayProfile?.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              {isOnline && <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full animate-pulse z-10" />}
              {isOwnProfile && <button onClick={() => navigate("/profile/edit")} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-background z-10"><Camera className="w-3.5 h-3.5 text-primary-foreground" /></button>}
            </div>
            <div className="min-w-0 pb-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-bold truncate">{displayProfile?.display_name || "User"}</h2>
                {displayProfile?.trust_level && displayProfile.trust_level >= 3 && <CheckCircle2 className="w-5 h-5 text-primary fill-primary/20 shrink-0" />}
              </div>
              <p className="text-sm text-muted-foreground truncate">@{displayProfile?.username || "username"}</p>
            </div>
          </div>
        </div>

        {/* Bio, badges, stats row (removed Videos and Posts) */}
        <div className="flex flex-col items-center px-4 pb-4 md:max-w-3xl md:mx-auto">
          {displayProfile?.bio && <p className="text-sm text-muted-foreground text-center w-full px-4 break-words mb-2">{displayProfile.bio}</p>}
          {(displayProfile as any)?.website && (
            <a href={(displayProfile as any).website} target="_blank" rel="noopener noreferrer" className="text-sm text-secondary hover:underline flex items-center gap-1 mb-2">
              {(displayProfile as any).website.replace(/^https?:\/\//, "").slice(0, 25)} <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <AccountAgeBadge createdAt={displayProfile?.created_at || null} />
            <CreatorScoreBadge score={displayProfile?.creator_score || null} />
            <ActivityStatus status={displayProfile?.activity_status || null} />
          </div>
          <div className="flex items-center gap-4 mb-6 flex-wrap justify-center">
            <button onClick={() => { fetchFollowers(); setFollowersModalOpen(true); }} className="text-center"><p className="text-xl font-bold">{formatNumber(liveStats.total_followers)}</p><p className="text-xs text-muted-foreground">Fans</p></button>
            <button onClick={() => { fetchFollowing(); setFollowingModalOpen(true); }} className="text-center"><p className="text-xl font-bold">{formatNumber(liveStats.total_following)}</p><p className="text-xs text-muted-foreground">Following</p></button>
            <div className="text-center"><p className="text-xl font-bold">{formatNumber(liveStats.total_likes + postLikesCount)}</p><p className="text-xs text-muted-foreground">Likes</p></div>
            <button onClick={() => setGiftHistoryOpen(true)} className="text-center"><p className="text-xl font-bold flex items-center gap-1 justify-center"><Gift className="w-4 h-4 text-amber-400" /> {formatNumber(liveStats.total_gift_count)}</p><p className="text-xs text-muted-foreground">Gifts</p></button>
          </div>
          {/* Golden circle with total videos count */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">{totalVideos}</span>
            </div>
            <p className="text-xs text-muted-foreground ml-2 self-center">Total Videos</p>
          </div>

          <GiftHistory open={giftHistoryOpen} onOpenChange={setGiftHistoryOpen} userId={targetUserId || ""} />
          <div className="flex items-center gap-3 w-full max-w-sm mt-2">
            {isOwnProfile ? (
              <Button variant="glow" className="flex-1 gap-2" onClick={() => navigate("/profile/edit")}><Settings className="w-4 h-4" /> Edit Profile</Button>
            ) : user ? (
              <Button variant={isFollowing ? "glass" : "glow"} className="flex-1 gap-2" onClick={handleFollow} disabled={followLoading}>
                {isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
              </Button>
            ) : (
              <Link to="/auth" className="flex-1"><Button variant="glow" className="w-full gap-2"><UserPlus className="w-4 h-4" /> Follow</Button></Link>
            )}
            <Button variant="outline" className="flex-1 gap-2 border-muted-foreground/30" onClick={() => navigate(isOwnProfile ? "/messages" : `/chat/${targetUserId}`)}><MessageSquare className="w-4 h-4" /> {isOwnProfile ? "Inbox" : "Message"}</Button>
            <Button variant="outline" size="icon" className="border-muted-foreground/30" onClick={() => setShareMenuOpen(true)}><Share2 className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Trending Now section (top and bottom) */}
        {trendingVideos.length > 0 && (
          <div className="px-4 py-4">
            <div className="flex items-center gap-2 mb-3"><span className="text-lg">🔥</span><h3 className="text-sm font-semibold">TRENDING NOW</h3></div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {trendingVideos.map((video, idx) => (
                <div key={video.id} className="flex-shrink-0 w-28 cursor-pointer" onClick={() => handleVideoClick(video, idx)}>
                  <div className="aspect-[4/5] rounded-xl overflow-hidden relative bg-muted">
                    {video.thumbnail_url ? <img src={video.thumbnail_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Grid3X3 className="w-6 h-6" /></div>}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-white"><Play className="w-3 h-3 fill-white" /> {formatNumber(video.view_count || 0)}</div>
                  </div>
                  <p className="text-xs mt-2 line-clamp-1">{video.caption || "Video"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs with counts */}
        <div className="border-b border-glass-border px-4 md:max-w-5xl md:mx-auto">
          <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar md:justify-center">
            {contentTabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 py-3 border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? "text-foreground border-secondary" : "text-muted-foreground border-transparent"}`}>
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
                {tab.count > 0 && <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded-full">{tab.count}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "posts" ? (
          <ProfilePostsTab userId={targetUserId || user?.id || ""} isOwnProfile={isOwnProfile} />
        ) : activeTab === "drafts" ? (
          <DraftsTab drafts={drafts} loading={draftsLoading} onDelete={deleteDraft} />
        ) : activeTab === "private" ? (
          <PrivateContentTab videos={displayVideos} userId={targetUserId || user?.id || ""} onVideoClick={handleVideoClick} onMenuClick={setMenuVideo} isOwnProfile={isOwnProfile} />
        ) : activeTab === "saved" ? (
          <SavedContentTab savedVideos={isOwnProfile ? savedVideos : []} onVideoClick={handleVideoClick} />
        ) : getActiveContent().length > 0 ? (
          activeTab === "videos" ? (
            // List view for long videos
            <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3">
              {getActiveContent().map((video, idx) => (
                <div key={video.id} className="flex p-3 gap-3 border-b border-border/10 hover:bg-muted/30 cursor-pointer relative" onClick={() => handleVideoClick(video, idx)}>
                  <div className="relative w-40 h-24 md:w-full md:h-auto md:aspect-video flex-shrink-0 bg-muted md:rounded-lg overflow-hidden">
                    {video.thumbnail_url ? <img src={video.thumbnail_url} className="w-full h-full object-cover rounded-none md:rounded-lg" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-muted-foreground" /></div>}
                    {video.duration && <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 font-medium rounded-sm">{formatDuration(video.duration)}</div>}
                    {video.pinned_at && <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] px-1 rounded-sm flex items-center gap-1"><Pin className="w-2 h-2" /> Pinned</div>}
                  </div>
                  <div className="flex flex-col flex-1 pr-6 md:pt-2">
                    <h4 className="text-sm font-medium line-clamp-2 leading-tight">{video.caption || "Untitled Video"}</h4>
                    <div className="mt-1 flex flex-col gap-0.5"><span className="text-xs text-muted-foreground">{formatNumber(video.view_count || 0)} plays</span><span className="text-xs text-muted-foreground">{formatTimeAgo(video.created_at)}</span></div>
                  </div>
                  {isOwnProfile && (
                    <button onClick={(e) => { e.stopPropagation(); setMenuVideo(video); }} className="absolute right-2 top-3 p-1 text-muted-foreground hover:text-foreground"><MoreVertical className="w-5 h-5" /></button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Grid for shorts / saved / live / private
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0.5 p-0.5">
              {getActiveContent().map((video, idx) => (
                <div key={video.id} className="aspect-[9/16] relative overflow-hidden cursor-pointer bg-muted group" onClick={() => handleVideoClick(video, idx)}>
                  {video.thumbnail_url ? <img src={video.thumbnail_url} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Grid3X3 className="w-8 h-8 text-muted-foreground" /></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                  {video.pinned_at && <div className="absolute top-1 left-1 z-10 bg-primary/80 text-primary-foreground text-xs px-1 py-0.5 rounded flex items-center gap-0.5"><Pin className="w-3 h-3" /> Pinned</div>}
                  {video.status && video.status !== "ready" && <VideoStatusBadge status={video.status as VideoStatus} />}
                  <div className="absolute bottom-1 left-1 right-1"><div className="flex items-center gap-1 text-xs text-white font-medium"><Play className="w-3 h-3 fill-white" /> {formatNumber(video.view_count || 0)}</div></div>
                  {isOwnProfile && (
                    <div className="absolute top-1 right-1 z-20" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setMenuVideo(video)} className="p-1 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background/90"><MoreHorizontal className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4"><Grid3X3 className="w-8 h-8 text-muted-foreground" /></div>
            <h3 className="text-base font-semibold mb-1">No {activeTab} yet</h3>
            <p className="text-sm text-muted-foreground">{isOwnProfile ? "Start creating to see your content here" : "This user hasn't uploaded any content"}</p>
          </div>
        )}

        {/* Long video player */}
        <AnimatePresence>
          {selectedVideo && selectedVideo.video_type === "long" && (
            <motion.div className="fixed inset-0 z-50 bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WatchChatPlayer video={selectedVideo} relatedVideos={displayVideos.filter(v => v.video_type === "long" && v.id !== selectedVideo.id && v.is_public !== false)} onBack={() => setSelectedVideo(null)} onVideoClick={(v) => setSelectedVideo(v)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Shorts player */}
        <AnimatePresence>
          {shortsPlayerOpen && (
            <motion.div className="fixed inset-0 z-50 bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button onClick={() => setShortsPlayerOpen(false)} className="absolute top-12 left-4 z-50 p-2 rounded-full bg-black/50 backdrop-blur-xl border border-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
              <RealVideoFeed videos={shortsVideos} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video bottom sheet menu */}
        <Sheet open={!!menuVideo} onOpenChange={() => setMenuVideo(null)}>
          <SheetContent side="bottom" className="bg-card border-t border-border">
            <SheetHeader><SheetTitle>Video Options</SheetTitle></SheetHeader>
            <div className="py-4 space-y-2">
              {menuVideo && (
                <>
                  <button onClick={() => { handlePinVideo(menuVideo.id, !!menuVideo.pinned_at); setMenuVideo(null); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 rounded-lg"><Pin className="w-5 h-5" /> {menuVideo.pinned_at ? "Unpin" : "Pin"}</button>
                  <button onClick={() => { navigate(`/edit-video/${menuVideo.id}`); setMenuVideo(null); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 rounded-lg"><Edit className="w-5 h-5" /> Edit</button>
                  <button onClick={() => { navigate(`/studio?video=${menuVideo.id}`); setMenuVideo(null); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 rounded-lg"><BarChart className="w-5 h-5" /> Analytics</button>
                  <button onClick={() => { handleDownloadVideo(menuVideo); setMenuVideo(null); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 rounded-lg"><Download className="w-5 h-5" /> Download</button>
                  <div className="border-t border-border my-2" />
                  <button onClick={() => { handleUpdatePrivacy(menuVideo.id, "public"); setMenuVideo(null); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 rounded-lg"><Globe className="w-5 h-5" /> Public</button>
                  <button onClick={() => { handleUpdatePrivacy(menuVideo.id, "friends"); setMenuVideo(null); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 rounded-lg"><Users className="w-5 h-5" /> Friends</button>
                  <button onClick={() => { handleUpdatePrivacy(menuVideo.id, "private"); setMenuVideo(null); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 rounded-lg"><Lock className="w-5 h-5" /> Private</button>
                  <div className="border-t border-border my-2" />
                  <button onClick={() => { handleDeleteVideo(menuVideo.id); setMenuVideo(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-5 h-5" /> Delete</button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Full‑screen downloads page */}
        <AnimatePresence>
          {downloadsPageOpen && <DownloadsPage onClose={() => setDownloadsPageOpen(false)} />}
        </AnimatePresence>

        {/* Notifications and offline player */}
        <NotificationSheet open={notificationOpen} onOpenChange={setNotificationOpen} />
        <AnimatePresence>
          {offlinePlayerVideo && <OfflineVideoPlayer blobUrl={offlinePlayerVideo.blobUrl} caption={offlinePlayerVideo.caption} onClose={() => setOfflinePlayerVideo(null)} />}
        </AnimatePresence>
        <AnimatePresence>
          {!isNetworkOnline && (
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-20 left-4 right-4 z-40 bg-amber-500/90 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3"><WifiOff className="w-5 h-5 text-amber-900" /><div><p className="text-sm font-medium text-amber-900">You're offline</p><p className="text-xs text-amber-800">Watch your downloaded videos</p></div></div>
              <Button size="sm" onClick={() => setDownloadsPageOpen(true)} className="bg-amber-900 text-amber-50 hover:bg-amber-800">Downloads</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
};

export default UnifiedProfile;