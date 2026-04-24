import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Play,
  Volume2,
  VolumeX,
  Check,
  Scissors,
  Music,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Library,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useFfmpeg } from "@/hooks/useFfmpeg";
import { SoundLibrary } from "@/components/create/SoundLibrary";

export interface LightweightEditData {
  source: Blob | File;
  trimStart: number;
  trimEnd: number;
  splitPoints: number[];
  speed: number;
  musicUrl: string | null;
  musicFile: File | null;
  musicVolume: number;
  videoVolume: number;
  textOverlays: any[];
  filter: string;
  brightness: number;
  contrast: number;
}

type EditorTool = "trim" | "music" | null;

interface LightweightVideoEditorProps {
  onBack: () => void;
  videoSource: Blob | File | null;
  onComplete: (data: LightweightEditData) => void;
}

const tools: { id: EditorTool; icon: typeof Scissors; label: string }[] = [
  { id: "trim", icon: Scissors, label: "Trim" },
  { id: "music", icon: Music, label: "Music" },
];

export const LightweightVideoEditor = ({
  onBack,
  videoSource,
  onComplete,
}: LightweightVideoEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLongVideo, setIsLongVideo] = useState<boolean | null>(true);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);
  const [loadTimeoutReached, setLoadTimeoutReached] = useState(false);

  const [activeTool, setActiveTool] = useState<EditorTool>(null);
  const [showSoundLibrary, setShowSoundLibrary] = useState(false);

  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);

  const [videoVolume, setVideoVolume] = useState(100);
  const [musicVolume, setMusicVolume] = useState(50);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicTitle, setMusicTitle] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    load: loadFfmpeg,
    isLoaded: ffmpegLoaded,
    isProcessing: ffmpegProcessing,
    progress: ffmpegProgress,
    processVideo,
  } = useFfmpeg();
  const [ffmpegLoading, setFfmpegLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      setFfmpegLoading(true);
      await loadFfmpeg();
      setFfmpegLoading(false);
    };
    init();
  }, [loadFfmpeg]);

  useEffect(() => {
    if (!videoSource) return;

    setIsReady(false);
    setIsLongVideo(null);
    setVideoLoadError(null);
    setLoadTimeoutReached(false);
    setCurrentTime(0);

    const url = URL.createObjectURL(videoSource);
    setVideoUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [videoSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    let finalized = false;

    const applyVideoMeta = () => {
      const safeDuration = Number.isFinite(video.duration) ? video.duration : 0;
      const hasMeta = safeDuration > 0 && video.videoWidth > 0 && video.videoHeight > 0;
      if (!hasMeta) return false;

      setDuration(safeDuration);
      setTrimEnd(100);
      setIsLongVideo(true); // Accept all orientations
      setIsReady(true);
      setVideoLoadError(null);
      setLoadTimeoutReached(false);
      return true;
    };

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => {
      finalized = true;
      applyVideoMeta();
    };
    const onLoadedData = () => {
      finalized = true;
      applyVideoMeta();
    };
    const onCanPlay = () => {
      finalized = true;
      applyVideoMeta();
    };

    const onError = () => {
      finalized = true;
      setVideoLoadError("Video load failed. Please choose another file.");
      setIsReady(false);
    };

    const onStalled = () => {
      if (!finalized) setLoadTimeoutReached(true);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    video.addEventListener("stalled", onStalled);

    const warmup = window.setTimeout(() => {
      if (video.readyState >= 1) {
        finalized = true;
        applyVideoMeta();
      }
    }, 100);

    const softTimeout = window.setTimeout(() => {
      if (!finalized && !isReady) {
        setLoadTimeoutReached(true);
      }
    }, 4000);

    const hardTimeout = window.setTimeout(() => {
      if (!finalized && !isReady) {
        setVideoLoadError("Video taking too long to load. Try another file format.");
      }
    }, 12000);

    return () => {
      window.clearTimeout(warmup);
      window.clearTimeout(softTimeout);
      window.clearTimeout(hardTimeout);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
      video.removeEventListener("stalled", onStalled);
    };
  }, [videoUrl, isReady]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = videoVolume / 100;
  }, [videoVolume]);

  useEffect(() => {
    if (musicUrl && audioRef.current) {
      audioRef.current.volume = musicVolume / 100;
    }
  }, [musicVolume, musicUrl]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      audioRef.current?.pause();
    } else {
      video.play();
      if (musicUrl && audioRef.current) {
        audioRef.current.currentTime = video.currentTime;
        audioRef.current.play().catch(() => {});
      }
    }
  }, [isPlaying, musicUrl]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      if (audioRef.current) audioRef.current.currentTime = time;
    }
  }, []);

  const retryLoad = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setVideoLoadError(null);
    setLoadTimeoutReached(false);
    setIsReady(false);

    video.load();
  }, []);

  const handleSoundSelect = useCallback(
    async (sound: { title: string; url: string }) => {
      try {
        const response = await fetch(sound.url);
        const blob = await response.blob();
        const file = new File([blob], `${sound.title}.mp3`, {
          type: blob.type || "audio/mpeg",
        });

        if (musicUrl) URL.revokeObjectURL(musicUrl);
        const url = URL.createObjectURL(file);
        setMusicUrl(url);
        setMusicFile(file);
        setMusicTitle(sound.title);

        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.volume = musicVolume / 100;
        } else {
          const audio = new Audio(url);
          audio.volume = musicVolume / 100;
          audioRef.current = audio;
        }

        setShowSoundLibrary(false);
        toast.success(`🎵 Sound added: ${sound.title}`);
      } catch {
        toast.error("Failed to load sound");
      }
    },
    [musicUrl, musicVolume]
  );

  const removeMusic = useCallback(() => {
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setMusicUrl(null);
    setMusicFile(null);
    setMusicTitle(null);
    toast.info("Music removed");
  }, [musicUrl]);

  const handleExport = useCallback(async () => {
    if (!videoSource) {
      toast.error("Cannot export: No video selected");
      return;
    }

    setIsExporting(true);
    try {
      const trimStartTime = (trimStart / 100) * duration;
      const trimEndTime = (trimEnd / 100) * duration;
      const hasTrim = trimStart > 0 || trimEnd < 100;
      const hasMusic = musicFile !== null;
      let finalSource: Blob | File = videoSource;

      if (ffmpegLoaded && (hasTrim || hasMusic)) {
        toast.info("Processing video...");
        const processed = await processVideo(videoSource, {
          trimStart: hasTrim ? trimStartTime : undefined,
          trimEnd: hasTrim ? trimEndTime : undefined,
          audioFile: hasMusic ? musicFile : null,
          videoVolume,
          audioVolume: musicVolume,
        });

        if (processed) {
          finalSource = processed;
          toast.success("Video processed!");
        } else {
          toast.warning("Processing failed, using original");
        }
      }

      onComplete({
        source: finalSource,
        trimStart: trimStartTime,
        trimEnd: trimEndTime,
        splitPoints: [],
        speed: 1,
        musicUrl,
        musicFile,
        musicVolume,
        videoVolume,
        textOverlays: [],
        filter: "none",
        brightness: 100,
        contrast: 100,
      });
      toast.success("Video ready!");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Failed to process video");
    } finally {
      setIsExporting(false);
    }
  }, [
    videoSource,
    isLongVideo,
    trimStart,
    trimEnd,
    duration,
    musicUrl,
    musicFile,
    musicVolume,
    videoVolume,
    onComplete,
    ffmpegLoaded,
    processVideo,
  ]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || Number.isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const soundLibraryElement = showSoundLibrary ? (
    <SoundLibrary
      isOpen={showSoundLibrary}
      onClose={() => setShowSoundLibrary(false)}
      onSelectSound={(sound) =>
        handleSoundSelect({ title: sound.title, url: sound.url })
      }
    />
  ) : null;

  if (!videoSource) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6">
        <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium mb-2">No Video Selected</h2>
        <p className="text-muted-foreground text-sm text-center mb-4">
          Please select a long video to edit
        </p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  if (videoLoadError) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Video load issue</h2>
        <p className="text-muted-foreground text-sm text-center mb-5">{videoLoadError}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={retryLoad}>
            <RefreshCw className="w-4 h-4 mr-1" /> Retry
          </Button>
          <Button onClick={onBack}>Back</Button>
        </div>
      </div>
    );
  }

  if (!videoUrl || !isReady) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center px-6">
        {/* Show video preview while loading */}
        {videoUrl && (
          <div className="w-full max-w-md aspect-video rounded-xl overflow-hidden bg-black mb-4 shadow-lg">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              muted
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        )}
        <div className="w-10 h-10 border-2 border-muted border-t-primary rounded-full animate-spin" />
        <p className="mt-3 text-sm text-foreground font-medium">Loading video...</p>
        <p className="mt-1 text-xs text-muted-foreground text-center">
          {loadTimeoutReached
            ? "This is taking longer than usual. You can retry now."
            : "Preparing preview and timeline"}
        </p>
        {loadTimeoutReached && (
          <Button variant="outline" className="mt-4" onClick={retryLoad}>
            <RefreshCw className="w-4 h-4 mr-1" /> Retry loading
          </Button>
        )}
      </div>
    );
  }

  /* Removed orientation restriction - allow all video types in long video editor */

  if (isExporting || ffmpegProcessing) {
    return (
      <div className="fixed inset-0 bg-background/95 flex flex-col items-center justify-center z-50">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-sm font-medium text-foreground mb-2">Processing your video...</p>
        <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${ffmpegProgress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{ffmpegProgress}%</p>
      </div>
    );
  }

  const keepDuration = ((trimEnd - trimStart) / 100) * duration;
  const cutStartDuration = (trimStart / 100) * duration;
  const cutEndDuration = ((100 - trimEnd) / 100) * duration;

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {soundLibraryElement}

      <div className="flex items-center justify-between p-2 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
        <span className="text-xs font-semibold text-foreground">Long Video Editor</span>
        <Button size="sm" onClick={handleExport} disabled={isExporting} className="h-8 px-4 text-xs">
          <Check className="w-3.5 h-3.5 mr-1" /> Done
        </Button>
      </div>

      <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative" onClick={togglePlay}>
        <video ref={videoRef} src={videoUrl} className="max-w-full max-h-full object-contain" loop playsInline />

        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 p-4 rounded-full">
              <Play className="w-10 h-10 text-white fill-white" />
            </div>
          </div>
        )}

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="bg-black/60 p-1.5 rounded-full">
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-white" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
          </button>
          <span className="bg-black/60 px-2 py-0.5 rounded text-xs text-white font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {musicTitle && (
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <Music className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-white font-medium truncate max-w-[120px]">{musicTitle}</span>
          </div>
        )}
      </div>

      {activeTool && (
        <div className="bg-card border-t border-border p-3 shrink-0 space-y-3">
          {activeTool === "trim" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Trim Video</span>
                <button onClick={() => { setTrimStart(0); setTrimEnd(100); }} className="text-primary">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-3 text-[11px]">
                {trimStart > 0 && (
                  <span className="text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded">
                    ✂ Cut {formatTime(cutStartDuration)}
                  </span>
                )}
                <span className="text-primary font-semibold bg-primary/10 px-2.5 py-0.5 rounded">
                  ▶ Keep {formatTime(keepDuration)}
                </span>
                {trimEnd < 100 && (
                  <span className="text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded">
                    ✂ Cut {formatTime(cutEndDuration)}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Start: {formatTime((trimStart / 100) * duration)}</span>
                  <span>End: {formatTime((trimEnd / 100) * duration)}</span>
                </div>
                <Slider value={[trimStart]} max={100} step={0.5} onValueChange={([v]) => setTrimStart(Math.min(v, trimEnd - 5))} />
                <Slider value={[trimEnd]} max={100} step={0.5} onValueChange={([v]) => setTrimEnd(Math.max(v, trimStart + 5))} />
              </div>
            </div>
          )}

          {activeTool === "music" && (
            <div className="space-y-3">
              <Button size="sm" variant="outline" className="w-full text-xs h-9" onClick={() => setShowSoundLibrary(true)}>
                <Library className="w-3.5 h-3.5 mr-1.5" />
                {musicTitle ? "Change Sound" : "Browse Sound Library"}
              </Button>

              {musicTitle && (
                <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                  <Music className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground flex-1 truncate">{musicTitle}</span>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={removeMusic}>
                    Remove
                  </Button>
                </div>
              )}

              {!musicTitle && (
                <label className="block">
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (musicUrl) URL.revokeObjectURL(musicUrl);
                        const url = URL.createObjectURL(file);
                        setMusicUrl(url);
                        setMusicFile(file);
                        setMusicTitle(file.name.replace(/\.[^.]+$/, ""));
                        const audio = new Audio(url);
                        audio.volume = musicVolume / 100;
                        audioRef.current = audio;
                        toast.success(`🎵 Music added: ${file.name}`);
                      }
                    }}
                  />
                  <Button size="sm" variant="ghost" className="w-full text-xs h-8 cursor-pointer" asChild>
                    <span><Music className="w-3 h-3 mr-1" /> Or upload from device</span>
                  </Button>
                </label>
              )}

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Video Volume</span>
                  <span className="text-foreground font-medium">{videoVolume}%</span>
                </div>
                <Slider value={[videoVolume]} max={100} onValueChange={([v]) => setVideoVolume(v)} />
              </div>

              {musicTitle && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Music Volume</span>
                    <span className="text-foreground font-medium">{musicVolume}%</span>
                  </div>
                  <Slider value={[musicVolume]} max={100} onValueChange={([v]) => setMusicVolume(v)} />
                </div>
              )}

              <div className="flex items-center gap-2 text-[10px] pt-1">
                {ffmpegLoading ? (
                  <><Loader2 className="w-3 h-3 animate-spin text-primary" /><span className="text-muted-foreground">Loading engine...</span></>
                ) : ffmpegLoaded ? (
                  <><div className="w-1.5 h-1.5 rounded-full bg-primary" /><span className="text-primary">Audio engine ready</span></>
                ) : (
                  <><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /><span className="text-muted-foreground">Engine not loaded</span></>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-card border-t border-border p-2 shrink-0">
        {(trimStart > 0 || trimEnd < 100) && (
          <div className="flex items-center justify-between text-[10px] mb-1 px-1">
            {trimStart > 0 && <span className="text-destructive font-medium">✂ CUT {formatTime(cutStartDuration)}</span>}
            <span className="text-primary font-medium mx-auto">▶ KEEP {formatTime(keepDuration)}</span>
            {trimEnd < 100 && <span className="text-destructive font-medium">✂ CUT {formatTime(cutEndDuration)}</span>}
          </div>
        )}

        <div className="relative h-10 bg-muted rounded-lg overflow-hidden">
          {trimStart > 0 && (
            <div className="absolute inset-y-0 left-0 bg-destructive/20 border-r-2 border-destructive/50" style={{ width: `${trimStart}%` }}>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] text-destructive font-bold">CUT</span>
            </div>
          )}

          <div className="absolute inset-y-0 bg-primary/15 border-x-2 border-primary/40" style={{ left: `${trimStart}%`, right: `${100 - trimEnd}%` }} />

          {trimEnd < 100 && (
            <div className="absolute inset-y-0 right-0 bg-destructive/20 border-l-2 border-destructive/50" style={{ width: `${100 - trimEnd}%` }}>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] text-destructive font-bold">CUT</span>
            </div>
          )}

          <div className="absolute top-0 bottom-0 w-0.5 bg-white z-10 shadow-lg" style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
          </div>

          <div
            className="absolute top-0 bottom-0 w-3 bg-primary cursor-ew-resize rounded-l z-20 flex items-center justify-center"
            style={{ left: `${trimStart}%` }}
            onMouseDown={(e) => {
              e.preventDefault();
              const parent = (e.target as HTMLElement).parentElement;
              const onMove = (ev: MouseEvent) => {
                const rect = parent?.getBoundingClientRect();
                if (!rect) return;
                setTrimStart(Math.max(0, Math.min(trimEnd - 5, ((ev.clientX - rect.left) / rect.width) * 100)));
              };
              const onUp = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
              };
              document.addEventListener("mousemove", onMove);
              document.addEventListener("mouseup", onUp);
            }}
          >
            <div className="w-0.5 h-4 bg-white rounded-full" />
          </div>

          <div
            className="absolute top-0 bottom-0 w-3 bg-primary cursor-ew-resize rounded-r -translate-x-full z-20 flex items-center justify-center"
            style={{ left: `${trimEnd}%` }}
            onMouseDown={(e) => {
              e.preventDefault();
              const parent = (e.target as HTMLElement).parentElement;
              const onMove = (ev: MouseEvent) => {
                const rect = parent?.getBoundingClientRect();
                if (!rect) return;
                setTrimEnd(Math.max(trimStart + 5, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100)));
              };
              const onUp = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
              };
              document.addEventListener("mousemove", onMove);
              document.addEventListener("mouseup", onUp);
            }}
          >
            <div className="w-0.5 h-4 bg-white rounded-full" />
          </div>

          <div
            className="absolute inset-0 cursor-pointer z-0"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              handleSeek(((e.clientX - rect.left) / rect.width) * duration);
            }}
          />
        </div>
      </div>

      <div className="bg-card border-t border-border p-2 shrink-0 safe-area-inset-bottom">
        <div className="flex justify-center gap-8">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                activeTool === tool.id ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tool.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
