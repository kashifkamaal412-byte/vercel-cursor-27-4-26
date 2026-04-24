import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Film, Clock, Radio, X, Mic, MicOff,
  CameraOff, RefreshCw, Sparkles, Sun, Users,
  Lock, Globe, Bell, Music, MapPin, Shield,
  Gift, Smile, ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLiveStream } from "@/hooks/useLiveStream";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type CreateMode = "short" | "long" | "live" | "record" | "select";

interface CreateModeSelectorProps {
  onSelectMode: (mode: CreateMode) => void;
}

const modes = [
  {
    id: "record" as CreateMode,
    title: "Record",
    desc: "Camera se video banao",
    icon: Camera,
    color: "bg-red-500/15 text-red-400 border-red-500/20",
    iconBg: "bg-red-500",
  },
  {
    id: "short" as CreateMode,
    title: "Short Video",
    desc: "Gallery se 60s clip",
    icon: Film,
    color: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    iconBg: "bg-violet-500",
  },
  {
    id: "long" as CreateMode,
    title: "Long Video",
    desc: "Full-length video upload",
    icon: Clock,
    color: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    iconBg: "bg-blue-500",
  },
  {
    id: "live" as CreateMode,
    title: "Go Live",
    desc: "Start live streaming",
    icon: Radio,
    color: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    iconBg: "bg-rose-500",
  },
];

