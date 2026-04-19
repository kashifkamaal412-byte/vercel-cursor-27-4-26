import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Image, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Post } from "@/hooks/usePosts";

interface PostEditSheetProps {
  post: Post;
  open: boolean;
  onClose: () => void;
  onSave: (content: string, imageFile?: File) => Promise<void>;
}

export const PostEditSheet = ({ post, open, onClose, onSave }: PostEditSheetProps) => {
  const [caption, setCaption] = useState(post.content || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(post.image_url);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(caption, imageFile || undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-background flex flex-col"
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <Button variant="ghost" size="icon" onClick={onClose} disabled={saving}>
              <X className="w-5 h-5" />
            </Button>
            <h2 className="text-sm font-bold text-foreground">Edit Post</h2>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || (!caption.trim() && !imagePreview)}
              className="h-8 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-3">
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What's on your mind?"
                className="min-h-[120px] bg-transparent border-0 resize-none text-foreground placeholder:text-muted-foreground focus-visible:ring-0 text-sm p-0"
                maxLength={2200}
                disabled={saving}
              />
            </div>

            {imagePreview && (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full object-contain max-h-[50vh]" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
            )}

            {!imagePreview && (
              <div className="px-3 pb-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-1.5 hover:border-primary/50 transition-colors"
                >
                  <Image className="w-6 h-6 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground font-medium">Add Photo</span>
                </button>
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          </div>

          <div className="border-t border-border px-3 py-2 flex items-center justify-between">
            <button onClick={() => fileRef.current?.click()} className="p-1.5 rounded-full hover:bg-muted/50">
              <Image className="w-5 h-5 text-primary" />
            </button>
            <span className="text-[10px] text-muted-foreground tabular-nums">{caption.length}/2200</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
