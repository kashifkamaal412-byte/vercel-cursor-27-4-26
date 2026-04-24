import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Plus,
  Undo2,
  Redo2,
  Scissors,
  Volume2,
  VolumeX,
  Music,
  Loader2,
  Type,
  Sparkles,
  SunDim,
  Layers,
  Image,
  Gauge,
  Split,
  Check,
  X,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AspectRatio } from "./editor/panels/AspectRatioPanel";
import { useFfmpeg } from "@/hooks/useFfmpeg";
import { useEditorHistory, EditorState } from "@/hooks/useEditorHistory";
import { DraggableTextOverlay } from "./editor/DraggableTextOverlay";
import { SoundLibrary, SoundItem } from "./SoundLibrary";

interface VideoEditorProps {
  onBack: () => void;
  videoSource?: Blob | File | null;
  onComplete: (editedVideo: VideoEditData) => void;
  preloadedSound?: { title: string; url: string } | null;
  initialEditorSettings?: {
    trimStart?: number;
    trimEnd?: number;
    speed?: number;
    musicSpeed?: number;
    videoVolume?: number;
    musicVolume?: number;
  } | null;
}

export interface VideoEditData {
  source: Blob | File;
  trimStart: number;
  trimEnd: number;
  aspectRatio: AspectRatio;
  videoVolume: number;
  musicVolume: number;
  musicFile?: File | null;
  speed?: number;
  filter?: string;
  brightness?: number;
  contrast?: number;
  textOverlays?: TextOverlay[];
  musicTitle?: string | null;
  musicSpeed?: number;
}

// Re-export TextOverlay from useEditorHistory for external use
import { TextOverlay } from "@/hooks/useEditorHistory";
export type { TextOverlay };

type VideoFilter = "none" | "grayscale" | "sepia" | "warm" | "cool" | "vintage";
type EditorTool = "trim" | "split" | "speed" | "volume" | "sound" | "text" | "filter" | "adjust" | "overlay" | null;

const tools = [
  { id: "trim" as const, icon: Scissors, label: "Trim" },
  { id: "split" as const, icon: Split, label: "Split" },
  { id: "speed" as const, icon: Gauge, label: "Speed" },
  { id: "volume" as const, icon: Volume2, label: "Volume" },
  { id: "sound" as const, icon: Music, label: "Sound" },
  { id: "text" as const, icon: Type, label: "Text" },
  { id: "filter" as const, icon: Sparkles, label: "Filters" },
  { id: "adjust" as const, icon: SunDim, label: "Adjust" },
  { id: "overlay" as const, icon: Layers, label: "Overlay" },
];

const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
const filterOptions: { id: VideoFilter; label: string }[] = [
  { id: "none", label: "None" },
  { id: "grayscale", label: "B&W" },
  { id: "sepia", label: "Sepia" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "vintage", label: "Vintage" },
];

