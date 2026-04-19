import { useState, useEffect } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDownloadManager } from "@/hooks/useDownloadManager";
import { Video } from "@/hooks/useVideos";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DownloadButtonProps {
  video: Video;
  className?: string;
  iconSize?: number;
  showLabel?: boolean;
}

export const DownloadButton = ({ 
  video, 
  className,
  iconSize = 20,
  showLabel = false 
}: DownloadButtonProps) => {
  const { downloadVideo, isDownloaded, getProgress } = useDownloadManager();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "downloading" | "complete">("idle");

  const downloaded = isDownloaded(video.id);
  const currentProgress = getProgress(video.id);

  useEffect(() => {
    if (downloaded) {
      setStatus("complete");
      setProgress(100);
    } else if (currentProgress) {
      setProgress(currentProgress.progress);
      setStatus(currentProgress.status === "complete" ? "complete" : "downloading");
    }
  }, [downloaded, currentProgress]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (status === "complete" || status === "downloading") return;

    if (!video.video_url) {
      toast.error("Video URL not available");
      return;
    }

    setStatus("downloading");
    toast.info("Starting download...");

    const success = await downloadVideo(video, (prog) => {
      setProgress(prog);
    });

    if (success) {
      setStatus("complete");
      toast.success("Downloaded for offline viewing");
    } else {
      setStatus("idle");
      setProgress(0);
      toast.error("Download failed. Please try again.");
    }
  };

  // Progress ring calculations
  const radius = (iconSize + 6) / 2;
  const circumference = 2 * Math.PI * (radius - 2);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <button
      onClick={handleDownload}
      disabled={status === "downloading"}
      className={cn(
        "relative flex items-center justify-center transition-all duration-200",
        status === "complete" && "text-primary",
        className
      )}
    >
      <AnimatePresence mode="wait">
        {status === "downloading" ? (
          <motion.div
            key="downloading"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative flex items-center justify-center"
          >
            {/* Progress ring */}
            <svg
              width={iconSize + 12}
              height={iconSize + 12}
              className="absolute -rotate-90"
            >
              {/* Background circle */}
              <circle
                cx={(iconSize + 12) / 2}
                cy={(iconSize + 12) / 2}
                r={radius - 2}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.2}
                strokeWidth={2}
              />
              {/* Progress circle */}
              <circle
                cx={(iconSize + 12) / 2}
                cy={(iconSize + 12) / 2}
                r={radius - 2}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-150"
              />
            </svg>
            
            {/* Percentage text */}
            <span className="text-[9px] font-bold text-primary">
              {Math.round(progress)}%
            </span>
          </motion.div>
        ) : status === "complete" ? (
          <motion.div
            key="complete"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex items-center gap-1"
          >
            <Check style={{ width: iconSize, height: iconSize }} className="text-primary" />
            {showLabel && <span className="text-xs text-primary">Downloaded</span>}
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex items-center gap-1"
          >
            <Download style={{ width: iconSize, height: iconSize }} />
            {showLabel && <span className="text-xs">Download</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};
