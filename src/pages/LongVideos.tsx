import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Grid3X3, ArrowLeft, Flame } from "lucide-react";
import { PremiumLongVideoFeed } from "@/components/video/PremiumLongVideoFeed";
import { WatchChatPlayer } from "@/components/video/WatchChatPlayer";
import { YouTubeStyleThumbnailFeed } from "@/components/video/YouTubeStyleThumbnailFeed";
import { RealVideoFeed } from "@/components/video/RealVideoFeed";
import { MiniPlayer } from "@/components/video/MiniPlayer";
import { useVideos, Video } from "@/hooks/useVideos";
import { useIsMobile } from "@/hooks/use-mobile";

type ViewMode = "select" | "autoplay" | "thumbnail" | "watching" | "short-feed";

const LongVideos = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("select");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedShortIndex, setSelectedShortIndex] = useState(0);
  const { videos: longVideos, loading: longLoading } = useVideos("foryou", "long");
  const { videos: shortVideos, loading: shortLoading } = useVideos("foryou", "short");
  const isMobile = useIsMobile();

  const [miniPlayerVideo, setMiniPlayerVideo] = useState<Video | null>(null);
  const [miniPlayerTime, setMiniPlayerTime] = useState(0);

  const handleLongVideoClick = (video: Video) => {
    setSelectedVideo(video);
    setViewMode("watching");
  };

  const handleMiniPlayer = (video: Video, time: number) => {
    setMiniPlayerVideo(video);
    setMiniPlayerTime(time);
  };

  const handleShortVideoClick = (video: Video) => {
    const index = shortVideos.findIndex((v) => v.id === video.id);
    setSelectedShortIndex(index >= 0 ? index : 0);
    setViewMode("short-feed");
  };

  if (viewMode === "watching" && selectedVideo) {
    const relatedVideos = longVideos.filter((v) => v.id !== selectedVideo.id);
    return (
      <>
        <WatchChatPlayer
          video={selectedVideo}
          relatedVideos={relatedVideos}
          onBack={() => { setViewMode("thumbnail"); setSelectedVideo(null); }}
          onVideoClick={(video) => setSelectedVideo(video)}
          onMiniPlayer={handleMiniPlayer}
        />
        <AnimatePresence>
          {miniPlayerVideo && (
            <MiniPlayer
              videoUrl={miniPlayerVideo.video_url}
              currentTime={miniPlayerTime}
              onClose={() => setMiniPlayerVideo(null)}
              onReturn={() => { setSelectedVideo(miniPlayerVideo); setMiniPlayerVideo(null); setViewMode("watching"); }}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  if (viewMode === "short-feed") {
    const reorderedShorts = selectedShortIndex > 0
      ? [...shortVideos.slice(selectedShortIndex), ...shortVideos.slice(0, selectedShortIndex)]
      : shortVideos;
    return (
      <MainLayout hideNav={isMobile}>
        <div className={`${isMobile ? "fixed inset-0 z-50" : "relative h-[calc(100vh-56px)] flex justify-center"} bg-black`}>
          <div className={isMobile ? "h-full" : "relative h-full w-full max-w-[420px] border-x border-border/10"}>
            <button onClick={() => setViewMode("thumbnail")}
              className="absolute top-12 left-4 z-50 p-2 rounded-full bg-black/50 backdrop-blur-xl border border-white/10">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <RealVideoFeed videos={reorderedShorts} loading={shortLoading} />
          </div>
          <AnimatePresence>
            {miniPlayerVideo && (
              <MiniPlayer videoUrl={miniPlayerVideo.video_url} currentTime={miniPlayerTime}
                onClose={() => setMiniPlayerVideo(null)}
                onReturn={() => { setSelectedVideo(miniPlayerVideo); setMiniPlayerVideo(null); setViewMode("watching"); }}
              />
            )}
          </AnimatePresence>
        </div>
      </MainLayout>
    );
  }

  if (viewMode === "autoplay") {
    return (
      <MainLayout>
        <div className="relative h-screen md:h-[calc(100vh-56px)] bg-black">
          <button onClick={() => setViewMode("select")}
            className="absolute top-4 left-4 z-50 p-2 rounded-full bg-black/50 backdrop-blur-xl border border-white/10">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          {/* Desktop: center the autoplay feed */}
          <div className={isMobile ? "h-full" : "h-full flex justify-center bg-black"}>
            <div className={isMobile ? "h-full" : "h-full w-full max-w-[420px] border-x border-border/10"}>
              <PremiumLongVideoFeed videos={longVideos} loading={longLoading} />
            </div>
          </div>
          <AnimatePresence>
            {miniPlayerVideo && (
              <MiniPlayer videoUrl={miniPlayerVideo.video_url} currentTime={miniPlayerTime}
                onClose={() => setMiniPlayerVideo(null)}
                onReturn={() => { setSelectedVideo(miniPlayerVideo); setMiniPlayerVideo(null); setViewMode("watching"); }}
              />
            )}
          </AnimatePresence>
        </div>
      </MainLayout>
    );
  }

  if (viewMode === "thumbnail") {
    if (!longLoading && longVideos.length === 0 && shortVideos.length === 0) {
      return (
        <MainLayout>
          <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 pb-20">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Play className="w-10 h-10 text-primary/50" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No Videos Yet</h2>
              <p className="text-foreground/50 text-sm mb-6">Be the first to upload a video!</p>
              <button onClick={() => setViewMode("select")}
                className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                Go Back
              </button>
            </div>
          </div>
        </MainLayout>
      );
    }

    return (
      <MainLayout>
        <YouTubeStyleThumbnailFeed
          longVideos={longVideos} shortVideos={shortVideos}
          loading={longLoading || shortLoading}
          onBack={() => setViewMode("select")}
          onLongVideoClick={handleLongVideoClick}
          onShortVideoClick={handleShortVideoClick}
        />
        <AnimatePresence>
          {miniPlayerVideo && (
            <MiniPlayer videoUrl={miniPlayerVideo.video_url} currentTime={miniPlayerTime}
              onClose={() => setMiniPlayerVideo(null)}
              onReturn={() => { setSelectedVideo(miniPlayerVideo); setMiniPlayerVideo(null); setViewMode("watching"); }}
            />
          )}
        </AnimatePresence>
      </MainLayout>
    );
  }

  // Mode selection screen
  return (
    <MainLayout>
      <div className="min-h-screen md:min-h-[calc(100vh-56px)] bg-background flex flex-col items-center justify-center px-6 pb-20 md:pb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-2xl font-bold text-foreground mb-2">Long Videos</h1>
          <p className="text-foreground/50 text-sm">Choose how you want to watch</p>
        </motion.div>
        <div className="w-full max-w-sm md:max-w-lg md:grid md:grid-cols-2 md:gap-6 space-y-4 md:space-y-0">
          <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            onClick={() => setViewMode("autoplay")}
            className="w-full p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-xl border border-orange-500/20 hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/10 transition-all group">
            <div className="flex items-center gap-4 md:flex-col md:text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/30 to-orange-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Flame className="w-7 h-7 text-orange-500" />
              </div>
              <div className="text-left md:text-center flex-1">
                <h3 className="text-lg font-semibold text-foreground">Auto Flay Mode</h3>
                <p className="text-sm text-foreground/50">Cinematic videos, auto-play like reels</p>
              </div>
            </div>
          </motion.button>
          <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            onClick={() => setViewMode("thumbnail")}
            className="w-full p-6 rounded-2xl bg-card/80 backdrop-blur-xl border border-border hover:border-primary/25 hover:shadow-lg transition-all group">
            <div className="flex items-center gap-4 md:flex-col md:text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Grid3X3 className="w-7 h-7 text-secondary" />
              </div>
              <div className="text-left md:text-center flex-1">
                <h3 className="text-lg font-semibold text-foreground">Thumbnail Mode</h3>
                <p className="text-sm text-foreground/50">Browse and tap to watch</p>
              </div>
            </div>
          </motion.button>
        </div>
      </div>
    </MainLayout>
  );
};

export default LongVideos;
