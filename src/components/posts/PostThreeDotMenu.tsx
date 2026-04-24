import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Post } from "@/hooks/usePosts";
import {
  Trash2, Flag, Link2, EyeOff, UserX, Bell, BellOff,
  Globe, Lock, Edit, Copy, MessageSquareOff, MessageSquare, Download
} from "lucide-react";
import { toast } from "sonner";

interface PostThreeDotMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
  isOwner: boolean;
  onDelete?: (postId: string) => void;
  onEdit?: (post: Post) => void;
  onTogglePrivacy?: (postId: string, isPublic: boolean) => void;
  onToggleComments?: (postId: string, allow: boolean) => void;
  onDownload?: () => void;
}

export const PostThreeDotMenu = ({ open, onOpenChange, post, isOwner, onDelete, onEdit, onTogglePrivacy, onToggleComments, onDownload }: PostThreeDotMenuProps) => {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`);
    toast.success("Link copied!");
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete?.(post.id);
    onOpenChange(false);
  };

  const handleEdit = () => {
    onEdit?.(post);
    onOpenChange(false);
  };

  const handleMakePrivate = () => {
    onTogglePrivacy?.(post.id, false);
    onOpenChange(false);
  };

  const handleMakePublic = () => {
    onTogglePrivacy?.(post.id, true);
    onOpenChange(false);
  };

  const handleToggleComments = () => {
    onToggleComments?.(post.id, !post.allow_comments);
    onOpenChange(false);
  };

  const handleDownload = () => {
    onDownload?.();
    onOpenChange(false);
  };

  const MenuItem = ({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        danger ? "text-red-500 hover:bg-red-500/10" : "text-foreground hover:bg-muted/50"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-card border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground text-sm">
            {isOwner ? "Manage Post" : "Post Options"}
          </SheetTitle>
        </SheetHeader>
        <div className="py-3 space-y-0.5">
          <MenuItem icon={Copy} label="Copy Link" onClick={handleCopyLink} />
          {post.image_url && (
            <MenuItem icon={Download} label="Download Image" onClick={handleDownload} />
          )}

          {isOwner ? (
            <>
              <MenuItem icon={Edit} label="Edit Post" onClick={handleEdit} />
              {post.is_public ? (
                <MenuItem icon={Lock} label="Make Private" onClick={handleMakePrivate} />
              ) : (
                <MenuItem icon={Globe} label="Make Public" onClick={handleMakePublic} />
              )}
              <MenuItem
                icon={post.allow_comments ? MessageSquareOff : MessageSquare}
                label={post.allow_comments ? "Turn Off Comments" : "Turn On Comments"}
                onClick={handleToggleComments}
              />
              <div className="border-t border-border my-1" />
              <MenuItem icon={Trash2} label="Delete Post" onClick={handleDelete} danger />
            </>
          ) : (
            <>
              <MenuItem icon={EyeOff} label="Not Interested" onClick={() => { toast.success("We'll show less like this"); onOpenChange(false); }} />
              <MenuItem icon={Flag} label="Report Post" onClick={() => { toast.success("Report submitted"); onOpenChange(false); }} />
              <MenuItem icon={UserX} label="Block User" onClick={() => { toast.success("User blocked"); onOpenChange(false); }} />
              <MenuItem icon={Bell} label="Turn On Notifications" onClick={() => { toast.success("Notifications enabled for this user"); onOpenChange(false); }} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
