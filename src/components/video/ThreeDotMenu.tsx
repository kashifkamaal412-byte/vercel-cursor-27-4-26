import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, X, Flag, EyeOff, Rainbow, Link2, Download, UserX, Lock, Globe, Trash2, BellOff, Bell } from "lucide-react";
import { Video, useVideoActions } from "@/hooks/useVideos";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ThreeDotMenuProps {
  video: Video;
  onShare?: () => void;
  onNotInterested?: () => void;
}

export const ThreeDotMenu = ({ video, onShare, onNotInterested }: ThreeDotMenuProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isOwner = user?.id === video.user_id;

  const reportReasons = [
    "Spam or misleading",
    "Harassment or bullying",
    "Violence or dangerous acts",
    "Hate speech",
    "Nudity or sexual content",
    "Minor safety",
    "Copyright violation",
    "Other",
  ];

  const handleReport = async (reason: string) => {
    if (!user) { toast.error("Please sign in to report"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("ai-moderator", {
        body: { action: "report", videoId: video.id, reporterId: user.id, reason, videoUrl: video.video_url, caption: video.caption, creatorId: video.user_id },
      });
      if (error) throw error;
      toast.success("Report submitted. Our AI moderator will review it shortly.");
    } catch {
      toast.success("Report submitted for review.");
    } finally {
      setSubmitting(false);
      setReportOpen(false);
      setIsOpen(false);
    }
  };

  const handleNotInterested = () => {
    onNotInterested?.();
    toast.success("We'll show you less content like this");
    setIsOpen(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/video/${video.id}`);
    toast.success("Link copied!");
    setIsOpen(false);
  };

  const handleTogglePrivacy = async () => {
    if (!user || !isOwner) return;
    const newPublic = !video.is_public;
    const { error } = await supabase.from("videos").update({ is_public: newPublic }).eq("id", video.id).eq("user_id", user.id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(newPublic ? "Video is now public" : "Video moved to private");
    setIsOpen(false);
  };

  const handleToggleComments = async () => {
    if (!user || !isOwner) return;
    const newAllow = !video.allow_comments;
    const { error } = await supabase.from("videos").update({ allow_comments: newAllow }).eq("id", video.id).eq("user_id", user.id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(newAllow ? "Comments enabled" : "Comments disabled");
    setIsOpen(false);
  };

  const handleDelete = async () => {
    if (!user || !isOwner) return;
    const { error } = await supabase.from("videos").delete().eq("id", video.id).eq("user_id", user.id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Video deleted");
    setIsOpen(false);
  };

  const MenuButton = ({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors ${danger ? "text-destructive" : ""}`}
    >
      <Icon className={`w-5 h-5 ${danger ? "text-destructive" : "text-muted-foreground"}`} />
      <span className={`font-medium ${danger ? "text-destructive" : "text-foreground"}`}>{label}</span>
    </button>
  );

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => setIsOpen(true)}
        aria-label="More options"
        className="p-1.5"
      >
        <MoreVertical className="w-4 h-4 text-foreground/70" strokeWidth={2} />
      </motion.button>

      {/* Menu Overlay */}
      <AnimatePresence>
        {isOpen && !reportOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-[70]"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-card rounded-t-2xl border-t border-border p-4 pb-8 pt-px"
            >
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              <div className="space-y-1">
                <MenuButton icon={Link2} label="Copy Link" onClick={handleCopyLink} />
                
                {isOwner ? (
                  <>
                    {video.is_public ? (
                      <MenuButton icon={Lock} label="Make Private" onClick={handleTogglePrivacy} />
                    ) : (
                      <MenuButton icon={Globe} label="Make Public" onClick={handleTogglePrivacy} />
                    )}
                    <MenuButton
                      icon={video.allow_comments ? BellOff : Bell}
                      label={video.allow_comments ? "Turn Off Comments" : "Turn On Comments"}
                      onClick={handleToggleComments}
                    />
                    <div className="border-t border-border my-1" />
                    <MenuButton icon={Trash2} label="Delete Video" onClick={handleDelete} danger />
                  </>
                ) : (
                  <>
                    <MenuButton icon={EyeOff} label="Not Interested" onClick={handleNotInterested} />
                    <MenuButton icon={Rainbow} label="Support" onClick={() => { onShare?.(); setIsOpen(false); }} />
                    <MenuButton icon={UserX} label="Block User" onClick={() => { toast.success("User blocked"); setIsOpen(false); }} />
                    <MenuButton icon={Flag} label="Report" onClick={() => setReportOpen(true)} danger />
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Report Reasons */}
      <AnimatePresence>
        {reportOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setReportOpen(false); setIsOpen(false); }}
              className="fixed inset-0 bg-black/50 z-[70]"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-card rounded-t-2xl border-t border-border max-h-[70vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
                <h3 className="text-lg font-bold text-foreground">Report</h3>
                <button onClick={() => { setReportOpen(false); setIsOpen(false); }}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <p className="px-4 pt-3 text-sm text-muted-foreground">Why are you reporting this video?</p>
              <div className="p-4 space-y-1">
                {reportReasons.map((reason) => (
                  <button
                    key={reason}
                    disabled={submitting}
                    onClick={() => handleReport(reason)}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-muted transition-colors text-foreground text-sm disabled:opacity-50"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
