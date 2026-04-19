import { useState } from "react";
import { usePosts, Post } from "@/hooks/usePosts";
import { PostCard } from "./PostCard";
import { PostEditSheet } from "./PostEditSheet";
import { PostCardSkeleton, PremiumLoader } from "@/components/ui/PremiumLoader";
import { ImageOff } from "lucide-react";
import { toast } from "sonner";

export const PostFeed = () => {
  const { posts, loading, likePost, deletePost, togglePostPrivacy, toggleComments, updatePost } = usePosts();
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const handleTogglePrivacy = async (postId: string, isPublic: boolean) => {
    const ok = await togglePostPrivacy(postId, isPublic);
    if (ok) toast.success(isPublic ? "Post is now public" : "Post moved to private");
  };

  const handleToggleComments = async (postId: string, allow: boolean) => {
    const ok = await toggleComments(postId, allow);
    if (ok) toast.success(allow ? "Comments enabled" : "Comments disabled");
  };

  if (loading) {
    return (
      <div className="md:max-w-[680px] md:mx-auto md:px-4 space-y-3 md:space-y-4">
        {[1, 2, 3].map(i => <PostCardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <ImageOff className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">No Posts Yet</h3>
          <p className="text-sm text-muted-foreground max-w-[280px]">Be the first to share something with the community!</p>
        </div>
      ) : (
        <div className="md:max-w-[680px] md:mx-auto md:space-y-4 md:px-4">
          {posts.map(post => (
            <div key={post.id} className="mb-2 md:mb-0">
              <PostCard
                post={post}
                onLike={likePost}
                onDelete={deletePost}
                onEdit={(p) => setEditingPost(p)}
                onTogglePrivacy={handleTogglePrivacy}
                onToggleComments={handleToggleComments}
              />
            </div>
          ))}
        </div>
      )}

      {editingPost && (
        <PostEditSheet
          post={editingPost}
          open={!!editingPost}
          onClose={() => setEditingPost(null)}
          onSave={async (content, imageFile) => {
            try {
              await updatePost(editingPost.id, content, imageFile);
              toast.success("Post updated!");
              setEditingPost(null);
            } catch {
              toast.error("Failed to update post");
            }
          }}
        />
      )}
    </div>
  );
};