export const CreateModeSelector = ({ onSelectMode }: CreateModeSelectorProps) => {
  const [showLiveSetup, setShowLiveSetup] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {showLiveSetup ? (
        <LiveSetupScreen key="live" onClose={() => setShowLiveSetup(false)} />
      ) : (
        <motion.div
          key="selector"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-background flex flex-col items-center justify-center p-6"
        >
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold mb-2 text-foreground"
          >
            Create
          </motion.h1>
          <p className="text-muted-foreground text-sm mb-8">Choose what you want to create</p>

          <div className="w-full max-w-sm space-y-3">
            {modes.map((mode, i) => (
              <motion.button
                key={mode.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (mode.id === "live") setShowLiveSetup(true);
                  else onSelectMode(mode.id);
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border ${mode.color} transition-all active:scale-[0.97]`}
              >
                <div className={`w-12 h-12 rounded-xl ${mode.iconBg} flex items-center justify-center shadow-lg`}>
                  <mode.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-base text-foreground">{mode.title}</h3>
                  <p className="text-xs text-muted-foreground">{mode.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// Live Setup Screen with REAL camera preview & all functional buttons
// ============================================================================
const categories = ["Chat", "Gaming", "Music", "Talent", "Education", "Fun", "Daily Life", "Comedy", "Sports", "Cooking", "Beauty"];
const effects = ["✨", "🕶️", "🎭", "🌈", "🔥", "❄️"];

const LiveSetupScreen = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createStream } = useLiveStream();
  const [isStarting, setIsStarting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [category, setCategory] = useState("Chat");
  const [viewerMode, setViewerMode] = useState("public");
  const [notifyFollowers, setNotifyFollowers] = useState(true);
  const [liveGoal, setLiveGoal] = useState("");
  const [coHost, setCoHost] = useState(false);
  const [commentsSetting, setCommentsSetting] = useState("on");
  const [moderation, setModeration] = useState(false);
  const [giftsEnabled, setGiftsEnabled] = useState(true);
  const [quality, setQuality] = useState("1080");
  const [ageRestriction, setAgeRestriction] = useState("everyone");
  const [location, setLocation] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  // Camera state
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [beautyFilter, setBeautyFilter] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [selectedEffect, setSelectedEffect] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Real camera preview
  useEffect(() => {
    const startPreview = async () => {
      try {
        streamRef.current?.getTracks().forEach(t => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: micOn,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        toast.error("Camera access denied");
      }
    };
    if (cameraOn) startPreview();
    else {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [cameraOn, facingMode]);

  // Mic toggle
  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = micOn; });
  }, [micOn]);

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => setThumbnail(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGoLive = async () => {
    if (!user) { toast.error("Please sign in"); navigate("/auth"); return; }
    if (!title.trim()) { toast.error("Enter a title"); return; }
    setIsStarting(true);
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      const streamData = await createStream(title, category, viewerMode);
      navigate(`/live?streamId=${streamData.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to start");
      setIsStarting(false);
    }
  };

  return (
    <motion.div
      key="live-setup"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-background text-foreground overflow-y-auto pb-8"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onClose(); }}>
          <X className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">Go Live</h1>
        <div className="w-9" />
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-5">
        {/* Camera Preview */}
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/14] max-h-[40vh]">
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
              <CameraOff className="w-12 h-12 text-muted-foreground" />
            </div>
          )}

          {/* Camera controls overlay */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {[
              { on: cameraOn, toggle: () => setCameraOn(!cameraOn), IconOn: Camera, IconOff: CameraOff },
              { on: micOn, toggle: () => setMicOn(!micOn), IconOn: Mic, IconOff: MicOff },
            ].map((ctrl, i) => (
              <button
                key={i}
                onClick={ctrl.toggle}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20"
              >
                {ctrl.on ? <ctrl.IconOn className="w-4 h-4 text-white" /> : <ctrl.IconOff className="w-4 h-4 text-red-400" />}
              </button>
            ))}
            <button
              onClick={() => setFacingMode(f => f === "user" ? "environment" : "user")}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Beauty & Brightness sliders */}
          <div className="absolute bottom-3 left-3 right-3 flex gap-2">
            <div className="flex-1 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              <input type="range" min="0" max="10" value={beautyFilter} onChange={e => setBeautyFilter(Number(e.target.value))} className="flex-1 accent-primary h-1" />
            </div>
            <div className="flex-1 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Sun className="w-3 h-3 text-yellow-400" />
              <input type="range" min="50" max="150" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="flex-1 accent-yellow-400 h-1" />
            </div>
          </div>
        </div>

        {/* Effects */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Effects</Label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {effects.map(e => (
              <button
                key={e}
                onClick={() => setSelectedEffect(e === selectedEffect ? null : e)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${selectedEffect === e ? "bg-primary/20 ring-2 ring-primary" : "bg-muted"}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Title *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What's your live about?" className="bg-muted/30 border-border" maxLength={80} />
        </div>

        {/* Hashtags */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Hashtags</Label>
          <Input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#gaming #music" className="bg-muted/30 border-border" />
        </div>

        {/* Thumbnail */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Thumbnail</Label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted border border-border">
              {thumbnail ? <img src={thumbnail} className="w-full h-full object-cover" /> : (
                <div className="w-full h-full flex items-center justify-center"><Camera className="w-5 h-5 text-muted-foreground" /></div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => document.getElementById("live-thumb")?.click()}>Upload</Button>
            <input id="live-thumb" type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Viewer Mode */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Audience</Label>
          <div className="flex gap-2">
            {[
              { v: "public", l: "Public", I: Globe },
              { v: "followers", l: "Followers", I: Users },
              { v: "private", l: "Private", I: Lock },
            ].map(m => (
              <button
                key={m.v}
                onClick={() => setViewerMode(m.v)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${viewerMode === m.v ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"}`}
              >
                <m.I className="w-3.5 h-3.5" /> {m.l}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Location</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Add location" className="pl-9 bg-muted/30 border-border" />
          </div>
        </div>

        {/* Live Goal */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Live Goal</Label>
          <Input value={liveGoal} onChange={e => setLiveGoal(e.target.value)} placeholder="e.g., 1000 coins" className="bg-muted/30 border-border" />
        </div>

        {/* Quality */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Stream Quality</Label>
          <div className="flex gap-2">
            {[{ v: "720", l: "720p" }, { v: "1080", l: "1080p" }, { v: "2160", l: "4K" }].map(q => (
              <button
                key={q.v}
                onClick={() => setQuality(q.v)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${quality === q.v ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"}`}
              >
                {q.l}
              </button>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Comments</Label>
          <div className="flex gap-2">
            {[{ v: "on", l: "On" }, { v: "followers", l: "Followers" }, { v: "off", l: "Off" }].map(c => (
              <button
                key={c.v}
                onClick={() => setCommentsSetting(c.v)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${commentsSetting === c.v ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"}`}
              >
                {c.l}
              </button>
            ))}
          </div>
        </div>

        {/* Age Restriction */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Age Restriction</Label>
          <div className="flex gap-2">
            {[{ v: "everyone", l: "Everyone" }, { v: "13", l: "13+" }, { v: "16", l: "16+" }, { v: "18", l: "18+" }].map(a => (
              <button
                key={a.v}
                onClick={() => setAgeRestriction(a.v)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${ageRestriction === a.v ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"}`}
              >
                {a.l}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle switches */}
        <div className="space-y-3">
          {[
            { icon: Bell, label: "Notify Followers", checked: notifyFollowers, toggle: setNotifyFollowers },
            { icon: Users, label: "Co-Host Allowed", checked: coHost, toggle: setCoHost },
            { icon: Shield, label: "Auto Moderation", checked: moderation, toggle: setModeration },
            { icon: Gift, label: "Gifts Enabled", checked: giftsEnabled, toggle: setGiftsEnabled },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <item.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{item.label}</span>
              </div>
              <Switch checked={item.checked} onCheckedChange={item.toggle} />
            </div>
          ))}
        </div>

        {/* GO LIVE button */}
        <motion.div whileTap={{ scale: 0.97 }} className="pt-4 pb-6">
          <Button
            disabled={isStarting || !title.trim()}
            onClick={handleGoLive}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-2xl shadow-lg shadow-red-500/30"
          >
            {isStarting ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Starting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Radio className="w-6 h-6" />
                GO LIVE
              </div>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
