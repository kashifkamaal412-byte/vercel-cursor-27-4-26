import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostFeed } from "@/components/posts/PostFeed";
import { CreatePostButton } from "@/components/posts/CreatePostButton";
import { Search, Plus, Edit3 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";

const Posts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [showCreate, setShowCreate] = useState(false);
  useScrollRestoration();

  return (
    <MainLayout>
      <div className="relative min-h-screen">
        {/* Top Bar - mobile only */}
        <div className="fixed top-0 left-0 right-0 z-30 safe-area-inset-top md:hidden">
          <div className="bg-background/80 backdrop-blur-xl border-b border-border/20">
            <div className="flex items-center justify-between px-4 h-11">
              <h1 className="text-base font-bold text-foreground">Posts</h1>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate("/discover")}
                className="p-1"
              >
                <Search className="w-4.5 h-4.5 text-foreground/70" strokeWidth={2} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Quick "What's on your mind?" bar — Facebook style */}
        <div className="pt-12 md:pt-4 px-0 md:px-4">
          <div className="md:max-w-[680px] md:mx-auto">
            <div className="bg-card px-4 py-3 border-b border-border/20 md:rounded-2xl md:border md:border-border/20 md:mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 ring-2 ring-primary/20 cursor-pointer flex-shrink-0" onClick={() => navigate("/profile")}>
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                    {(profile?.display_name || user?.email || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => user ? setShowCreate(true) : toast.error("Sign in to post")}
                  className="flex-1 h-10 px-4 rounded-full bg-muted/40 border border-border/30 text-left text-[14px] text-muted-foreground hover:bg-muted/60 transition-colors"
                >
                  What's on your mind?
                </button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => user ? setShowCreate(true) : toast.error("Sign in to post")}
                  className="p-2.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Edit3 className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        <PostFeed />

        {showCreate && <CreatePostButton isOpen={showCreate} onClose={() => setShowCreate(false)} />}
      </div>
    </MainLayout>
  );
};

export default Posts;
