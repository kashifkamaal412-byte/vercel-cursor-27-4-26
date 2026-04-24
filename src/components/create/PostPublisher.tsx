import { useState, useEffect, useMemo, useRef } from "react";
import { X, Check, Hash, AtSign, MapPin, Users, Lock, Globe, Play, Loader2, AlertTriangle, Camera, ShieldAlert, Baby, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUpload } from "@/contexts/UploadContext";
import { VideoEditData } from "./VideoEditor";
import { LightweightEditData } from "./editor/LightweightVideoEditor";
import { VideoType } from "@/hooks/useVideos";
import { useShotstackRender } from "@/hooks/useShotstackRender";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDrafts } from "@/hooks/useDrafts";

interface PostPublisherProps {
  onBack: () => void;
  videoData: VideoEditData | LightweightEditData | Blob | File | null;
  onPublish: () => void;
  videoType?: VideoType;
}

type Privacy = "public" | "followers" | "private";
type AgeRestriction = "everyone" | "kids" | "18+";

const privacyOptions: { value: Privacy; label: string; icon: typeof Globe; description: string }[] = [
  { value: "public", label: "Public", icon: Globe, description: "Everyone can see" },
  { value: "followers", label: "Friends", icon: Users, description: "Only followers" },
  { value: "private", label: "Private", icon: Lock, description: "Only you" },
];

const MAX_VIDEO_FILE_SIZE = 500 * 1024 * 1024;

