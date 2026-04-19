import { useState, useRef, useEffect } from "react";
import {
  Search, Music2, Play, Pause, TrendingUp, Clock, Heart, X,
  Upload, Bookmark, BookmarkCheck, ChevronRight, Volume2,
  Mic, Filter, Sparkles, User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSoundLibrary, Sound } from "@/hooks/useSoundLibrary";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SoundVideosSheet } from "@/components/sounds/SoundVideosSheet";

const genres = [
  { id: "all", label: "All" },
  { id: "other", label: "Original" },
  { id: "custom", label: "Custom" },
  { id: "pop", label: "Pop" },
  { id: "hiphop", label: "Hip-Hop" },
  { id: "rnb", label: "R&B" },
  { id: "electronic", label: "Electronic" },
  { id: "rock", label: "Rock" },
  { id: "classical", label: "Classical" },
];

const sortModes = [
  { id: "trending" as const, label: "Trending", icon: TrendingUp },
  { id: "recent" as const, label: "New", icon: Clock },
  { id: "favorites" as const, label: "Favorites", icon: Heart },
];

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const formatCount = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
};

const SoundStudio = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    sounds, loading, sortMode, setSortMode, search, setSearch,
    genre, setGenre, toggleSave, uploadCustomSound, savedIds,
  } = useSoundLibrary();

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [seekPosition, setSeekPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [showVideos, setShowVideos] = useState<Sound | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setSeekPosition(audio.currentTime);
    const onLoaded = () => setAudioDuration(audio.duration || 0);
    const onEnded = () => setPlayingId(null);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const togglePlay = (sound: Sound) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingId === sound.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      audio.src = sound.audio_url;
      audio.volume = volume / 100;
      audio.play().catch(() => {});
      setPlayingId(sound.id);
    }
  };

  const handleSeek = (val: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = val[0];
      setSeekPosition(val[0]);
    }
  };

  const handleUseSound = (sound: Sound) => {
    audioRef.current?.pause();
    setPlayingId(null);
    navigate("/create", {
      state: {
        preloadedMusic: sound.title,
        musicUrl: sound.audio_url,
        soundMode: true,
      },
    });
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file");
      return;
    }
    await uploadCustomSound(uploadFile, uploadTitle);
    setShowUpload(false);
    setUploadFile(null);
    setUploadTitle("");
  };

  const isNew = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  };

  const playingSound = sounds.find((s) => s.id === playingId);

  return (
    <MainLayout>
      <audio ref={audioRef} preload="none" />

      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-border/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                <Music2 className="w-6 h-6 text-primary" />
                Sound Studio
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {sounds.length} sounds available
              </p>
            </div>
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpload(true)}
                className="gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload Sound</span>
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sounds, artists, genres..."
              className="pl-10 h-10 rounded-xl bg-muted/30"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Sort Mode Tabs */}
          <div className="flex gap-2 mb-3">
            {sortModes.map((m) => (
              <button
                key={m.id}
                onClick={() => setSortMode(m.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  sortMode === m.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <m.icon className="w-3.5 h-3.5" />
                {m.label}
              </button>
            ))}
          </div>

          {/* Genre Filter */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-1">
              {genres.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGenre(g.id === "all" ? null : g.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    (genre === g.id || (!genre && g.id === "all"))
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Sound List / Grid */}
        <ScrollArea className="flex-1">
          <div className={`p-4 md:p-6 ${!isMobile ? "pb-32" : "pb-40"}`}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sounds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Music2 className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-base font-medium">No sounds found</p>
                <p className="text-sm mt-1">
                  {search ? "Try a different search" : "Upload a video to start creating sounds"}
                </p>
              </div>
            ) : (
              <div className={isMobile ? "space-y-1" : "grid grid-cols-2 xl:grid-cols-3 gap-3"}>
                {sounds.map((sound) => (
                  <SoundCard
                    key={sound.id}
                    sound={sound}
                    isPlaying={playingId === sound.id}
                    isSaved={savedIds.has(sound.id)}
                    isNew={isNew(sound.created_at)}
                    isMobile={isMobile}
                    onPlay={() => togglePlay(sound)}
                    onSave={() => toggleSave(sound.id)}
                    onUse={() => handleUseSound(sound)}
                    onViewVideos={() => setShowVideos(sound)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Now Playing Bar */}
        <AnimatePresence>
          {playingSound && (
            <motion.div
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-[220px] xl:left-[240px] bg-card/95 backdrop-blur-xl border-t border-border/30 p-3 z-30"
            >
              <div className="flex items-center gap-3">
                <button onClick={() => togglePlay(playingSound)} className="shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    {playingId === playingSound.id ? (
                      <Pause className="w-4 h-4 text-primary-foreground" />
                    ) : (
                      <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
                    )}
                  </div>
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{playingSound.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Slider
                      value={[seekPosition]}
                      max={audioDuration || 1}
                      step={0.1}
                      onValueChange={handleSeek}
                      className="flex-1"
                    />
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {formatDuration(Math.floor(seekPosition))}
                    </span>
                  </div>
                </div>

                {/* Volume (PC only) */}
                {!isMobile && (
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                    <Slider
                      value={[volume]}
                      max={100}
                      step={1}
                      onValueChange={(v) => setVolume(v[0])}
                    />
                  </div>
                )}

                <Button size="sm" variant="glow" onClick={() => handleUseSound(playingSound)} className="shrink-0">
                  Use
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Mic className="w-5 h-5 text-primary" />
                Upload Custom Sound
              </h3>

              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Sound name..."
                className="mb-3"
              />

              <button
                onClick={() => uploadInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-muted-foreground/30 rounded-xl flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 transition-all mb-4"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm">
                  {uploadFile ? uploadFile.name : "Select audio file (MP3, WAV, M4A)"}
                </span>
              </button>
              <input
                ref={uploadInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="hidden"
              />

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowUpload(false)}>
                  Cancel
                </Button>
                <Button variant="glow" className="flex-1" onClick={handleUpload} disabled={!uploadFile}>
                  Upload
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sound Videos Sheet */}
      {showVideos && (
        <SoundVideosSheet
          sound={showVideos}
          isOpen={!!showVideos}
          onClose={() => setShowVideos(null)}
        />
      )}
    </MainLayout>
  );
};

// ============ Sound Card Component ============
const SoundCard = ({
  sound,
  isPlaying,
  isSaved,
  isNew,
  isMobile,
  onPlay,
  onSave,
  onUse,
  onViewVideos,
}: {
  sound: Sound;
  isPlaying: boolean;
  isSaved: boolean;
  isNew: boolean;
  isMobile: boolean;
  onPlay: () => void;
  onSave: () => void;
  onUse: () => void;
  onViewVideos: () => void;
}) => {
  if (isMobile) {
    // Mobile: list view
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors"
      >
        {/* Play / Avatar */}
        <button onClick={onPlay} className="relative w-12 h-12 rounded-xl shrink-0 overflow-hidden">
          {sound.creator?.avatar_url ? (
            <>
              <img src={sound.creator.avatar_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
              </div>
            </>
          ) : (
            <div className={`w-full h-full flex items-center justify-center rounded-xl ${isPlaying ? "bg-primary" : "bg-muted"}`}>
              {isPlaying ? <Pause className="w-5 h-5 text-primary-foreground" /> : <Play className="w-5 h-5 ml-0.5 text-muted-foreground" />}
            </div>
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground truncate">{sound.title}</p>
            {sound.use_count > 100 && (
              <span className="px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive text-[9px] font-bold shrink-0">
                🔥 Trending
              </span>
            )}
            {isNew && (
              <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-500 text-[9px] font-bold shrink-0">
                NEW
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <User className="w-3 h-3" />
            {sound.creator?.display_name || sound.creator?.username || "Unknown"}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> {formatDuration(sound.duration)}
            </span>
            <button onClick={onViewVideos} className="text-[10px] text-primary flex items-center gap-0.5 hover:underline">
              <Play className="w-2.5 h-2.5" /> {formatCount(sound.use_count)} videos
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onSave} className="p-2 rounded-full hover:bg-muted/60 transition-colors">
            {isSaved ? (
              <BookmarkCheck className="w-4 h-4 text-primary" />
            ) : (
              <Bookmark className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          <Button variant="glow" size="sm" onClick={onUse} className="text-xs h-8">
            Use
          </Button>
        </div>
      </motion.div>
    );
  }

  // Desktop: card view
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 30px -12px hsl(var(--primary) / 0.15)" }}
      className="bg-card rounded-2xl border border-border/30 overflow-hidden transition-all group"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar / Play */}
          <button onClick={onPlay} className="relative w-14 h-14 rounded-xl shrink-0 overflow-hidden">
            {sound.creator?.avatar_url ? (
              <>
                <img src={sound.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
                </div>
              </>
            ) : (
              <div className={`w-full h-full flex items-center justify-center rounded-xl transition-colors ${isPlaying ? "bg-primary" : "bg-muted group-hover:bg-primary/20"}`}>
                {isPlaying ? <Pause className="w-6 h-6 text-primary-foreground" /> : <Music2 className="w-6 h-6 text-muted-foreground" />}
              </div>
            )}
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-foreground truncate">{sound.title}</h3>
              {sound.use_count > 100 && (
                <span className="px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive text-[9px] font-bold shrink-0">
                  🔥
                </span>
              )}
              {isNew && (
                <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-500 text-[9px] font-bold shrink-0">
                  NEW
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {sound.creator?.display_name || sound.creator?.username || "Unknown Artist"}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[10px] text-muted-foreground">{formatDuration(sound.duration)}</span>
              <button onClick={onViewVideos} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                {formatCount(sound.use_count)} videos <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Save */}
          <button onClick={onSave} className="p-2 rounded-full hover:bg-muted/60 transition-colors">
            {isSaved ? (
              <BookmarkCheck className="w-5 h-5 text-primary" />
            ) : (
              <Bookmark className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onPlay}>
          {isPlaying ? <><Pause className="w-3 h-3 mr-1" /> Pause</> : <><Play className="w-3 h-3 mr-1" /> Preview</>}
        </Button>
        <Button variant="glow" size="sm" className="flex-1 text-xs" onClick={onUse}>
          Use Sound
        </Button>
      </div>
    </motion.div>
  );
};

export default SoundStudio;
