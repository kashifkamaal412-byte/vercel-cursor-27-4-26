import { useState, useRef, useEffect } from "react";
import {
  Camera,
  SwitchCamera,
  Zap,
  Timer,
  Music2,
  Sparkles,
  Gauge,
  X,
  Check,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { SoundLibrary, SoundItem } from "./SoundLibrary";

interface CameraRecorderProps {
  onBack: () => void;
  onVideoRecorded: (videoBlob: Blob) => void;
}

const speedOptions = [
  { value: 0.5, label: "0.5x" },
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
];

const timerOptions = [0, 3, 5, 10];

const filters = [
  { id: "none", label: "Normal", filter: "" },
  { id: "beauty", label: "Beauty", filter: "brightness(1.1) contrast(0.95) saturate(1.1)" },
  { id: "warm", label: "Warm", filter: "sepia(0.2) saturate(1.2)" },
  { id: "cool", label: "Cool", filter: "hue-rotate(20deg) saturate(0.9)" },
  { id: "vintage", label: "Vintage", filter: "sepia(0.4) contrast(1.1)" },
  { id: "noir", label: "Noir", filter: "grayscale(1) contrast(1.2)" },
];

export const CameraRecorder = ({ onBack, onVideoRecorded }: CameraRecorderProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [flashOn, setFlashOn] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState(1);
  const [selectedTimer, setSelectedTimer] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(filters[0]);
  const [showSpeedPanel, setShowSpeedPanel] = useState(false);
  const [showTimerPanel, setShowTimerPanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showSoundLibrary, setShowSoundLibrary] = useState(false);
  const [selectedSound, setSelectedSound] = useState<SoundItem | null>(null);

  // Initialize camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: 1080, height: 1920 },
        audio: true,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setHasPermission(true);
    } catch (error) {
      console.error("Camera error:", error);
      setHasPermission(false);
      toast.error("Camera access denied");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const startRecording = async () => {
    if (selectedTimer > 0) {
      // Start countdown
      setCountdown(selectedTimer);
      for (let i = selectedTimer; i > 0; i--) {
        setCountdown(i);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      setCountdown(null);
    }

    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      onVideoRecorded(blob);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingDuration(0);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
      } else {
        mediaRecorderRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const resetRecording = () => {
    chunksRef.current = [];
    setIsRecording(false);
    setIsPaused(false);
    setRecordingDuration(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-background">
      {/* Camera Preview */}
      <div className="absolute inset-0">
        {hasPermission === false ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <Camera className="w-20 h-20 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Camera Access Required</h3>
            <p className="text-muted-foreground mb-4">
              Please enable camera access in your browser settings
            </p>
            <Button onClick={startCamera} variant="glow">
              Try Again
            </Button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ filter: selectedFilter.filter, transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
          />
        )}
      </div>

      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center bg-background/50 z-50"
          >
            <motion.span
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="text-8xl font-bold gradient-text"
            >
              {countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
        <Button variant="glass" size="icon" onClick={onBack}>
          <X className="w-5 h-5" />
        </Button>

        {isRecording && (
          <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium text-foreground">
              {formatDuration(recordingDuration)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="glass" size="icon" onClick={() => setFlashOn(!flashOn)}>
            <Zap className={`w-5 h-5 ${flashOn ? "text-primary fill-primary" : ""}`} />
          </Button>
          <Button variant="glass" size="icon" onClick={switchCamera}>
            <SwitchCamera className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Right Side Tools */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
        {[
          { icon: Sparkles, label: "Filter", active: showFilterPanel, onClick: () => setShowFilterPanel(!showFilterPanel) },
          { icon: Gauge, label: "Speed", active: showSpeedPanel, onClick: () => setShowSpeedPanel(!showSpeedPanel) },
          { icon: Timer, label: "Timer", active: showTimerPanel, onClick: () => setShowTimerPanel(!showTimerPanel) },
          { icon: Music2, label: selectedSound ? "♫" : "Music", active: !!selectedSound, onClick: () => setShowSoundLibrary(true) },
        ].map((tool) => (
          <motion.button
            key={tool.label}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={tool.onClick}
            className={`glass p-3 rounded-xl flex flex-col items-center gap-1 ${
              tool.active ? "border-primary bg-primary/20" : ""
            }`}
          >
            <tool.icon className="w-5 h-5 text-foreground" />
            <span className="text-[10px] text-foreground/70">{tool.label}</span>
          </motion.button>
        ))}
        {selectedSound && (
          <div className="glass px-2 py-1 rounded-lg max-w-[60px]">
            <p className="text-[8px] text-primary truncate text-center">{selectedSound.title}</p>
          </div>
        )}
      </div>

      {/* Speed Panel */}
      <AnimatePresence>
        {showSpeedPanel && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-20 top-1/2 -translate-y-1/2 glass p-3 rounded-xl z-10"
          >
            <div className="flex flex-col gap-2">
              {speedOptions.map((speed) => (
                <button
                  key={speed.value}
                  onClick={() => {
                    setSelectedSpeed(speed.value);
                    setShowSpeedPanel(false);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedSpeed === speed.value
                      ? "gradient-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {speed.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer Panel */}
      <AnimatePresence>
        {showTimerPanel && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-20 top-1/2 -translate-y-1/2 glass p-3 rounded-xl z-10"
          >
            <div className="flex flex-col gap-2">
              {timerOptions.map((timer) => (
                <button
                  key={timer}
                  onClick={() => {
                    setSelectedTimer(timer);
                    setShowTimerPanel(false);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedTimer === timer
                      ? "gradient-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {timer === 0 ? "Off" : `${timer}s`}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Bar */}
      <AnimatePresence>
        {showFilterPanel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-40 left-0 right-0 px-4 z-10"
          >
            <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2">
              {filters.map((filter) => (
                <motion.button
                  key={filter.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedFilter.id === filter.id
                      ? "gradient-primary text-primary-foreground"
                      : "glass text-foreground"
                  }`}
                >
                  {filter.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6 z-10">
        {isRecording ? (
          <>
            <Button variant="glass" size="icon" className="rounded-full w-14 h-14" onClick={resetRecording}>
              <RotateCcw className="w-6 h-6" />
            </Button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={pauseRecording}
              className="w-20 h-20 rounded-full border-4 border-foreground flex items-center justify-center bg-destructive"
            >
              {isPaused ? (
                <Play className="w-8 h-8 text-foreground fill-foreground" />
              ) : (
                <Pause className="w-8 h-8 text-foreground fill-foreground" />
              )}
            </motion.button>

            <Button variant="glow" size="icon" className="rounded-full w-14 h-14" onClick={stopRecording}>
              <Check className="w-6 h-6" />
            </Button>
          </>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startRecording}
            className="w-20 h-20 rounded-full border-4 border-foreground flex items-center justify-center bg-transparent"
          >
            <div className="w-16 h-16 rounded-full gradient-accent" />
          </motion.button>
        )}
      </div>
      {/* Sound Library */}
      <SoundLibrary
        isOpen={showSoundLibrary}
        onClose={() => setShowSoundLibrary(false)}
        onSelectSound={(sound) => {
          setSelectedSound(sound);
          toast.success(`Sound selected: ${sound.title}`);
        }}
      />
    </div>
  );
};
