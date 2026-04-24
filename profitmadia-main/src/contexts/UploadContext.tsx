import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadItem {
  id: string;
  fileName: string;
  thumbnailUrl: string | null;
  progress: number;
  status: "uploading" | "processing" | "complete" | "error" | "cancelled";
  message: string;
  videoId?: string;
}

interface UploadContextType {
  uploads: UploadItem[];
  startUpload: (params: {
    file: File | Blob;
    userId: string;
    caption?: string;
    videoType: "short" | "long";
    isPublic?: boolean;
    allowComments?: boolean;
    allowDuet?: boolean;
    thumbnailUrl?: string | null;
    musicTitle?: string | null;
  }) => string;
  cancelUpload: (id: string) => void;
  removeUpload: (id: string) => void;
  hasActiveUploads: boolean;
}

const UploadContext = createContext<UploadContextType | null>(null);

export const useUpload = () => {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used within UploadProvider");
  return ctx;
};

const MAX_VIDEO_FILE_SIZE = 500 * 1024 * 1024;

export const UploadProvider = ({ children }: { children: ReactNode }) => {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const cancelledRef = useRef<Set<string>>(new Set());

  const updateUpload = useCallback((id: string, updates: Partial<UploadItem>) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
  }, []);

  const startUpload = useCallback(
    (params: {
      file: File | Blob;
      userId: string;
      caption?: string;
      videoType: "short" | "long";
      isPublic?: boolean;
      allowComments?: boolean;
      allowDuet?: boolean;
      thumbnailUrl?: string | null;
      musicTitle?: string | null;
    }): string => {
      const id = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const fileName = params.file instanceof File ? params.file.name : "video.mp4";

      // Check file size
      if (params.file.size > MAX_VIDEO_FILE_SIZE) {
        toast.error("Video file too large. Maximum size is 500MB.");
        return "";
      }

      // Add to uploads list immediately
      setUploads((prev) => [
        ...prev,
        {
          id,
          fileName,
          thumbnailUrl: params.thumbnailUrl || null,
          progress: 0,
          status: "uploading",
          message: "Starting upload...",
        },
      ]);

      // Run upload in background
      (async () => {
        try {
          // Check if cancelled
          if (cancelledRef.current.has(id)) return;

          // Detect video duration
          let videoDuration = 0;
          try {
            const tempUrl = URL.createObjectURL(params.file);
            videoDuration = await new Promise<number>((resolve) => {
              const tempVideo = document.createElement("video");
              tempVideo.preload = "metadata";
              tempVideo.onloadedmetadata = () => {
                const dur = Number.isFinite(tempVideo.duration) ? Math.round(tempVideo.duration) : 0;
                URL.revokeObjectURL(tempUrl);
                resolve(dur);
              };
              tempVideo.onerror = () => {
                URL.revokeObjectURL(tempUrl);
                resolve(0);
              };
              tempVideo.src = tempUrl;
            });
          } catch { videoDuration = 0; }

          updateUpload(id, { progress: 5, message: "Uploading video..." });

          // Use crypto.randomUUID() for unpredictable filenames to prevent enumeration attacks
          const uploadFileName = `${params.userId}/${crypto.randomUUID()}.mp4`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("videos")
            .upload(uploadFileName, params.file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (cancelledRef.current.has(id)) return;

          if (uploadError) throw uploadError;

          updateUpload(id, { progress: 60, message: "Saving to database..." });

          // Store the relative path (not public URL) since bucket is private
          const storagePath = uploadData.path;

          // Extract hashtags
          const hashtags = (params.caption?.match(/#\w+/g) || [])
            .map((tag) => tag.slice(1))
            .slice(0, 10);

          if (cancelledRef.current.has(id)) {
            // Clean up uploaded file
            await supabase.storage.from("videos").remove([uploadFileName]);
            return;
          }

          updateUpload(id, { progress: 80, message: "Creating video record..." });

          const { data: videoRecord, error: insertError } = await supabase
            .from("videos")
            .insert({
              user_id: params.userId,
              video_url: storagePath,
              caption: params.caption?.trim().slice(0, 500) || null,
              tags: hashtags.length > 0 ? hashtags : null,
              video_type: params.videoType,
              is_public: params.isPublic ?? true,
              allow_comments: params.allowComments ?? true,
              allow_duet: params.allowDuet ?? true,
              thumbnail_url: params.thumbnailUrl || null,
              music_title: params.musicTitle ?? null,
              duration: videoDuration,
              status: "ready",
            } as any)
            .select()
            .single();

          if (insertError) throw insertError;

          updateUpload(id, {
            progress: 100,
            status: "complete",
            message: "Upload complete!",
            videoId: videoRecord.id,
          });

          toast.success("Video published successfully!");
        } catch (error: any) {
          console.error("Background upload error:", error);
          if (!cancelledRef.current.has(id)) {
            updateUpload(id, {
              status: "error",
              message: error.message || "Upload failed",
            });
            toast.error("Video upload failed: " + (error.message || "Unknown error"));
          }
        }
      })();

      return id;
    },
    [updateUpload]
  );

  const cancelUpload = useCallback((id: string) => {
    cancelledRef.current.add(id);
    setUploads((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: "cancelled", message: "Cancelled" } : u
      )
    );
    toast.info("Upload cancelled");
  }, []);

  const removeUpload = useCallback((id: string) => {
    cancelledRef.current.delete(id);
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const hasActiveUploads = uploads.some(
    (u) => u.status === "uploading" || u.status === "processing"
  );

  return (
    <UploadContext.Provider
      value={{ uploads, startUpload, cancelUpload, removeUpload, hasActiveUploads }}
    >
      {children}
    </UploadContext.Provider>
  );
};
