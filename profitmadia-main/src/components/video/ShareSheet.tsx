import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Link2,
  MessageCircle,
  Mail,
  Facebook,
  Twitter,
  Send,
  Copy,
  Check,
} from "lucide-react";
import { Video } from "@/hooks/useVideos";
import { useState } from "react";
import { toast } from "sonner";

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video;
}

export const ShareSheet = ({ isOpen, onClose, video }: ShareSheetProps) => {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = `${window.location.origin}/video/${video.id}`;
  const shareText = video.caption || "Check out this video!";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          text: shareText,
          url: shareUrl,
        });
        onClose();
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const shareOptions = [
    {
      name: "Copy Link",
      icon: copied ? Check : Copy,
      onClick: handleCopyLink,
      color: "bg-muted",
    },
    {
      name: "Messages",
      icon: MessageCircle,
      onClick: () => {
        window.open(`sms:?body=${encodeURIComponent(shareText + " " + shareUrl)}`);
      },
      color: "bg-green-500",
    },
    {
      name: "WhatsApp",
      icon: Send,
      onClick: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`);
      },
      color: "bg-green-600",
    },
    {
      name: "Twitter",
      icon: Twitter,
      onClick: () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`);
      },
      color: "bg-sky-500",
    },
    {
      name: "Facebook",
      icon: Facebook,
      onClick: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
      },
      color: "bg-blue-600",
    },
    {
      name: "Email",
      icon: Mail,
      onClick: () => {
        window.open(`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`);
      },
      color: "bg-orange-500",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl border-t border-border shadow-2xl max-h-[60vh] overflow-hidden"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4">
              <h3 className="text-lg font-semibold text-foreground">Share</h3>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-full glass"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Share Options Grid */}
            <div className="px-4 pb-6">
              <div className="grid grid-cols-4 gap-4">
                {shareOptions.map((option, index) => (
                  <motion.button
                    key={option.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={option.onClick}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className={`w-14 h-14 rounded-full ${option.color} flex items-center justify-center`}>
                      <option.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs text-muted-foreground">{option.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Link Preview */}
            <div className="px-4 pb-6">
              <div className="glass rounded-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {video.caption || "Video"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{shareUrl}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNativeShare}
                  className="px-4 py-2 rounded-full gradient-primary text-primary-foreground text-sm font-medium"
                >
                  Share
                </motion.button>
              </div>
            </div>

            {/* Safe area padding for mobile */}
            <div className="h-safe-area-inset-bottom" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