export const PostPublisher = ({ onBack, videoData, onPublish, videoType = "short" }: PostPublisherProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startUpload } = useUpload();
  const { saveDraft } = useDrafts();
  const { renderVideo, cancel: cancelRender, isRendering, progress, status, error: renderError } = useShotstackRender();

  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [location, setLocation] = useState("");
  const [ageRestriction, setAgeRestriction] = useState<AgeRestriction>("everyone");
  const [customThumbnail, setCustomThumbnail] = useState<string | null>(null);
  const [customThumbnailFile, setCustomThumbnailFile] = useState<File | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showRenderProgress, setShowRenderProgress] = useState(false);

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const autoThumbnailRef = useRef<string | null>(null);

  const hasEdits = useMemo(() => {
    if (!videoData || videoData instanceof File || videoData instanceof Blob) return false;
    if ('aspectRatio' in videoData) {
      const { trimStart, trimEnd, aspectRatio } = videoData;
      return trimStart > 0 || trimEnd < 100 || (aspectRatio !== "original" && aspectRatio !== "9:16" && aspectRatio !== "16:9");
    }
    if ('filter' in videoData) {
      const { trimStart, trimEnd, filter, brightness, contrast, speed, textOverlays, splitPoints } = videoData;
      return trimStart > 0 || trimEnd < 100 || filter !== "none" || brightness !== 100 || contrast !== 100 || speed !== 1 || textOverlays.length > 0 || splitPoints.length > 0;
    }
    return false;
  }, [videoData]);

  const videoPreviewUrl = useMemo(() => {
    if (!videoData) return null;
    if (videoData instanceof File || videoData instanceof Blob) return URL.createObjectURL(videoData);
    if ('source' in videoData && videoData.source) return URL.createObjectURL(videoData.source);
    return null;
  }, [videoData]);

  // Generate auto thumbnail
  useEffect(() => {
    if (!videoPreviewUrl) return;
    const video = document.createElement('video');
    video.src = videoPreviewUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.currentTime = 0.5;
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        autoThumbnailRef.current = canvas.toDataURL('image/jpeg', 0.8);
      }
    };
    video.load();
  }, [videoPreviewUrl]);

  useEffect(() => {
    return () => { if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl); };
  }, [videoPreviewUrl]);

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Thumbnail must be less than 5MB"); return; }
    setCustomThumbnailFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCustomThumbnail(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadThumbnailToStorage = async (userId: string): Promise<string | null> => {
    const file = customThumbnailFile;
    if (!file) return autoThumbnailRef.current;
    
    const fileName = `${userId}/${crypto.randomUUID()}.jpg`;
    const { data, error } = await supabase.storage
      .from("thumbnails")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });
    
    if (error) {
      console.error("Thumbnail upload error:", error);
      return autoThumbnailRef.current;
    }
    
    const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const getProgressMessage = () => {
    switch (status) {
      case 'starting': return 'Initializing render...';
      case 'rendering': return 'Processing your video...';
      case 'saving': return 'Saving to storage...';
      case 'complete': return 'Complete!';
      case 'error': return renderError || 'Error occurred';
      default: return 'Preparing...';
    }
  };

  const handlePublish = async () => {
    if (!user) { toast.error("Please sign in to publish"); return; }
    if (!videoData) { toast.error("No video to publish"); return; }

    const musicTitle = !videoData || videoData instanceof File || videoData instanceof Blob
      ? null
      : ("musicTitle" in videoData ? (videoData.musicTitle ?? null) : null);

    // Upload custom thumbnail to storage
    const thumbnailUrl = await uploadThumbnailToStorage(user.id);

    const videoMetadata = {
      is_public: privacy === "public",
      allow_comments: allowComments,
      allow_duet: allowDuet,
      thumbnail_url: thumbnailUrl,
      location: location.trim() || null,
      description: caption.trim().slice(0, 2200) || null,
      age_restriction: ageRestriction,
      music_title: musicTitle,
    };

    if (hasEdits && videoData && 'source' in videoData) {
      setShowRenderProgress(true);
      setIsPublishing(true);
      
      try {
        const sourceFile = videoData.source;
        if (sourceFile.size > MAX_VIDEO_FILE_SIZE) {
          toast.error("Video file too large. Maximum size is 500MB.");
          setIsPublishing(false); setShowRenderProgress(false); return;
        }

        const tempFileName = `${user.id}/temp_${Date.now()}.mp4`;
        const { data: tempUpload, error: tempError } = await supabase.storage
          .from("videos").upload(tempFileName, sourceFile, { cacheControl: "3600", upsert: false });
        if (tempError) throw new Error("Failed to upload source video: " + tempError.message);

        const { data: tempUrlData, error: signError } = await supabase.storage.from("videos").createSignedUrl(tempUpload.path, 3600);
        if (signError || !tempUrlData?.signedUrl) throw new Error("Failed to generate signed URL for source video");

        let aspectRatio = '16:9';
        if ('aspectRatio' in videoData) {
          const map: Record<string, string> = { "original": "16:9", "9:16": "9:16", "16:9": "16:9", "1:1": "1:1", "4:5": "4:5", "4:3": "4:3" };
          aspectRatio = map[videoData.aspectRatio] || "16:9";
        }

        const renderResult = await renderVideo(tempUrlData.signedUrl, {
          trimStart: videoData.trimStart, trimEnd: videoData.trimEnd, aspectRatio,
          audioVolume: videoData.videoVolume / 100,
        });

        await supabase.storage.from("videos").remove([tempFileName]);
        if (!renderResult.success || !renderResult.permanentUrl) throw new Error(renderResult.error || "Failed to process video");

        const hashtags = (caption.match(/#\w+/g) || []).map(t => t.slice(1)).slice(0, 10);

        const { error: insertError } = await supabase.from("videos").insert({
          user_id: user.id,
          video_url: renderResult.permanentUrl,
          caption: caption?.trim().slice(0, 500) || null,
          tags: hashtags.length > 0 ? hashtags : null,
          video_type: videoType,
          status: "ready",
          ...videoMetadata,
        });
        if (insertError) throw insertError;

        toast.success("Video published successfully!");
        onPublish(); navigate("/");
      } catch (error: any) {
        console.error("Publish error:", error);
        toast.error(error.message || "Failed to publish video");
      } finally {
        setIsPublishing(false); setShowRenderProgress(false);
      }
    } else {
      let file: File | Blob;
      if (videoData instanceof File || videoData instanceof Blob) file = videoData;
      else if (videoData && 'source' in videoData && videoData.source) file = videoData.source;
      else { toast.error("No valid video file found"); return; }

      if (file.size > MAX_VIDEO_FILE_SIZE) { toast.error("Video file too large. Maximum size is 500MB."); return; }

      const uploadId = startUpload({
        file, userId: user.id,
        caption: caption?.trim().slice(0, 500) || undefined,
        videoType: videoType === "live" ? "short" : videoType,
        isPublic: videoMetadata.is_public,
        allowComments: videoMetadata.allow_comments,
        allowDuet: videoMetadata.allow_duet,
        thumbnailUrl: videoMetadata.thumbnail_url,
        musicTitle: musicTitle,
      });

      if (uploadId) {
        // Update the video record with additional metadata after upload
        toast.success("Video upload started in background!");
        onPublish(); navigate("/");
      }
    }
  };

  const handleCancelRender = () => {
    cancelRender(); setIsPublishing(false); setShowRenderProgress(false);
  };

  const handleSaveDraft = async () => {
    if (!videoData) return;
    let file: File | Blob;
    if (videoData instanceof File || videoData instanceof Blob) file = videoData;
    else if ('source' in videoData && videoData.source) file = videoData.source;
    else { toast.error("No video to save"); return; }
    
    await saveDraft({
      videoFile: file,
      caption: caption?.trim() || undefined,
      videoType: videoType || "short",
    });
    onPublish();
  };

  const hashtags = (caption.match(/#\w+/g) || []).map(t => t.slice(1));
  const mentions = (caption.match(/@\w+/g) || []).map(m => m.slice(1));
  const isProcessing = isPublishing || isRendering;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack} disabled={isProcessing}>
          <X className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Post</h1>
        <Button variant="glow" size="sm" onClick={handlePublish} disabled={isProcessing}>
          {isProcessing ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (<><Check className="w-4 h-4 mr-1" /> Post</>)}
        </Button>
      </div>

      {/* Render Progress */}
      <AnimatePresence>
        {showRenderProgress && isRendering && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="bg-card border-b border-border">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-foreground">{getProgressMessage()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
                  <Button variant="ghost" size="sm" onClick={handleCancelRender} className="h-7 px-2 text-destructive">
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-primary to-cyan-400"
                  initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {renderError && !isRendering && (
        <div className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Render failed</p>
            <p className="text-xs text-destructive/80">{renderError}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto pb-8">
        {/* Video Preview + Thumbnail + Caption */}
        <div className="flex gap-4">
          {/* Thumbnail area */}
          <button
            onClick={() => thumbnailInputRef.current?.click()}
            disabled={isProcessing}
            className="w-24 h-32 rounded-xl bg-muted overflow-hidden flex-shrink-0 relative border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-all"
          >
            {customThumbnail ? (
              <img src={customThumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
            ) : videoPreviewUrl ? (
              <>
                <video src={videoPreviewUrl} className="w-full h-full object-cover" muted />
                <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px]">Thumbnail</span>
              </div>
            )}
            {hasEdits && (
              <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                Edited
              </div>
            )}
          </button>
          <input ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
          
          <div className="flex-1">
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption... Use #hashtags and @mentions"
              className="min-h-[120px] bg-transparent border-0 resize-none p-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
              maxLength={2200} disabled={isProcessing} />
            <p className="text-xs text-muted-foreground text-right mt-1">{caption.length}/2200</p>
          </div>
        </div>

        {/* Hashtags & Mentions */}
        {(hashtags.length > 0 || mentions.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {hashtags.map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm flex items-center gap-1">
                <Hash className="w-3 h-3" />{tag}
              </span>
            ))}
            {mentions.map(mention => (
              <span key={mention} className="px-3 py-1 rounded-full bg-secondary/20 text-secondary text-sm flex items-center gap-1">
                <AtSign className="w-3 h-3" />{mention}
              </span>
            ))}
          </div>
        )}

        {/* Privacy */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Who can view this video</h3>
          <div className="grid grid-cols-3 gap-2">
            {privacyOptions.map(option => (
              <button key={option.value} onClick={() => setPrivacy(option.value)} disabled={isProcessing}
                className={cn("p-3 rounded-xl flex flex-col items-center gap-2 transition-all",
                  privacy === option.value ? "gradient-primary text-primary-foreground" : "glass text-foreground",
                  isProcessing && "opacity-50"
                )}>
                <option.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" /> Location
          </label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="Add a location (optional)"
            className="h-11 bg-muted/30 border-muted-foreground/20 rounded-xl"
            maxLength={100} disabled={isProcessing} />
        </div>

        {/* Age Restriction */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Audience</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "everyone" as AgeRestriction, label: "Everyone", icon: Globe },
              { value: "kids" as AgeRestriction, label: "Made for Kids", icon: Baby },
              { value: "18+" as AgeRestriction, label: "18+ Only", icon: ShieldAlert },
            ]).map(opt => (
              <button key={opt.value} onClick={() => setAgeRestriction(opt.value)} disabled={isProcessing}
                className={cn("p-3 rounded-xl flex flex-col items-center gap-2 transition-all text-xs font-medium",
                  ageRestriction === opt.value ? "gradient-primary text-primary-foreground" : "glass text-foreground",
                  isProcessing && "opacity-50"
                )}>
                <opt.icon className="w-5 h-5" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Allow Comments</p>
              <p className="text-xs text-muted-foreground">Let viewers comment on your video</p>
            </div>
            <Switch checked={allowComments} onCheckedChange={setAllowComments} disabled={isProcessing} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Allow Duet</p>
              <p className="text-xs text-muted-foreground">Let others create duets</p>
            </div>
            <Switch checked={allowDuet} onCheckedChange={setAllowDuet} disabled={isProcessing} />
          </div>
        </div>

        {/* Save as Draft */}
        <Button
          variant="outline"
          className="w-full h-12 rounded-xl gap-2"
          onClick={handleSaveDraft}
          disabled={isProcessing}
        >
          <Save className="w-4 h-4" />
          Save as Draft
        </Button>
      </div>
    </div>
  );
};
