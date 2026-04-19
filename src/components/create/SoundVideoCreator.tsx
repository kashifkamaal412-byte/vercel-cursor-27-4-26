import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft, Camera, Upload, Play, Square, RotateCcw,
  SwitchCamera, Volume2, VolumeX, Scissors, Check, Music2, Gauge,
  Mic, MicOff, Library
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { SoundLibrary, SoundItem } from "./SoundLibrary";

interface SoundVideoCreatorProps {
  soundTitle: string;
  soundUrl: string;
  onBack: () => void;
  onVideoReady: (videoBlob: Blob, config: SoundVideoReadyConfig) => void;
}

type Mode = "select" | "camera" | "gallery" | "preview";

export interface SoundVideoReadyConfig {
  title: string;
  url: string;
  soundVolume: number;
  videoVolume: number;
  trimStart: number;
  trimEnd: number;
  videoSpeed: number;
  soundSpeed: number;
}

export const SoundVideoCreator = ({
  soundTitle,
  soundUrl,
  onBack,
  onVideoReady,
}: SoundVideoCreatorProps) => {
  const [mode, setMode] = useState<Mode>("camera");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [soundVolume, setSoundVolume] = useState(80);
  const [videoVolume, setVideoVolume] = useState(50);
  const [soundMuted, setSoundMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTrimPanel, setShowTrimPanel] = useState(false);
  const [showVolumePanel, setShowVolumePanel] = useState(false);
  const [showSpeedPanel, setShowSpeedPanel] = useState(false);
  const [soundSpeed, setSoundSpeed] = useState(1);
  const [videoSpeed, setVideoSpeed] = useState(1);
  const [showSoundLibrary, setShowSoundLibrary] = useState(false);
  const [currentSoundTitle, setCurrentSoundTitle] = useState(soundTitle);
  const [currentSoundUrl, setCurrentSoundUrl] = useState(soundUrl);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const soundRef = useRef<HTMLAudioElement>(null);
  const previewSoundRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Start camera
  const startCamera = async (nextFacingMode: "user" | "environment" = facingMode) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });
      if (cameraRef.current) cameraRef.current.srcObject = stream;
      streamRef.current = stream;
      setMode("camera");

      // Play sound in background during recording
      if (soundRef.current) {
        soundRef.current.currentTime = 0;
        soundRef.current.volume = soundMuted ? 0 : soundVolume / 100;
        soundRef.current.playbackRate = soundSpeed;
      }
    } catch {
      toast.error("Camera access denied");
      setMode("select");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const switchCamera = () => {
    const nextFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacingMode);
    stopCamera();
    startCamera(nextFacingMode);
  };

  // Recording
  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setVideoBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      stopCamera();
      setMode("preview");
    };
    mediaRecorderRef.current = mr;
    mr.start();
    setIsRecording(true);
    setRecordingTime(0);

    // Play sound
    if (soundRef.current) {
      soundRef.current.currentTime = 0;
      soundRef.current.volume = soundMuted ? 0 : soundVolume / 100;
      soundRef.current.playbackRate = soundSpeed;
      soundRef.current.play().catch(() => {});
    }

    timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    soundRef.current?.pause();
  };

  const resetRecording = () => {
    setVideoBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setRecordingTime(0);
    setIsRecording(false);
    setTrimStart(0);
    setTrimEnd(100);
    setMode("camera");
    startCamera();
  };

  // Gallery
  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { toast.error("Please select a video"); return; }
    if (file.size > 500 * 1024 * 1024) { toast.error("Max 500MB"); return; }
    setVideoBlob(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setMode("preview");
  };

  // Preview controls
  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    const snd = previewSoundRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      snd?.play().catch(() => {});
      setIsPlaying(true);
    } else {
      vid.pause();
      snd?.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      setTrimEnd(100);
    }
  };

  // Sync sound with video
  useEffect(() => {
    const vid = videoRef.current;
    const snd = previewSoundRef.current;
    if (!vid || !snd) return;

    const sync = () => {
      snd.currentTime = vid.currentTime;
    };
    vid.addEventListener("seeked", sync);
    return () => vid.removeEventListener("seeked", sync);
  }, [mode]);

  // Update volumes and playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = videoMuted ? 0 : videoVolume / 100;
      videoRef.current.playbackRate = videoSpeed;
    }
    if (previewSoundRef.current) {
      previewSoundRef.current.volume = soundMuted ? 0 : soundVolume / 100;
      previewSoundRef.current.playbackRate = soundSpeed;
    }
    if (soundRef.current) {
      soundRef.current.volume = soundMuted ? 0 : soundVolume / 100;
      soundRef.current.playbackRate = soundSpeed;
    }
  }, [soundVolume, videoVolume, soundMuted, videoMuted, soundSpeed, videoSpeed]);

  // Handle trim boundaries during playback
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoDuration) return;
    const startSec = (trimStart / 100) * videoDuration;
    const endSec = (trimEnd / 100) * videoDuration;

    const checkBounds = () => {
      if (vid.currentTime < startSec) vid.currentTime = startSec;
      if (vid.currentTime >= endSec) {
        vid.pause();
        previewSoundRef.current?.pause();
        setIsPlaying(false);
        vid.currentTime = startSec;
      }
    };
    vid.addEventListener("timeupdate", checkBounds);
    return () => vid.removeEventListener("timeupdate", checkBounds);
  }, [trimStart, trimEnd, videoDuration]);

  const handleConfirm = () => {
    if (!videoBlob) return;

    onVideoReady(videoBlob, {
      title: currentSoundTitle,
      url: currentSoundUrl,
      soundVolume: soundMuted ? 0 : soundVolume,
      videoVolume: videoMuted ? 0 : videoVolume,
      trimStart,
      trimEnd,
      videoSpeed,
      soundSpeed,
    });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${Math.floor(sec).toString().padStart(2, "0")}`;
  };

  const trimmedDuration = videoDuration ? ((trimEnd - trimStart) / 100) * videoDuration : 0;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Hidden audio elements */}
      <audio ref={soundRef} src={currentSoundUrl} preload="auto" loop />
      <audio ref={previewSoundRef} src={currentSoundUrl} preload="auto" />
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleGallerySelect}
      />

      {/* ===== SELECT MODE ===== */}
      {mode === "select" && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex-1 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 pt-12 border-b border-border">
            <button onClick={onBack}><ArrowLeft className="w-6 h-6 text-foreground" /></button>
            <span className="text-lg font-bold text-foreground flex-1">Use Sound</span>
          </div>

          {/* Sound info */}
          <div className="p-4 flex items-center gap-3 border-b border-border bg-muted/30">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Music2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">{currentSoundTitle}</p>
              <p className="text-xs text-muted-foreground">Original Sound</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Music2 className="w-3 h-3" /> Sound attached
            </div>
          </div>

          {/* Options */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <motion.p
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="text-muted-foreground text-sm text-center mb-4"
            >
              Record a new video or pick from gallery.<br />
              The sound will be automatically added.
            </motion.p>

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => startCamera()}
              className="w-full max-w-xs p-5 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground flex items-center gap-4 shadow-lg"
            >
              <div className="p-3 bg-white/20 rounded-xl">
                <Camera className="w-7 h-7" />
              </div>
              <div className="text-left">
                <p className="font-bold text-base">Record Video</p>
                <p className="text-xs opacity-80">Open camera & record with this sound</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-xs p-5 rounded-2xl bg-muted border border-border text-foreground flex items-center gap-4"
            >
              <div className="p-3 bg-primary/10 rounded-xl">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-bold text-base">From Gallery</p>
                <p className="text-xs text-muted-foreground">Pick a video & add this sound</p>
              </div>
            </motion.button>

          </div>
        </motion.div>
      )}

      {/* ===== CAMERA MODE ===== */}
      {mode === "camera" && (
        <div className="flex-1 relative">
          <video
            ref={cameraRef}
            autoPlay playsInline muted
            className="absolute inset-0 w-full h-full object-contain bg-black"
            style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
          />

          {/* Sound indicator */}
          <div className="absolute top-12 left-0 right-0 flex justify-center z-10">
            <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
              <Music2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-foreground truncate max-w-[200px]">{currentSoundTitle}</span>
              {isRecording && (
                <div className="flex items-center gap-1 ml-2">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-xs font-mono text-foreground">{formatTime(recordingTime)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Top controls */}
          <div className="absolute top-12 left-4 z-10">
            <Button variant="glass" size="icon" onClick={() => { stopCamera(); onBack(); }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
          <div className="absolute top-12 right-4 z-10">
            <Button variant="glass" size="icon" onClick={switchCamera}>
              <SwitchCamera className="w-5 h-5" />
            </Button>
          </div>

          <div className="absolute bottom-12 left-4 z-10">
            <Button
              variant="glass"
              className="gap-2 px-3"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRecording}
            >
              <Upload className="w-4 h-4" /> Gallery
            </Button>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-6 z-10">
            {isRecording ? (
              <>
                <Button variant="glass" size="icon" className="rounded-full w-14 h-14" onClick={resetRecording}>
                  <RotateCcw className="w-6 h-6" />
                </Button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={stopRecording}
                  className="w-20 h-20 rounded-full border-4 border-foreground flex items-center justify-center bg-destructive"
                >
                  <Square className="w-8 h-8 text-foreground fill-foreground" />
                </motion.button>
                <div className="w-14" />
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={startRecording}
                className="w-20 h-20 rounded-full border-4 border-foreground flex items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full bg-destructive" />
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* ===== PREVIEW MODE ===== */}
      {mode === "preview" && previewUrl && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex-1 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 pt-12 border-b border-border">
            <button onClick={resetRecording}><ArrowLeft className="w-6 h-6 text-foreground" /></button>
            <span className="font-bold text-foreground">Edit & Mix</span>
            <Button variant="glow" size="sm" onClick={handleConfirm} className="gap-1">
              <Check className="w-4 h-4" /> Done
            </Button>
          </div>

          {/* Video preview */}
          <div className="flex-1 relative bg-black">
            <video
              ref={videoRef}
              src={previewUrl}
              className="w-full h-full object-contain"
              playsInline
              onLoadedMetadata={handleVideoLoaded}
            />

            {/* Play/pause overlay */}
            <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center">
              {!isPlaying && (
                <div className="bg-black/40 p-4 rounded-full backdrop-blur-sm">
                  <Play className="w-10 h-10 text-white fill-white" />
                </div>
              )}
            </button>

            {/* Sound badge - clickable to open library */}
            <button 
              onClick={(e) => { e.stopPropagation(); setShowSoundLibrary(true); }}
              className="absolute top-3 left-3 glass px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-primary/20 transition-colors"
            >
              <Music2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground truncate max-w-[150px]">{currentSoundTitle}</span>
              <span className="text-[9px] text-primary font-medium">Change</span>
            </button>
          </div>

          {/* Controls bar */}
          <div className="bg-card border-t border-border p-3 space-y-3">
            {/* Tool buttons */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant={showVolumePanel ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowVolumePanel(!showVolumePanel);
                  setShowTrimPanel(false);
                  setShowSpeedPanel(false);
                }}
                className="gap-1.5"
              >
                <Volume2 className="w-4 h-4" /> Volume
              </Button>
              <Button
                variant={showTrimPanel ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowTrimPanel(!showTrimPanel);
                  setShowVolumePanel(false);
                  setShowSpeedPanel(false);
                }}
                className="gap-1.5"
              >
                <Scissors className="w-4 h-4" /> Trim
              </Button>
              <Button
                variant={showSpeedPanel ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowSpeedPanel(!showSpeedPanel);
                  setShowTrimPanel(false);
                  setShowVolumePanel(false);
                }}
                className="gap-1.5"
              >
                <Gauge className="w-4 h-4" /> Speed
              </Button>
            </div>

            <AnimatePresence>
              {showSpeedPanel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <div className="flex items-center gap-3">
                    <Music2 className="w-4 h-4 text-primary" />
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground mb-1">Creator Sound Speed</p>
                      <Slider
                        value={[soundSpeed]}
                        onValueChange={([v]) => setSoundSpeed(Number(v.toFixed(2)))}
                        min={0.5}
                        max={2}
                        step={0.05}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">{soundSpeed.toFixed(2)}x</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mic className="w-4 h-4 text-primary" />
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground mb-1">Video Speed</p>
                      <Slider
                        value={[videoSpeed]}
                        onValueChange={([v]) => setVideoSpeed(Number(v.toFixed(2)))}
                        min={0.5}
                        max={2}
                        step={0.05}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">{videoSpeed.toFixed(2)}x</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Volume panel */}
            <AnimatePresence>
              {showVolumePanel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  {/* Sound volume */}
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSoundMuted(!soundMuted)} className="p-1.5 rounded-lg hover:bg-muted">
                      {soundMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Music2 className="w-4 h-4 text-primary" />}
                    </button>
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground mb-1">Sound Volume</p>
                      <Slider
                        value={[soundVolume]}
                        onValueChange={([v]) => setSoundVolume(v)}
                        max={100} step={1}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{soundVolume}%</span>
                  </div>

                  {/* Video volume */}
                  <div className="flex items-center gap-3">
                    <button onClick={() => setVideoMuted(!videoMuted)} className="p-1.5 rounded-lg hover:bg-muted">
                      {videoMuted ? <MicOff className="w-4 h-4 text-muted-foreground" /> : <Mic className="w-4 h-4 text-primary" />}
                    </button>
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground mb-1">Video Volume</p>
                      <Slider
                        value={[videoVolume]}
                        onValueChange={([v]) => setVideoVolume(v)}
                        max={100} step={1}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{videoVolume}%</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Trim panel */}
            <AnimatePresence>
              {showTrimPanel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatTime((trimStart / 100) * videoDuration)}</span>
                    <span className="font-medium text-foreground">Duration: {formatTime(trimmedDuration)}</span>
                    <span>{formatTime((trimEnd / 100) * videoDuration)}</span>
                  </div>

                  {/* Visual trim bar */}
                  <div className="relative h-12 bg-muted/30 rounded-lg overflow-hidden">
                    {/* Full bar background */}
                    <div className="absolute inset-0 bg-muted/20 rounded-lg" />
                    
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
                          {formatTime(trimmedDuration)}
                        </span>
                      </div>
                      {/* Left handle */}
                      <div className="absolute left-0 top-0 bottom-0 w-3 bg-primary rounded-l flex items-center justify-center cursor-ew-resize">
                        <div className="w-0.5 h-5 bg-primary-foreground rounded-full" />
                      </div>
                      {/* Right handle */}
                      <div className="absolute right-0 top-0 bottom-0 w-3 bg-primary rounded-r flex items-center justify-center cursor-ew-resize">
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

                  {/* Trim sliders */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-8">Start</span>
                      <Slider
                        value={[trimStart]}
                        onValueChange={([v]) => {
                          if (v < trimEnd - 5) {
                            setTrimStart(v);
                            if (videoRef.current) videoRef.current.currentTime = (v / 100) * videoDuration;
                          }
                        }}
                        max={100} step={0.5}
                        className="flex-1"
                      />
                      <span className="text-[10px] font-mono text-primary w-10 text-right">
                        {formatTime((trimStart / 100) * videoDuration)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-8">End</span>
                      <Slider
                        value={[trimEnd]}
                        onValueChange={([v]) => {
                          if (v > trimStart + 5) {
                            setTrimEnd(v);
                            if (videoRef.current) videoRef.current.currentTime = (v / 100) * videoDuration;
                          }
                        }}
                        max={100} step={0.5}
                        className="flex-1"
                      />
                      <span className="text-[10px] font-mono text-primary w-10 text-right">
                        {formatTime((trimEnd / 100) * videoDuration)}
                      </span>
                    </div>
                  </div>

                  {/* Cut info */}
                  <div className="flex items-center justify-between text-[10px] bg-muted/30 rounded-lg px-3 py-1.5">
                    <span className="text-muted-foreground">
                      Cut: {formatTime(((trimStart / 100) * videoDuration) + ((100 - trimEnd) / 100) * videoDuration)}
                    </span>
                    <span className="text-primary font-semibold">
                      Keep: {formatTime(trimmedDuration)}
                    </span>
                    <span className="text-muted-foreground">
                      Total: {formatTime(videoDuration)}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Sound Library */}
      <SoundLibrary
        isOpen={showSoundLibrary}
        onClose={() => setShowSoundLibrary(false)}
        onSelectSound={(sound) => {
          setCurrentSoundTitle(sound.title);
          setCurrentSoundUrl(sound.url);
          // Update audio sources
          if (soundRef.current) soundRef.current.src = sound.url;
          if (previewSoundRef.current) previewSoundRef.current.src = sound.url;
          toast.success(`Sound changed: ${sound.title}`);
        }}
      />
    </div>
  );
};
