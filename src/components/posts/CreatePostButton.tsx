import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Image, X, Loader2, Camera, MapPin,
  Hash, Globe, Lock, Users, AtSign, Crop, Type, RotateCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { usePosts } from "@/hooks/usePosts";
import { toast } from "sonner";

type Privacy = "public" | "followers" | "private";

interface CreatePostButtonProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const CreatePostButton = ({ isOpen: externalOpen, onClose: externalClose }: CreatePostButtonProps = {}) => {
  const { user } = useAuth();
  const { createPost } = usePosts();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen ?? internalOpen;
  const setIsOpen = (v: boolean) => { if (externalClose && !v) externalClose(); else setInternalOpen(v); };
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [location, setLocation] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [showCrop, setShowCrop] = useState(false);
  const [textOverlay, setTextOverlay] = useState("");
  const [showTextOverlay, setShowTextOverlay] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("Image must be under 15MB"); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCropSquare = useCallback(() => {
    if (!imagePreview) return;
    const img = new window.Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const size = Math.min(img.width, img.height);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);

      if (textOverlay) {
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.font = `bold ${Math.floor(size / 15)}px sans-serif`;
        ctx.textAlign = "center";
        const y = size - Math.floor(size / 8);
        ctx.strokeText(textOverlay, size / 2, y);
        ctx.fillText(textOverlay, size / 2, y);
      }

      canvas.toBlob((blob) => {
        if (!blob) return;
        const cropped = new File([blob], "cropped.jpg", { type: "image/jpeg" });
        setImageFile(cropped);
        setImagePreview(canvas.toDataURL("image/jpeg"));
        setShowCrop(false);
        toast.success("Cropped to square!");
      }, "image/jpeg", 0.9);
    };
    img.src = imagePreview;
  }, [imagePreview, textOverlay]);

  const handlePublish = async () => {
    if (!user) { toast.error("Please sign in"); return; }
    if (!caption.trim() && !imageFile) { toast.error("Write something or add a photo"); return; }

    setPublishing(true);
    try {
      await createPost(caption, imageFile || undefined);
      toast.success("Post published! 🎉");
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = () => {
    if (publishing) return;
    setIsOpen(false);
    setCaption("");
    setImageFile(null);
    setImagePreview(null);
    setLocation("");
    setShowLocation(false);
    setPrivacy("public");
    setShowCrop(false);
    setTextOverlay("");
    setShowTextOverlay(false);
  };

  const PrivacyIcon = privacy === "public" ? Globe : privacy === "followers" ? Users : Lock;

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-background flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <Button variant="ghost" size="icon" onClick={handleClose} disabled={publishing}>
                <X className="w-5 h-5" />
              </Button>
              <h2 className="text-sm font-bold text-foreground">New Post</h2>
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={publishing || (!caption.trim() && !imageFile)}
                className="h-8 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
              >
                {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Share"}
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Caption */}
              <div className="p-3">
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What's on your mind? Write your thoughts, use #hashtags and @mentions..."
                  className="min-h-[120px] bg-transparent border-0 resize-none text-foreground placeholder:text-muted-foreground focus-visible:ring-0 text-sm p-0"
                  maxLength={2200}
                  disabled={publishing}
                />
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full object-contain max-h-[50vh]" />
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button
                      onClick={() => setShowCrop(true)}
                      className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
                    >
                      <Crop className="w-4 h-4 text-foreground" />
                    </button>
                    <button
                      onClick={() => setShowTextOverlay(!showTextOverlay)}
                      className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
                    >
                      <Type className="w-4 h-4 text-foreground" />
                    </button>
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); setTextOverlay(""); }}
                      className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                </div>
              )}

              {/* Text Overlay Input */}
              {showTextOverlay && imagePreview && (
                <div className="px-3 py-2">
                  <Input
                    value={textOverlay}
                    onChange={(e) => setTextOverlay(e.target.value)}
                    placeholder="Add text on photo..."
                    className="h-9 text-xs rounded-lg bg-muted/30 border-border/50"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Text will appear at the bottom of the cropped image</p>
                </div>
              )}

              {/* Crop Confirmation */}
              {showCrop && imagePreview && (
                <div className="px-3 py-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowCrop(false)} className="flex-1 h-8 text-xs rounded-full">Cancel</Button>
                  <Button size="sm" onClick={handleCropSquare} className="flex-1 h-8 text-xs rounded-full bg-primary text-primary-foreground">
                    <Crop className="w-3 h-3 mr-1" /> Crop Square
                  </Button>
                </div>
              )}

              {/* Add Photo Area */}
              {!imagePreview && (
                <div className="px-3 pb-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex-1 border border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-1.5 hover:border-primary/50 transition-colors"
                    >
                      <Image className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground font-medium">Gallery</span>
                    </button>
                    <button
                      onClick={() => cameraRef.current?.click()}
                      className="flex-1 border border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-1.5 hover:border-primary/50 transition-colors"
                    >
                      <Camera className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground font-medium">Camera</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    You can also post text-only — just write something above!
                  </p>
                </div>
              )}

              {/* Location */}
              {showLocation && (
                <div className="px-3 pb-3">
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add location..."
                    className="h-9 text-xs rounded-lg bg-muted/30 border-border/50"
                  />
                </div>
              )}

              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" />
            </div>

            {/* Bottom Tools */}
            <div className="border-t border-border px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => fileRef.current?.click()} className="p-1.5 rounded-full hover:bg-muted/50">
                  <Image className="w-5 h-5 text-primary" />
                </button>
                <button onClick={() => cameraRef.current?.click()} className="p-1.5 rounded-full hover:bg-muted/50">
                  <Camera className="w-5 h-5 text-primary" />
                </button>
                <button onClick={() => setShowLocation(!showLocation)} className="p-1.5 rounded-full hover:bg-muted/50">
                  <MapPin className={`w-5 h-5 ${showLocation ? "text-accent" : "text-primary"}`} />
                </button>
                <button onClick={() => setCaption(prev => prev + " #")} className="p-1.5 rounded-full hover:bg-muted/50">
                  <Hash className="w-5 h-5 text-primary" />
                </button>
                <button onClick={() => setCaption(prev => prev + " @")} className="p-1.5 rounded-full hover:bg-muted/50">
                  <AtSign className="w-5 h-5 text-primary" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrivacy(p => p === "public" ? "followers" : p === "followers" ? "private" : "public")}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/30 text-[10px] text-muted-foreground"
                >
                  <PrivacyIcon className="w-3 h-3" />
                  {privacy === "public" ? "Public" : privacy === "followers" ? "Fans" : "Private"}
                </button>
                <span className="text-[10px] text-muted-foreground tabular-nums">{caption.length}/2200</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
