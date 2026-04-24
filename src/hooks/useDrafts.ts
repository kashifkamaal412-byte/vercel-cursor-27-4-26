import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Draft {
  id: string;
  user_id: string;
  video_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  description: string | null;
  video_type: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export const useDrafts = () => {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrafts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("drafts")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (!error && data) setDrafts(data as Draft[]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const saveDraft = async (draft: {
    videoFile: File | Blob;
    caption?: string;
    description?: string;
    videoType: string;
    metadata?: any;
  }) => {
    if (!user) {
      toast.error("Please sign in");
      return;
    }

    try {
      // Upload video to storage
      const fileName = `${user.id}/draft_${Date.now()}.mp4`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, draft.videoFile, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      // Generate thumbnail
      let thumbnailUrl: string | null = null;
      try {
        const video = document.createElement("video");
        video.src = URL.createObjectURL(draft.videoFile);
        video.muted = true;
        video.currentTime = 0.5;
        await new Promise((r) => (video.onloadeddata = r));
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbnailUrl = canvas.toDataURL("image/jpeg", 0.7);
        }
        URL.revokeObjectURL(video.src);
      } catch {
        // silent
      }

      const { error: insertError } = await supabase.from("drafts").insert({
        user_id: user.id,
        video_url: uploadData.path,
        thumbnail_url: thumbnailUrl,
        caption: draft.caption || null,
        description: draft.description || null,
        video_type: draft.videoType,
        metadata: draft.metadata || {},
      });

      if (insertError) throw insertError;

      toast.success("Draft saved!");
      fetchDrafts();
    } catch (err: any) {
      toast.error(err.message || "Failed to save draft");
    }
  };

  const deleteDraft = async (draftId: string) => {
    if (!user) return;
    try {
      const draft = drafts.find((d) => d.id === draftId);
      if (draft?.video_url) {
        await supabase.storage.from("videos").remove([draft.video_url]);
      }
      await supabase.from("drafts").delete().eq("id", draftId);
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      toast.success("Draft deleted");
    } catch {
      toast.error("Failed to delete draft");
    }
  };

  return { drafts, loading, saveDraft, deleteDraft, refetch: fetchDrafts };
};
