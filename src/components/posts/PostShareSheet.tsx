import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, MessageCircle, Mail, Send, Copy, Check } from "lucide-react";
import { Post } from "@/hooks/usePosts";
import { useState } from "react";
import { toast } from "sonner";

// Social brand icons as simple components
const WhatsAppIcon = () => <Send className="w-6 h-6 text-white" />;
const TwitterIcon = () => <span className="text-white font-bold text-sm">𝕏</span>;
const FacebookIcon = () => <span className="text-white font-bold text-lg">f</span>;

interface PostShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
}

export const PostShareSheet = ({ open, onOpenChange, post }: PostShareSheetProps) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/posts/${post.id}`;
  const shareText = post.content?.slice(0, 60) || "Check out this post!";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: shareText, url: shareUrl }); onOpenChange(false); } catch {}
    } else { handleCopy(); }
  };

  const shareOptions = [
    { name: "Copy", icon: copied ? Check : Copy, onClick: handleCopy, color: "bg-muted" },
    { name: "Messages", icon: MessageCircle, onClick: () => window.open(`sms:?body=${encodeURIComponent(shareText + " " + shareUrl)}`), color: "bg-green-500" },
    { name: "WhatsApp", icon: WhatsAppIcon, onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`), color: "bg-green-600" },
    { name: "X", icon: () => <TwitterIcon />, onClick: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`), color: "bg-black" },
    { name: "Facebook", icon: () => <FacebookIcon />, onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`), color: "bg-blue-600" },
    { name: "Email", icon: Mail, onClick: () => window.open(`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`), color: "bg-orange-500" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => onOpenChange(false)} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl border-t border-border shadow-2xl"
          >
            <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
            <div className="flex items-center justify-between px-4 pb-4">
              <h3 className="text-lg font-semibold text-foreground">Share</h3>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-full bg-muted/50"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-4 pb-6">
              <div className="grid grid-cols-4 gap-4">
                {shareOptions.map((opt, i) => (
                  <motion.button key={opt.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileTap={{ scale: 0.95 }} onClick={opt.onClick} className="flex flex-col items-center gap-2">
                    <div className={`w-14 h-14 rounded-full ${opt.color} flex items-center justify-center`}>
                      <opt.icon />
                    </div>
                    <span className="text-xs text-muted-foreground">{opt.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
            <div className="px-4 pb-6">
              <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Link2 className="w-5 h-5 text-muted-foreground" /></div>
                <p className="text-xs text-muted-foreground truncate flex-1">{shareUrl}</p>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleNativeShare} className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">Share</motion.button>
              </div>
            </div>
            <div className="h-8" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
