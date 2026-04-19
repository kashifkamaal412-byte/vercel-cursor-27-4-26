import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  X,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  RefreshCw,
  Sparkles,
  Wifi,
  Radio,
  Sun,
  Globe,
  Lock,
  Users,
  ImagePlus,
} from "lucide-react";
import { useLiveStream } from "@/hooks/useLiveStream";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreatorLiveSetupProps {
  onStartLive: (streamId: string) => void;
  onExit: () => void;
}

export const CreatorLiveSetup = ({ onStartLive, onExit }: CreatorLiveSetupProps) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [audienceType, setAudienceType] = useState("public");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [beautyFilter, setBeautyFilter] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [isStarting, setIsStarting] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<"good" | "medium" | "poor">("good");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const { createStream } = useLiveStream();

  // Local camera preview (no Zego here — Zego joins only in CreatorLiveRoom)
  useEffect(() => {
    const startPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: micOn,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        toast.error("Camera access denied");
      }
    };
    if (cameraOn) {
      startPreview();
    } else {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOn, facingMode]);

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Thumbnail must be under 5MB");
      return;
    }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleStartLive = async () => {
    if (!title.trim()) {
      toast.error("Please enter a live title");
      return;
    }
    setIsStarting(true);

    try {
      // Stop local preview before handing off to Zego in CreatorLiveRoom
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      // Upload thumbnail if selected
      let thumbnailUrl: string | null = null;
      if (thumbnailFile) {
        const ext = thumbnailFile.name.split(".").pop();
        const path = `live/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("thumbnails").upload(path, thumbnailFile);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(path);
          thumbnailUrl = urlData.publicUrl;
        }
      }

      const streamData = await createStream(title, category, audienceType, thumbnailUrl);
      onStartLive(streamData.id);
    } catch (e: any) {
      toast.error(e.message || "Failed to start live");
      setIsStarting(false);
    }
  };

  const networkColors = { good: "text-green-400", medium: "text-yellow-400", poor: "text-red-400" };

  const categories = [
    { value: "general", label: "General" },
    { value: "music", label: "Music" },
    { value: "gaming", label: "Gaming" },
    { value: "chat", label: "Just Chatting" },
    { value: "comedy", label: "Comedy" },
    { value: "education", label: "Education" },
    { value: "sports", label: "Sports" },
    { value: "cooking", label: "Cooking" },
    { value: "beauty", label: "Beauty" },
    { value: "talent", label: "Talent Show" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between p-4 z-10">
        <Button variant="ghost" size="icon" onClick={onExit}>
          <X className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">Go Live</h1>
        <div className={`flex items-center gap-1 ${networkColors[networkQuality]}`}>
          <Wifi className="w-4 h-4" />
          <span className="text-xs capitalize">{networkQuality}</span>
        </div>
      </div>

      <div className="relative mx-4 rounded-2xl overflow-hidden bg-black aspect-[9/14] max-h-[45vh]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{
            filter: `brightness(${brightness}%) blur(${beautyFilter * 0.3}px) saturate(${100 + beautyFilter * 10}%)`,
            transform: facingMode === "user" ? "scaleX(-1)" : "none",
          }}
        />
        {!cameraOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <CameraOff className="w-16 h-16 text-muted-foreground" />
          </div>
        )}

        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <Button
            size="icon"
            variant="outline"
            className="w-9 h-9 bg-black/40 border-white/20 backdrop-blur-sm"
            onClick={() => setCameraOn(!cameraOn)}
          >
            {cameraOn ? <Camera className="w-4 h-4 text-white" /> : <CameraOff className="w-4 h-4 text-white" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="w-9 h-9 bg-black/40 border-white/20 backdrop-blur-sm"
            onClick={() => setMicOn(!micOn)}
          >
            {micOn ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-white" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="w-9 h-9 bg-black/40 border-white/20 backdrop-blur-sm"
            onClick={() => setFacingMode((f) => (f === "user" ? "environment" : "user"))}
          >
            <RefreshCw className="w-4 h-4 text-white" />
          </Button>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <input
              type="range"
              min="0"
              max="10"
              value={beautyFilter}
              onChange={(e) => setBeautyFilter(Number(e.target.value))}
              className="flex-1 accent-primary h-1"
            />
          </div>
          <div className="flex-1 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
            <Sun className="w-3.5 h-3.5 text-yellow-400" />
            <input
              type="range"
              min="50"
              max="150"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="flex-1 accent-yellow-400 h-1"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter live title..."
          maxLength={80}
          className="bg-card border-border/50 text-foreground"
        />

        {/* Thumbnail Upload */}
        <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailSelect} />
        <button
          onClick={() => thumbnailInputRef.current?.click()}
          className="w-full flex items-center gap-3 p-3 bg-card border border-border/50 rounded-xl text-left"
        >
          {thumbnailPreview ? (
            <img src={thumbnailPreview} className="w-14 h-14 rounded-lg object-cover" alt="Thumbnail" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-foreground">Thumbnail</p>
            <p className="text-xs text-muted-foreground">{thumbnailFile ? thumbnailFile.name : "Add a cover image (optional)"}</p>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-card border-border/50">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={audienceType} onValueChange={setAudienceType}>
            <SelectTrigger className="bg-card border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Public
                </div>
              </SelectItem>
              <SelectItem value="friends">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> Friends
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Private
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            onClick={handleStartLive}
            disabled={isStarting || !title.trim()}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-2xl shadow-lg shadow-red-500/30"
          >
            {isStarting ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Starting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Radio className="w-6 h-6" />
                START LIVE
              </div>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
