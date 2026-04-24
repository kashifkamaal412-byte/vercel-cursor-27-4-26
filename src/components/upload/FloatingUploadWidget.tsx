import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
import { X, Check, AlertCircle, Play, Minimize2, Maximize2, GripVertical } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { useUpload } from "@/contexts/UploadContext";
import { Button } from "@/components/ui/button";

export const FloatingUploadWidget = () => {
  const { uploads, cancelUpload, removeUpload } = useUpload();
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  const activeUploads = uploads.filter(
    (u) => u.status === "uploading" || u.status === "processing"
  );
  const recentCompleted = uploads.filter(
    (u) => u.status === "complete" || u.status === "error" || u.status === "cancelled"
  );

  // Handle drag end to keep position
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setPosition((prev) => ({
      x: prev.x + info.offset.x,
      y: prev.y + info.offset.y,
    }));
  }, []);

  if (uploads.length === 0) return null;

  // Calculate average progress for all active uploads
  const averageProgress = activeUploads.length > 0
    ? activeUploads.reduce((sum, u) => sum + u.progress, 0) / activeUploads.length
    : 0;

  return (
    <>
      {/* Invisible constraint boundary - full screen */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[99]" />
      
      <AnimatePresence>
        <motion.div
          drag
          dragControls={dragControls}
          dragMomentum={false}
          dragElastic={0.1}
          dragConstraints={constraintsRef}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, scale: 0.8, x: position.x, y: position.y }}
          animate={{ opacity: 1, scale: 1, x: position.x, y: position.y }}
          exit={{ opacity: 0, scale: 0.8 }}
          style={{ touchAction: "none" }}
          className="fixed bottom-20 right-4 z-[100] select-none"
        >
          {minimized ? (
            // Minimized: Small floating thumbnail with progress ring
            <motion.div
              layout
              className="relative cursor-grab active:cursor-grabbing"
              onClick={() => setMinimized(false)}
            >
              {/* Thumbnail with circular progress */}
              <div className="w-16 h-20 rounded-xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl overflow-hidden relative">
                {/* Thumbnail image */}
                {activeUploads[0]?.thumbnailUrl ? (
                  <img
                    src={activeUploads[0].thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Play className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                
                {/* Progress overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-white/20"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="url(#uploadGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${averageProgress * 0.88} 88`}
                    />
                    <defs>
                      <linearGradient id="uploadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                        <stop offset="100%" stopColor="#22d3ee" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute text-[10px] font-bold text-white">
                    {Math.round(averageProgress)}%
                  </span>
                </div>

                {/* Cancel button */}
                {activeUploads.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      activeUploads.forEach((u) => cancelUpload(u.id));
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center shadow-lg"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}

                {/* Upload count badge */}
                {activeUploads.length > 1 && (
                  <div className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-[10px] font-bold text-primary-foreground">
                      {activeUploads.length}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            // Expanded: Full widget
            <motion.div
              layout
              className="w-72 max-w-[calc(100vw-2rem)] bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Header - Draggable */}
              <div 
                className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {activeUploads.length > 0 
                      ? `Uploading (${activeUploads.length})` 
                      : "Recent Uploads"
                    }
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setMinimized(true)}
                  >
                    <Minimize2 className="w-3 h-3" />
                  </Button>
                  {recentCompleted.length > 0 && activeUploads.length === 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => recentCompleted.forEach((u) => removeUpload(u.id))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="max-h-64 overflow-y-auto">
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="p-3 border-b border-border last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail with progress ring */}
                      <div className="w-12 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0 relative">
                        {upload.thumbnailUrl ? (
                          <img
                            src={upload.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Status Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          {upload.status === "uploading" || upload.status === "processing" ? (
                            <div className="relative">
                              <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="15"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  className="text-white/20"
                                />
                                <motion.circle
                                  cx="18"
                                  cy="18"
                                  r="15"
                                  fill="none"
                                  stroke="url(#itemGradient)"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  initial={{ strokeDasharray: "0 94" }}
                                  animate={{ strokeDasharray: `${upload.progress * 0.94} 94` }}
                                  transition={{ duration: 0.3, ease: "easeOut" }}
                                />
                                <defs>
                                  <linearGradient id="itemGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                                    <stop offset="100%" stopColor="#22d3ee" />
                                  </linearGradient>
                                </defs>
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
                                {upload.progress}%
                              </span>
                            </div>
                          ) : upload.status === "complete" ? (
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          ) : upload.status === "error" ? (
                            <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
                              <AlertCircle className="w-4 h-4 text-white" />
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {upload.fileName}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {upload.message}
                        </p>
                        
                        {/* Linear Progress Bar for active uploads */}
                        {(upload.status === "uploading" || upload.status === "processing") && (
                          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-primary to-cyan-400"
                              initial={{ width: 0 }}
                              animate={{ width: `${upload.progress}%` }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0">
                        {(upload.status === "uploading" || upload.status === "processing") ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => cancelUpload(upload.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeUpload(upload.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
};
