import { useState, useEffect } from "react";
import { Download, Play, Trash2, WifiOff, CheckCircle2, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Progress } from "@/components/ui/progress";
import { useDownloadManager } from "@/hooks/useDownloadManager";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DownloadsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlayVideo?: (videoId: string, blobUrl: string) => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const DownloadsSheet = ({ open, onOpenChange, onPlayVideo }: DownloadsSheetProps) => {
  const { downloadedVideos, loading, deleteDownload, getVideoUrl } = useDownloadManager();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handlePlayVideo = (videoId: string) => {
    const blobUrl = getVideoUrl(videoId);
    if (blobUrl && onPlayVideo) {
      onPlayVideo(videoId, blobUrl);
      onOpenChange(false);
    } else {
      toast.error("Failed to load video");
    }
  };

  const handleDeleteClick = (videoId: string) => {
    setVideoToDelete(videoId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (videoToDelete) {
      const success = await deleteDownload(videoToDelete);
      if (success) {
        toast.success("Video removed from downloads");
      } else {
        toast.error("Failed to delete video");
      }
    }
    setDeleteDialogOpen(false);
    setVideoToDelete(null);
  };

  const handleClearAll = async () => {
    let successCount = 0;
    for (const video of downloadedVideos) {
      const success = await deleteDownload(video.videoId);
      if (success) successCount++;
    }
    toast.success(`Cleared ${successCount} downloaded videos`);
    setClearAllDialogOpen(false);
  };

  const totalSize = downloadedVideos.reduce((acc, v) => acc + (v.blob?.size || 0), 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] bg-background/95 backdrop-blur-xl border-t border-border rounded-t-3xl">
          <SheetHeader className="pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-lg font-bold">Downloads</SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    {downloadedVideos.length} videos • {formatBytes(totalSize)}
                  </p>
                </div>
              </div>
              
              {/* Offline indicator */}
              {!isOnline && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-full">
                  <WifiOff className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-amber-500 font-medium">Offline</span>
                </div>
              )}
            </div>
          </SheetHeader>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : downloadedVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-8">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Download className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No downloads yet</h3>
              <p className="text-sm text-muted-foreground">
                Download videos to watch them offline anytime, anywhere
              </p>
            </div>
          ) : (
            <>
              {/* Clear All Button */}
              <div className="py-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setClearAllDialogOpen(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>

              <ScrollArea className="h-[calc(85vh-180px)]">
                <div className="space-y-6 pb-6">
                  {/* Short Videos Section */}
                  {(() => {
                    const shorts = downloadedVideos.filter(v => (v as any).videoType !== "long");
                    const longs = downloadedVideos.filter(v => (v as any).videoType === "long");
                    return (
                      <>
                        {shorts.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-foreground mb-3 px-1">Short Videos ({shorts.length})</h3>
                            <div className="space-y-3">
                              {shorts.map((video, index) => (
                                <DownloadItem key={video.id} video={video} index={index}
                                  onPlay={handlePlayVideo} onDelete={handleDeleteClick} />
                              ))}
                            </div>
                          </div>
                        )}
                        {longs.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-foreground mb-3 px-1">Long Videos ({longs.length})</h3>
                            <div className="space-y-3">
                              {longs.map((video, index) => (
                                <DownloadItem key={video.id} video={video} index={index}
                                  onPlay={handlePlayVideo} onDelete={handleDeleteClick} />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete download?</AlertDialogTitle>
            <AlertDialogDescription>
              This video will be removed from your downloads. You can download it again anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all confirmation dialog */}
      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all downloads?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {downloadedVideos.length} downloaded videos. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Extracted download item component
const DownloadItem = ({ video, index, onPlay, onDelete }: {
  video: any; index: number;
  onPlay: (videoId: string) => void;
  onDelete: (videoId: string) => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -100 }}
    transition={{ delay: index * 0.05 }}
    className="flex gap-3 p-3 rounded-xl bg-card/50 hover:bg-card/80 transition-colors group"
  >
    <div className="relative w-28 rounded-lg overflow-hidden cursor-pointer flex-shrink-0"
      onClick={() => onPlay(video.videoId)}>
      <AspectRatio ratio={9/16}>
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.caption || "Downloaded video"} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Play className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </AspectRatio>
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
          <Play className="w-5 h-5 text-black fill-black ml-0.5" />
        </div>
      </div>
      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white font-medium">
        {formatDuration(video.duration || 0)}
      </div>
      <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
        <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
      </div>
    </div>
    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
      <div>
        <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-1">{video.caption || "Untitled video"}</h4>
        {video.creatorName && <p className="text-xs text-muted-foreground">{video.creatorName}</p>}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>{formatDate(video.downloadedAt)}</span>
        <span>•</span>
        <span>{formatBytes(video.blob?.size || 0)}</span>
      </div>
    </div>
    <button onClick={() => onDelete(video.videoId)}
      className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors self-center">
      <Trash2 className="w-5 h-5" />
    </button>
  </motion.div>
);