export const VideoEditor = ({ onBack, videoSource, onComplete, preloadedSound = null, initialEditorSettings = null }: VideoEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTool, setActiveTool] = useState<EditorTool>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(() => 
    videoSource ? URL.createObjectURL(videoSource) : null
  );
  const [videoReady, setVideoReady] = useState(false);
  const [currentSource, setCurrentSource] = useState<Blob | File | null>(videoSource || null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  // FFmpeg hook
  const { load: loadFfmpeg, isLoaded: ffmpegLoaded, isProcessing: ffmpegProcessing, progress: ffmpegProgress, processVideo } = useFfmpeg();
  const [ffmpegLoading, setFfmpegLoading] = useState(false);

  // Initial editor state for history
  const initialEditorState = useMemo<EditorState>(() => ({
    trimStart: Math.max(0, Math.min(95, initialEditorSettings?.trimStart ?? 0)),
    trimEnd: Math.max(5, Math.min(100, initialEditorSettings?.trimEnd ?? 100)),
    speed: Math.max(0.5, Math.min(2, initialEditorSettings?.speed ?? 1)),
    filter: "none",
    brightness: 100,
    contrast: 100,
    videoVolume: Math.max(0, Math.min(100, initialEditorSettings?.videoVolume ?? 100)),
    musicVolume: Math.max(0, Math.min(100, initialEditorSettings?.musicVolume ?? 50)),
    textOverlays: [],
  }), [initialEditorSettings]);

  // Undo/Redo history
  const { 
    state: editorState, 
    setState: updateEditorState, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useEditorHistory(initialEditorState);

  // Destructure editor state for easier access
  const { 
    trimStart, 
    trimEnd, 
    speed, 
    filter, 
    brightness, 
    contrast, 
    videoVolume, 
    musicVolume, 
    textOverlays 
  } = editorState;

  // State setters that update history
  const setTrimStart = useCallback((v: number) => updateEditorState({ trimStart: v }), [updateEditorState]);
  const setTrimEnd = useCallback((v: number) => updateEditorState({ trimEnd: v }), [updateEditorState]);
  const setSpeed = useCallback((v: number) => updateEditorState({ speed: v }), [updateEditorState]);
  const setFilter = useCallback((v: string) => updateEditorState({ filter: v }), [updateEditorState]);
  const setBrightness = useCallback((v: number) => updateEditorState({ brightness: v }), [updateEditorState]);
  const setContrast = useCallback((v: number) => updateEditorState({ contrast: v }), [updateEditorState]);
  const setVideoVolume = useCallback((v: number) => updateEditorState({ videoVolume: v }), [updateEditorState]);
  const setMusicVolume = useCallback((v: number) => updateEditorState({ musicVolume: v }), [updateEditorState]);
  const setTextOverlays = useCallback((overlays: TextOverlay[]) => updateEditorState({ textOverlays: overlays }), [updateEditorState]);

  // Non-history states
  const [splitPoints, setSplitPoints] = useState<number[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicSpeed, setMusicSpeed] = useState<number>(() =>
    Math.max(0.5, Math.min(2, initialEditorSettings?.musicSpeed ?? 1))
  );
  const [isExporting, setIsExporting] = useState(false);
  const [newText, setNewText] = useState("");
  const [showSoundLibrary, setShowSoundLibrary] = useState(false);

  useEffect(() => {
    if (!preloadedSound?.url) return;

    let cancelled = false;

    const attachSound = async () => {
      try {
        const response = await fetch(preloadedSound.url);
        if (!response.ok) throw new Error("Failed to fetch sound");

        const blob = await response.blob();
        const audioFile = new File([blob], "creator-sound.mp4", {
          type: blob.type || "audio/mp4",
        });

        if (cancelled) return;

        const nextUrl = URL.createObjectURL(audioFile);
        setMusicUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextUrl;
        });
        setMusicFile(audioFile);
        toast.success(`Sound attached: ${preloadedSound.title}`);
      } catch {
        if (!cancelled) toast.error("Could not attach creator sound automatically");
      }
    };

    attachSound();

    return () => {
      cancelled = true;
    };
  }, [preloadedSound?.url, preloadedSound?.title]);

  useEffect(() => {
    return () => {
      if (musicUrl) URL.revokeObjectURL(musicUrl);
    };
  }, [musicUrl]);

  // Load FFmpeg on mount
  useEffect(() => {
    const initFfmpeg = async () => {
      setFfmpegLoading(true);
      await loadFfmpeg();
      setFfmpegLoading(false);
    };
    initFfmpeg();
  }, [loadFfmpeg]);

  // Handle videoSource changes
  useEffect(() => {
    if (!videoSource) {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
      }
      setCurrentSource(null);
      setVideoReady(false);
      return;
    }
    
    if (videoSource !== currentSource) {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      const newUrl = URL.createObjectURL(videoSource);
      setVideoUrl(newUrl);
      setCurrentSource(videoSource);
      setVideoReady(false);
    }
    
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoSource]);

  // Generate thumbnails from video
  useEffect(() => {
    if (!videoUrl || !videoReady || duration <= 0) return;
    
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const thumbs: string[] = [];
    const numThumbs = 6;
    
    video.onloadeddata = () => {
      canvas.width = 80;
      canvas.height = 120;
      
      const captureFrame = (index: number) => {
        if (index >= numThumbs) {
          setThumbnails(thumbs);
          return;
        }
        
        const time = (duration / numThumbs) * index + (duration / numThumbs / 2);
        video.currentTime = time;
      };
      
      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbs.push(canvas.toDataURL('image/jpeg', 0.5));
          captureFrame(thumbs.length);
        }
      };
      
      captureFrame(0);
    };
    
    video.load();
  }, [videoUrl, videoReady, duration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => {
      setDuration(video.duration);
      setTrimEnd(100);
      setVideoReady(true);
    };
    const handleCanPlay = () => setVideoReady(true);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [videoUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = videoVolume / 100;
    }
  }, [videoVolume]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const addSplitPoint = useCallback(() => {
    const point = (currentTime / duration) * 100;
    if (!splitPoints.includes(point)) {
      setSplitPoints([...splitPoints, point].sort((a, b) => a - b));
      toast.success("Split point added");
    }
  }, [currentTime, duration, splitPoints]);

  const addTextOverlay = useCallback(() => {
    if (!newText.trim()) return;
    const overlay: TextOverlay = {
      id: Date.now().toString(),
      text: newText,
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: 1,
    };
    setTextOverlays([...textOverlays, overlay]);
    setNewText("");
    toast.success("Text added - drag to position!");
  }, [newText, textOverlays]);

  const updateTextOverlay = useCallback((id: string, position: { x: number; y: number }, rotation: number, scale: number) => {
    setTextOverlays(textOverlays.map(t => 
      t.id === id ? { ...t, position, rotation, scale } : t
    ));
  }, [textOverlays, setTextOverlays]);

  const removeTextOverlay = useCallback((id: string) => {
    setTextOverlays(textOverlays.filter(t => t.id !== id));
  }, [textOverlays]);

  // Filter CSS
  const getFilterStyle = (): React.CSSProperties => {
    const filters: string[] = [];
    
    if (filter === "grayscale") filters.push("grayscale(100%)");
    if (filter === "sepia") filters.push("sepia(80%)");
    if (filter === "warm") filters.push("sepia(30%) saturate(120%)");
    if (filter === "cool") filters.push("hue-rotate(20deg) saturate(90%)");
    if (filter === "vintage") filters.push("sepia(40%) contrast(90%) brightness(95%)");
    
    if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
    if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
    
    return { filter: filters.join(" ") || "none" };
  };

  const handleExport = async () => {
    if (!videoSource) {
      toast.error("No video to export");
      return;
    }

    setIsExporting(true);
    
    try {
      const trimStartTime = (trimStart / 100) * duration;
      const trimEndTime = (trimEnd / 100) * duration;
      const hasTrim = trimStart > 0 || trimEnd < 100;
      const hasMusic = musicFile !== null;

      let finalSource: Blob | File = videoSource;

      // Process with FFmpeg if there are edits and FFmpeg is loaded
      if (ffmpegLoaded && (hasTrim || hasMusic)) {
        toast.info("Processing video with FFmpeg...");
        
        const processedVideo = await processVideo(videoSource, {
          trimStart: hasTrim ? trimStartTime : undefined,
          trimEnd: hasTrim ? trimEndTime : undefined,
          audioFile: hasMusic ? musicFile : null,
          videoVolume,
          audioVolume: musicVolume,
          audioSpeed: musicSpeed,
        });

        if (processedVideo) {
          finalSource = processedVideo;
          toast.success("Video processed successfully!");
        } else {
          toast.warning("FFmpeg processing failed, using original video");
        }
      }

      const editData: VideoEditData = {
        source: finalSource,
        trimStart: trimStartTime,
        trimEnd: trimEndTime,
        aspectRatio,
        videoVolume,
        musicVolume,
        musicFile,
        speed,
        filter,
        brightness,
        contrast,
        textOverlays,
        musicTitle: musicFile ? (preloadedSound?.title ?? null) : null,
        musicSpeed,
      };
      
      toast.success("Video ready!");
      onComplete(editData);
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Failed to process video");
    } finally {
      setIsExporting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const time = percent * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  if (!videoSource) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">No Video Selected</h2>
        <p className="text-muted-foreground text-center mb-6">Record or upload a video first</p>
        <Button variant="glow" onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const playheadPosition = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isProcessingActive = isExporting || ffmpegProcessing;

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* Hidden canvas for thumbnails */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Processing Overlay */}
      {isProcessingActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
        >
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h3 className="text-lg font-semibold text-foreground">Processing Video</h3>
            <p className="text-sm text-muted-foreground">
              {ffmpegProcessing ? `FFmpeg: ${ffmpegProgress}%` : "Preparing..."}
            </p>
            <Progress value={ffmpegProgress} className="w-48 mx-auto" />
          </div>
        </motion.div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 z-20 shrink-0 bg-card/50 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              // If a tool is open, close it first; otherwise exit editor
              if (activeTool) {
                setActiveTool(null);
              } else {
                onBack();
              }
            }}
            disabled={isProcessingActive}
            className="h-9 w-9"
          >
            {activeTool ? (
              <ArrowLeft className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
          </Button>
          
          {/* Undo/Redo Buttons */}
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo || isProcessingActive}
            className="h-8 w-8"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo || isProcessingActive}
            className="h-8 w-8"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>
        
        <span className="text-sm font-medium text-muted-foreground">
          {activeTool 
            ? tools.find(t => t.id === activeTool)?.label || "Editor"
            : "Editor"
          }
        </span>
        
        <Button 
          onClick={handleExport}
          disabled={isProcessingActive}
          size="sm"
          className="h-9 px-4"
        >
          {isProcessingActive ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-1" />
              Done
            </>
          )}
        </Button>
      </div>

      {/* Main Content - Video Centered */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Video Preview - Center */}
        <div 
          ref={videoContainerRef}
          className="flex-1 flex items-center justify-center bg-black relative overflow-hidden"
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-w-full max-h-full object-contain"
            style={getFilterStyle()}
            loop
            playsInline
          />

          {/* Draggable Text Overlays */}
          {textOverlays.map(overlay => (
            <DraggableTextOverlay
              key={overlay.id}
              id={overlay.id}
              text={overlay.text}
              initialPosition={overlay.position}
              initialRotation={overlay.rotation}
              initialScale={overlay.scale}
              containerRef={videoContainerRef}
              onRemove={removeTextOverlay}
              onUpdate={updateTextOverlay}
              isEditing={activeTool === "text"}
            />
          ))}

          {/* Play/Pause Overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 p-4 rounded-full">
                <Play className="w-10 h-10 text-white fill-white" />
              </div>
            </div>
          )}

          {/* Time & Controls - Bottom overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <button 
              onClick={(e) => { e.stopPropagation(); toggleMute(); }} 
              className="bg-black/60 p-2 rounded-full"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
            </button>
            <span className="bg-black/60 px-3 py-1 rounded text-xs text-white font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            {speed !== 1 && (
              <span className="bg-primary/80 px-2 py-1 rounded text-xs text-white font-medium">
                {speed}x
              </span>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="h-14 bg-card/50 border-t border-border shrink-0 px-3 flex items-center">
          <div 
            className="flex-1 h-10 bg-muted/30 rounded-lg relative cursor-pointer overflow-hidden"
            onClick={handleSeek}
          >
            {/* Thumbnails */}
            <div className="absolute inset-0 flex">
              {thumbnails.map((thumb, i) => (
                <div key={i} className="flex-1 h-full overflow-hidden">
                  <img 
                    src={thumb} 
                    alt="" 
                    className="w-full h-full object-cover opacity-60"
                  />
                </div>
              ))}
            </div>
            
            {/* Trim region */}
            <div 
              className="absolute top-0 bottom-0 bg-primary/20 border-x-2 border-primary"
              style={{
                left: `${trimStart}%`,
                right: `${100 - trimEnd}%`,
              }}
            />
            
            {/* Split points */}
            {splitPoints.map((point, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-0.5 bg-yellow-500"
                style={{ left: `${point}%` }}
              />
            ))}
            
            {/* Playhead */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white"
              style={{ left: `${playheadPosition}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
            </div>
          </div>
        </div>

        {/* Tool Panel - Below timeline */}
        <AnimatePresence>
          {activeTool && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-card border-t border-border overflow-hidden shrink-0"
            >
              <div className="p-4 max-h-40 overflow-y-auto">
                {/* Trim Panel */}
                {activeTool === "trim" && (
                  <div className="space-y-3">
                    {/* Visual trim bar */}
                    <div className="relative h-12 bg-muted/30 rounded-lg overflow-hidden">
                      {/* Dimmed left (cut) area */}
                      <div
                        className="absolute inset-y-0 left-0 bg-destructive/20 border-r-2 border-destructive/50 z-[1]"
                        style={{ width: `${trimStart}%` }}
                      >
                        {trimStart > 8 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-destructive">CUT</span>
                          </div>
                        )}
                      </div>
                      {/* Active (keep) area */}
                      <div
                        className="absolute inset-y-0 bg-primary/25 border-x-2 border-primary z-[2]"
                        style={{ left: `${trimStart}%`, right: `${100 - trimEnd}%` }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] font-semibold text-primary">
                            {formatTime(((trimEnd - trimStart) / 100) * duration)}
                          </span>
                        </div>
                        <div className="absolute left-0 top-0 bottom-0 w-3 bg-primary rounded-l flex items-center justify-center">
                          <div className="w-0.5 h-5 bg-primary-foreground rounded-full" />
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-3 bg-primary rounded-r flex items-center justify-center">
                          <div className="w-0.5 h-5 bg-primary-foreground rounded-full" />
                        </div>
                      </div>
                      {/* Dimmed right (cut) area */}
                      <div
                        className="absolute inset-y-0 right-0 bg-destructive/20 border-l-2 border-destructive/50 z-[1]"
                        style={{ width: `${100 - trimEnd}%` }}
                      >
                        {(100 - trimEnd) > 8 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-destructive">CUT</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Start: {formatTime((trimStart / 100) * duration)}</span>
                      <button onClick={() => { setTrimStart(0); setTrimEnd(100); }} className="text-primary">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <span>End: {formatTime((trimEnd / 100) * duration)}</span>
                    </div>
                    <div className="space-y-2">
                      <Slider value={[trimStart]} max={100} step={0.5} onValueChange={([v]) => setTrimStart(Math.min(v, trimEnd - 5))} />
                      <Slider value={[trimEnd]} max={100} step={0.5} onValueChange={([v]) => setTrimEnd(Math.max(v, trimStart + 5))} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] bg-muted/30 rounded-lg px-3 py-1.5">
                      <span className="text-muted-foreground">
                        Cut: {formatTime(((trimStart / 100) * duration) + ((100 - trimEnd) / 100) * duration)}
                      </span>
                      <span className="text-primary font-semibold">
                        Keep: {formatTime(((trimEnd - trimStart) / 100) * duration)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Split Panel */}
                {activeTool === "split" && (
                  <div className="space-y-3">
                    <Button size="sm" onClick={addSplitPoint} className="w-full">
                      <Split className="w-4 h-4 mr-2" /> Add Split at {formatTime(currentTime)}
                    </Button>
                    {splitPoints.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {splitPoints.map((p, i) => (
                          <span key={i} className="bg-muted px-2 py-1 rounded text-xs flex items-center gap-1">
                            {formatTime((p / 100) * duration)}
                            <button onClick={() => setSplitPoints(splitPoints.filter((_, idx) => idx !== i))} className="text-destructive">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Speed Panel */}
                {activeTool === "speed" && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 text-center">Video Speed</p>
                      <div className="flex justify-center gap-2 flex-wrap">
                        {speedOptions.map(s => (
                          <button
                            key={s}
                            onClick={() => setSpeed(s)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              speed === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {musicUrl && (
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span className="flex items-center gap-1"><Music className="w-3 h-3" /> Creator Sound Speed</span>
                          <span>{musicSpeed.toFixed(2)}x</span>
                        </div>
                        <Slider
                          value={[musicSpeed]}
                          min={0.5}
                          max={2}
                          step={0.05}
                          onValueChange={([v]) => setMusicSpeed(Number(v.toFixed(2)))}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Volume Panel */}
                {activeTool === "volume" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1"><Volume2 className="w-3 h-3" /> Video Volume</span>
                        <span>{videoVolume}%</span>
                      </div>
                      <Slider value={[videoVolume]} max={100} onValueChange={([v]) => setVideoVolume(v)} />
                    </div>
                    {musicUrl && (
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span className="flex items-center gap-1"><Music className="w-3 h-3" /> Music Volume</span>
                          <span>{musicVolume}%</span>
                        </div>
                        <Slider value={[musicVolume]} max={100} onValueChange={([v]) => setMusicVolume(v)} />
                      </div>
                    )}
                  </div>
                )}

                {/* Sound Panel */}
                {activeTool === "sound" && (
                  <div className="space-y-3">
                    {!musicUrl ? (
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowSoundLibrary(true)}
                        >
                          <Music className="w-4 h-4 mr-2" /> Browse Sound Library
                        </Button>
                        <label className="block">
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = URL.createObjectURL(file);
                                setMusicUrl(url);
                                setMusicFile(file);
                                toast.success(`Music added: ${file.name}`);
                              }
                            }}
                          />
                          <Button variant="ghost" className="w-full cursor-pointer" asChild>
                            <span><Plus className="w-4 h-4 mr-2" /> Upload Audio File</span>
                          </Button>
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={() => setShowSoundLibrary(true)}
                          className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg w-full text-left hover:bg-primary/20 transition-colors"
                        >
                          <Music className="w-5 h-5 text-primary" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-primary truncate block">
                              {preloadedSound?.title || musicFile?.name || "Music added"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">Tap to change sound</span>
                          </div>
                        </button>
                        <Button
                          variant="ghost"
                          className="w-full text-destructive"
                          onClick={() => {
                            if (musicUrl) URL.revokeObjectURL(musicUrl);
                            setMusicUrl(null);
                            setMusicFile(null);
                            toast.info("Music removed");
                          }}
                        >
                          Remove Music
                        </Button>
                      </div>
                    )}
                    
                    {/* FFmpeg Status */}
                    <div className="flex items-center gap-2 text-xs pt-2 border-t border-border">
                      {ffmpegLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                          <span className="text-muted-foreground">Loading FFmpeg...</span>
                        </>
                      ) : ffmpegLoaded ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-green-500">FFmpeg Ready</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          <span className="text-yellow-500">FFmpeg Not Loaded</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Text Panel */}
                {activeTool === "text" && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        placeholder="Enter text..."
                        className="flex-1"
                      />
                      <Button onClick={addTextOverlay} disabled={!newText.trim()}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {textOverlays.length > 0 && (
                      <div className="space-y-1">
                        {textOverlays.map(overlay => (
                          <div key={overlay.id} className="flex items-center justify-between bg-muted p-2 rounded">
                            <span className="text-sm truncate flex-1">{overlay.text}</span>
                            <button onClick={() => removeTextOverlay(overlay.id)} className="text-destructive ml-2">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Filter Panel */}
                {activeTool === "filter" && (
                  <div className="flex gap-2 flex-wrap justify-center">
                    {filterOptions.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filter === f.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Adjust Panel */}
                {activeTool === "adjust" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Brightness</span>
                        <span>{brightness}%</span>
                      </div>
                      <Slider value={[brightness]} min={50} max={150} onValueChange={([v]) => setBrightness(v)} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Contrast</span>
                        <span>{contrast}%</span>
                      </div>
                      <Slider value={[contrast]} min={50} max={150} onValueChange={([v]) => setContrast(v)} />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={() => { setBrightness(100); setContrast(100); }}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" /> Reset
                    </Button>
                  </div>
                )}

                {/* Overlay Panel */}
                {activeTool === "overlay" && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Overlay features coming soon</p>
                    <p className="text-xs">Add stickers, images, and more</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Toolbar - All Tools */}
        <div className="bg-card/80 backdrop-blur-sm border-t border-border shrink-0 px-2 py-2 safe-area-bottom">
          <div className="flex items-center justify-around gap-1 overflow-x-auto">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all min-w-[56px] ${
                  activeTool === tool.id 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <tool.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Sound Library */}
      <SoundLibrary
        isOpen={showSoundLibrary}
        onClose={() => setShowSoundLibrary(false)}
        onSelectSound={async (sound) => {
          try {
            const response = await fetch(sound.url);
            const blob = await response.blob();
            const audioFile = new File([blob], "library-sound.mp4", { type: blob.type || "audio/mp4" });
            const url = URL.createObjectURL(audioFile);
            setMusicUrl(url);
            setMusicFile(audioFile);
            toast.success(`Sound added: ${sound.title}`);
          } catch {
            toast.error("Failed to load sound");
          }
        }}
      />
    </div>
  );
};
