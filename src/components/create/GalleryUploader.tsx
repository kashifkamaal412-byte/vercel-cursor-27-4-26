import { useState, useRef, useEffect } from "react";
import { Upload, X, Film, Zap, Sparkles, Play, Pause, Camera } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface GalleryUploaderProps {
  onBack: () => void;
  onVideoSelected: (file: File, skipEditor?: boolean) => void;
  videoType?: "short" | "long" | null;
  onOpenCamera?: () => void;
}

export const GalleryUploader = ({ onBack, onVideoSelected, videoType, onOpenCamera }: GalleryUploaderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("video/")) { toast.error("Please select a video file"); return; }
    if (file.size > 500 * 1024 * 1024) { toast.error("Video must be less than 500MB"); return; }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handlePlayPause = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) { vid.play(); setIsPlaying(true); }
    else { vid.pause(); setIsPlaying(false); }
  };

  const handleConfirm = (skipEditor: boolean = false) => {
    if (selectedFile) onVideoSelected(selectedFile, skipEditor);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <X className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">
          {videoType === "short" ? "Short Video" : videoType === "long" ? "Long Video" : "Upload Video"}
        </h1>
        <div className="w-16" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {selectedFile && previewUrl ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black">
              {/* ACTUAL playable video preview */}
              <video
                ref={videoRef}
                src={previewUrl}
                className="w-full h-full object-contain"
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
              
              {/* Play/Pause overlay */}
              <button
                onClick={handlePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-transparent"
              >
                {!isPlaying && (
                  <div className="bg-black/50 p-4 rounded-full backdrop-blur-sm">
                    <Play className="w-10 h-10 text-white fill-white" />
                  </div>
                )}
              </button>

              {/* Close button */}
              <button onClick={clearSelection} className="absolute top-3 right-3 glass p-2 rounded-full z-10">
                <X className="w-4 h-4" />
              </button>

              {/* Seekable controls bar */}
              <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                <input
                  type="range"
                  min={0}
                  max={videoRef.current?.duration || 100}
                  step={0.1}
                  value={videoRef.current?.currentTime || 0}
                  onChange={(e) => {
                    if (videoRef.current) videoRef.current.currentTime = parseFloat(e.target.value);
                  }}
                  className="w-full h-1 accent-primary cursor-pointer"
                />
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground/70">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              <Button variant="glow" className="w-full" onClick={() => handleConfirm(false)}>
                <Sparkles className="w-4 h-4 mr-2" /> Edit First
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => handleConfirm(true)}>
                Skip Editing
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm space-y-4"
          >
            {/* Camera button */}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => {
                // Use capture attribute to open camera directly
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "video/*";
                input.capture = "environment";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileSelect(file);
                };
                input.click();
              }}
              className="w-full p-5 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground flex items-center gap-4 shadow-lg"
            >
              <div className="p-3 bg-white/20 rounded-xl">
                <Camera className="w-7 h-7" />
              </div>
              <div className="text-left">
                <p className="font-bold text-base">Record Video</p>
                <p className="text-xs opacity-80">Open camera & record</p>
              </div>
            </motion.button>

            {/* Gallery upload area */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={`w-full aspect-[9/16] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer ${
                isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/30 hover:border-primary/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleInputChange} />
              <motion.div animate={{ y: isDragging ? -10 : 0 }} className="flex flex-col items-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  {isDragging ? <Film className="w-12 h-12 text-primary" /> : <Upload className="w-12 h-12 text-muted-foreground" />}
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">{isDragging ? "Drop video here" : "From Gallery"}</h3>
                <p className="text-sm text-muted-foreground text-center px-4">Tap to browse or drag & drop</p>
                <p className="text-xs text-muted-foreground/70 mt-2">MP4, MOV, WebM up to 500MB</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
