import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type VideoStatus = "processing" | "ready" | "failed";

interface VideoStatusBadgeProps {
  status: VideoStatus;
  className?: string;
}

export const VideoStatusBadge = ({ status, className }: VideoStatusBadgeProps) => {
  const statusConfig = {
    processing: {
      icon: Loader2,
      label: "Processing",
      className: "bg-yellow-500/80 text-yellow-950",
      iconClass: "animate-spin",
    },
    ready: {
      icon: CheckCircle,
      label: "Ready",
      className: "bg-green-500/80 text-green-950",
      iconClass: "",
    },
    failed: {
      icon: XCircle,
      label: "Failed",
      className: "bg-red-500/80 text-red-950",
      iconClass: "",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  // Don't show badge for ready videos (cleaner UI)
  if (status === "ready") return null;

  return (
    <div
      className={cn(
        "absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5",
        config.className,
        className
      )}
    >
      <Icon className={cn("w-3 h-3", config.iconClass)} />
      {config.label}
    </div>
  );
};
