import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Upload, Trash2, Film, Grid3X3, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Draft } from "@/hooks/useDrafts";
import { ContentSubTabs, getVideoSubTabs, SubTabId } from "./ContentSubTabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DraftsTabProps {
  drafts: Draft[];
  loading: boolean;
  onDelete: (id: string) => void;
}

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export const DraftsTab = ({ drafts, loading, onDelete }: DraftsTabProps) => {
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<SubTabId>("shorts");
  const [uploading, setUploading] = useState<string | null>(null);

  const shortDrafts = drafts.filter((d) => d.video_type === "short" || !d.video_type);
  const longDrafts = drafts.filter((d) => d.video_type === "long");

  const tabs = getVideoSubTabs(shortDrafts.length, longDrafts.length);
  const activeDrafts = subTab === "shorts" ? shortDrafts : longDrafts;

  const handleQuickUpload = async (draft: Draft) => {
    if (!draft.video_url) {
      toast.error("No video found in draft");
      return;
    }
    setUploading(draft.id);
    try {
      const { data: signedUrl } = await supabase.storage
        .from("videos")
        .createSignedUrl(draft.video_url, 3600);

      if (!signedUrl?.signedUrl) throw new Error("Failed to get video URL");

      const { error } = await supabase.from("videos").insert({
        user_id: draft.user_id,
        video_url: draft.video_url,
        thumbnail_url: draft.thumbnail_url,
        caption: draft.caption || "Untitled",
        description: draft.description,
        video_type: draft.video_type || "short",
        status: "ready",
        is_public: true,
      });

      if (error) throw error;

      await supabase.from("drafts").delete().eq("id", draft.id);
      onDelete(draft.id);
      toast.success("Video published!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <ContentSubTabs tabs={tabs} activeTab={subTab} onTabChange={setSubTab} />

      {activeDrafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            No {subTab === "shorts" ? "Short" : "Long Video"} Drafts
          </h3>
          <p className="text-sm text-muted-foreground">
            Save a {subTab === "shorts" ? "short" : "long"} video as draft to see it here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {activeDrafts.map((draft, index) => (
            <motion.div
              key={draft.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className="aspect-[9/16] relative overflow-hidden bg-muted group"
            >
              {draft.thumbnail_url ? (
                <img
                  src={draft.thumbnail_url}
                  alt={draft.caption || "Draft"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  {subTab === "long" ? (
                    <Film className="w-8 h-8 text-muted-foreground" />
                  ) : (
                    <Grid3X3 className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

              {/* Draft badge */}
              <div className="absolute top-1 left-1 bg-amber-500/90 text-white text-[9px] px-1.5 py-0.5 rounded-sm font-semibold">
                DRAFT
              </div>

              {/* Time */}
              <div className="absolute bottom-8 left-1 text-[10px] text-white/80">
                {formatTimeAgo(draft.updated_at)}
              </div>

              {/* Action buttons */}
              <div className="absolute bottom-1 left-1 right-1 flex gap-1">
                <button
                  onClick={() => handleQuickUpload(draft)}
                  disabled={uploading === draft.id}
                  className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground text-[10px] font-semibold py-1 rounded-sm disabled:opacity-50"
                >
                  {uploading === draft.id ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-3 h-3" /> Upload
                    </>
                  )}
                </button>
                <button
                  onClick={() => onDelete(draft.id)}
                  className="px-1.5 py-1 bg-destructive/80 text-destructive-foreground rounded-sm"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
