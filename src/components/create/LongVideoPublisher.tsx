import { useState, useEffect, useMemo, useRef } from "react";
import { ArrowLeft, Camera, Link as LinkIcon, Check, Loader2, AlertTriangle, MapPin, Globe, Users, Lock, ShieldAlert, Baby, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUpload } from "@/contexts/UploadContext";
import { VideoEditData } from "./VideoEditor";
import { LightweightEditData } from "./editor/LightweightVideoEditor";
import { useShotstackRender } from "@/hooks/useShotstackRender";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDrafts } from "@/hooks/useDrafts";

interface LongVideoPublisherProps {
  onBack: () => void;
  videoData: VideoEditData | LightweightEditData | Blob | File | null;
  onPublish: () => void;
}

type Visibility = "public" | "friends" | "private";
type CommentsControl = "everyone" | "friends" | "off";
type AgeRestriction = "everyone" | "kids" | "18+";

const MAX_VIDEO_FILE_SIZE = 500 * 1024 * 1024;

export const LongVideoPublisher = ({ onBack, videoData, onPublish }: LongVideoPublisherProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startUpload } = useUpload();
  const { saveDraft } = useDrafts();
  const { renderVideo, cancel: cancelRender, isRendering, progress, status, error: renderError } = useShotstackRender();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [location, setLocation] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [commentsControl, setCommentsControl] = useState<CommentsControl>("everyone");
  const [ageRestriction, setAgeRestriction] = useState<AgeRestriction>("everyone");
  const [copyrightConfirmed, setCopyrightConfirmed] = useState(false);
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

  // Auto thumbnail
  useEffect(() => {
    if (!videoPreviewUrl) return;
    const video = document.createElement('video');
    video.src = videoPreviewUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.currentTime = 1;
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 360;
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
      .from("thumbnails").upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (error) { console.error("Thumbnail upload error:", error); return autoThumbnailRef.current; }
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
    if (!title.trim()) { toast.error("Please enter a video title"); return; }
    if (!copyrightConfirmed) { toast.error("Please confirm copyright ownership"); return; }

    const thumbnailUrl = await uploadThumbnailToStorage(user.id);

    const videoMetadata = {
      is_public: visibility === "public",
      allow_comments: commentsControl !== "off",
      allow_duet: false,
      thumbnail_url: thumbnailUrl,
      location: location.trim() || null,
      description: description.trim().slice(0, 2000) || null,
      external_link: externalLink.trim() || null,
      age_restriction: ageRestriction,
    };

    if (hasEdits && videoData && 'source' in videoData) {
      setShowRenderProgress(true);
      setIsPublishing(true);
      try {
        const sourceFile = videoData.source;
        if (sourceFile.size > MAX_VIDEO_FILE_SIZE) {
          toast.error("Video file too large."); setIsPublishing(false); setShowRenderProgress(false); return;
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

        const { error: insertError } = await supabase.from("videos").insert({
          user_id: user.id,
          video_url: renderResult.permanentUrl,
          caption: title.trim().slice(0, 200),
          tags: description ? [description.slice(0, 500)] : null,
          video_type: "long",
          status: "ready",
          ...videoMetadata,
        });
        if (insertError) throw insertError;

        toast.success("Video published successfully!");
        onPublish(); navigate("/long-videos");
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
      if (file.size > MAX_VIDEO_FILE_SIZE) { toast.error("Video file too large."); return; }

      const uploadId = startUpload({
        file, userId: user.id,
        caption: title.trim().slice(0, 200),
        videoType: "long",
        isPublic: videoMetadata.is_public,
        allowComments: videoMetadata.allow_comments,
        allowDuet: false,
        thumbnailUrl: videoMetadata.thumbnail_url,
      });

      if (uploadId) {
        toast.success("Video upload started in background!");
        onPublish(); navigate("/long-videos");
      }
    }
  };

  const handleSaveDraft = async () => {
    if (!videoData) return;
    let file: File | Blob;
    if (videoData instanceof File || videoData instanceof Blob) file = videoData;
    else if ('source' in videoData && videoData.source) file = videoData.source;
    else { toast.error("No video to save"); return; }
    
    await saveDraft({
      videoFile: file,
      caption: title?.trim() || undefined,
      description: description?.trim() || undefined,
      videoType: "long",
    });
    onPublish();
  };

  const isProcessing = isPublishing || isRendering;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack} disabled={isProcessing}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Create Video</h1>
        <div className="w-10" />
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
                <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
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
      <div className="flex-1 p-4 space-y-5 overflow-y-auto pb-32">
        {/* Thumbnail Upload - 16:9 */}
        <button onClick={() => thumbnailInputRef.current?.click()} disabled={isProcessing}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-all overflow-hidden">
          {customThumbnail ? (
            <img src={customThumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <Camera className="w-7 h-7 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Tap to add thumbnail (16:9)</span>
            </>
          )}
        </button>
        <input ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />

        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-primary">Video Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a catchy title..." className="h-12 bg-muted/30 border-muted-foreground/20 rounded-xl"
            maxLength={100} disabled={isProcessing} />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-primary">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell your viewers about your video..."
            className="min-h-[100px] bg-muted/30 border-muted-foreground/20 rounded-xl resize-none"
            maxLength={2000} disabled={isProcessing} />
        </div>

        {/* External Link */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-primary">Link (Optional)</label>
          <div className="relative">
            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={externalLink} onChange={(e) => setExternalLink(e.target.value)}
              placeholder="https://yourlink.com" className="h-12 pl-11 bg-muted/30 border-muted-foreground/20 rounded-xl"
              disabled={isProcessing} />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-primary flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Location
          </label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="Add a location (optional)" className="h-12 bg-muted/30 border-muted-foreground/20 rounded-xl"
            maxLength={100} disabled={isProcessing} />
        </div>

        {/* Visibility */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-primary">Who can see this video?</label>
          <div className="flex gap-2">
            {([
              { value: "public" as Visibility, label: "Public", icon: Globe },
              { value: "friends" as Visibility, label: "Friends", icon: Users },
              { value: "private" as Visibility, label: "Private", icon: Lock },
            ]).map(opt => (
              <button key={opt.value} onClick={() => setVisibility(opt.value)} disabled={isProcessing}
                className={cn("flex-1 py-3 px-2 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-1.5",
                  visibility === opt.value ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                )}>
                <opt.icon className="w-4 h-4" /> {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Age Restriction */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-primary">Audience</label>
          <div className="flex gap-2">
            {([
              { value: "everyone" as AgeRestriction, label: "Everyone", icon: Globe },
              { value: "kids" as AgeRestriction, label: "For Kids", icon: Baby },
              { value: "18+" as AgeRestriction, label: "18+ Only", icon: ShieldAlert },
            ]).map(opt => (
              <button key={opt.value} onClick={() => setAgeRestriction(opt.value)} disabled={isProcessing}
                className={cn("flex-1 py-3 px-2 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-1.5",
                  ageRestriction === opt.value ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                )}>
                <opt.icon className="w-4 h-4" /> {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comments Control */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-primary">Comments</label>
          <div className="flex gap-2">
            {(["everyone", "friends", "off"] as CommentsControl[]).map(option => (
              <button key={option} onClick={() => setCommentsControl(option)} disabled={isProcessing}
                className={cn("flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all capitalize",
                  commentsControl === option ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                )}>
                {option === "everyone" ? "Everyone" : option === "friends" ? "Friends" : "Off"}
              </button>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-xl border border-muted-foreground/10">
          <Checkbox id="copyright" checked={copyrightConfirmed}
            onCheckedChange={(c) => setCopyrightConfirmed(c as boolean)} disabled={isProcessing} className="mt-1" />
          <label htmlFor="copyright" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
            I confirm that I own all rights to this video or have obtained necessary licenses.
          </label>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border">
        <div className="flex gap-3">
          <Button variant="outline" className="h-12 rounded-full gap-2" onClick={handleSaveDraft} disabled={isProcessing}>
            <Save className="w-4 h-4" /> Draft
          </Button>
          <Button variant="glow" className="flex-1 h-12 rounded-full gap-2"
            onClick={handlePublish} disabled={isProcessing || !title.trim() || !copyrightConfirmed}>
            {isProcessing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : (<>Publish Video <ArrowLeft className="w-4 h-4 rotate-180" /></>)}
          </Button>
        </div>
      </div>
    </div>
  );
};
