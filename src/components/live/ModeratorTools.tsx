import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Ban, VolumeX, Pin, UserX, AlertTriangle,
  MessageSquareOff, X, Check, Search, Crown, Gavel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ModeratorToolsProps {
  streamId: string;
  isCreator?: boolean;
  onClose: () => void;
  onPinMessage?: (messageId: string) => void;
}

interface ViewerInfo {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  is_muted?: boolean;
}

export const ModeratorTools = ({ streamId, isCreator, onClose, onPinMessage }: ModeratorToolsProps) => {
  const { user } = useAuth();
  const [viewers, setViewers] = useState<ViewerInfo[]>([]);
  const [search, setSearch] = useState("");
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [bannedUsers, setBannedUsers] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"viewers" | "moderation">("viewers");
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId: string; name: string } | null>(null);

  useEffect(() => {
    const fetchViewers = async () => {
      const { data } = await (supabase as any)
        .from("live_viewers")
        .select("user_id")
        .eq("stream_id", streamId)
        .eq("is_active", true);

      if (!data) return;

      const userIds = data.map((v: any) => v.user_id);
      if (userIds.length === 0) return;

      const { data: profiles } = await supabase
        .from("public_profile_view")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);

      setViewers((profiles || []).map(p => ({
        user_id: p.user_id || "",
        display_name: p.display_name || p.username || "User",
        username: p.username || "",
        avatar_url: p.avatar_url,
        is_muted: mutedUsers.has(p.user_id || ""),
      })));
    };

    fetchViewers();
    const interval = setInterval(fetchViewers, 8000);
    return () => clearInterval(interval);
  }, [streamId, mutedUsers]);

  const handleKick = async (userId: string) => {
    try {
      await (supabase as any)
        .from("live_viewers")
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq("stream_id", streamId)
        .eq("user_id", userId);
      setViewers(prev => prev.filter(v => v.user_id !== userId));
      toast.success("User removed from stream");
    } catch {
      toast.error("Failed to kick user");
    }
    setConfirmAction(null);
  };

  const handleMute = (userId: string) => {
    setMutedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
        toast.success("User unmuted");
      } else {
        next.add(userId);
        toast.success("User muted");
      }
      return next;
    });
    setConfirmAction(null);
  };

  const handleBlock = async (userId: string) => {
    if (!user) return;
    try {
      await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: userId });
      // Also kick from stream
      await (supabase as any)
        .from("live_viewers")
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq("stream_id", streamId)
        .eq("user_id", userId);
      setBannedUsers(prev => new Set(prev).add(userId));
      setViewers(prev => prev.filter(v => v.user_id !== userId));
      toast.success("User blocked and removed");
    } catch {
      toast.error("Failed to block user");
    }
    setConfirmAction(null);
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      await (supabase as any)
        .from("live_chat")
        .update({ is_pinned: true })
        .eq("id", messageId)
        .eq("stream_id", streamId);
      toast.success("Message pinned!");
    } catch {
      toast.error("Failed to pin message");
    }
  };

  const filtered = viewers.filter(v =>
    !search || v.display_name.toLowerCase().includes(search.toLowerCase()) || v.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 20 }}
      className="absolute bottom-0 left-0 right-0 z-[60] bg-neutral-950 rounded-t-3xl border-t border-white/10 max-h-[70vh]"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Moderator Tools</h3>
            <p className="text-[10px] text-white/40">{viewers.length} viewers online</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white/60">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-3 pb-0">
        {[
          { id: "viewers" as const, label: "Viewers", icon: Crown },
          { id: "moderation" as const, label: "Actions", icon: Gavel },
        ].map(t => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "default" : "ghost"}
            onClick={() => setTab(t.id)}
            className={`rounded-full text-xs gap-1.5 flex-1 ${
              tab === t.id ? "bg-red-500/20 text-red-400 border border-red-500/30" : "text-white/50"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search viewers..."
            className="pl-9 bg-white/5 border-white/10 text-white text-xs placeholder:text-white/30 rounded-xl h-9"
          />
        </div>
      </div>

      {/* Viewer List */}
      <div className="px-3 pb-6 overflow-y-auto max-h-[40vh] space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <UserX className="w-10 h-10 text-white/20 mx-auto mb-2" />
            <p className="text-xs text-white/30">No viewers found</p>
          </div>
        ) : (
          filtered.map(v => (
            <motion.div
              key={v.user_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-2.5 bg-white/3 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Avatar className="w-9 h-9 border border-white/10">
                  <AvatarImage src={v.avatar_url || ""} />
                  <AvatarFallback className="text-[10px] bg-white/5 text-white/60">{v.display_name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-semibold text-white">{v.display_name}</p>
                  {v.username && <p className="text-[10px] text-white/30">@{v.username}</p>}
                </div>
                {mutedUsers.has(v.user_id) && (
                  <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full font-bold">MUTED</span>
                )}
              </div>

              {v.user_id !== user?.id && (
                <div className="flex gap-1">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => handleMute(v.user_id)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${
                      mutedUsers.has(v.user_id) 
                        ? "bg-orange-500/20 border-orange-500/30 text-orange-400" 
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
                    }`}
                    title="Mute"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setConfirmAction({ type: "kick", userId: v.user_id, name: v.display_name })}
                    className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-yellow-400 hover:border-yellow-500/30 transition-colors"
                    title="Kick"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setConfirmAction({ type: "block", userId: v.user_id, name: v.display_name })}
                    className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 hover:border-red-500/30 transition-colors"
                    title="Block"
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Confirm Action Dialog */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] bg-black/80 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-neutral-900 rounded-2xl p-5 w-full max-w-xs border border-white/10 text-center"
            >
              <div className={`w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center ${
                confirmAction.type === "block" ? "bg-red-500/10" : "bg-yellow-500/10"
              }`}>
                {confirmAction.type === "block" ? (
                  <Ban className="w-7 h-7 text-red-500" />
                ) : (
                  <UserX className="w-7 h-7 text-yellow-500" />
                )}
              </div>
              <h4 className="font-bold text-white mb-1">
                {confirmAction.type === "block" ? "Block User?" : "Kick User?"}
              </h4>
              <p className="text-xs text-white/50 mb-4">
                {confirmAction.type === "block"
                  ? `Block ${confirmAction.name}? They won't be able to join your streams.`
                  : `Remove ${confirmAction.name} from this stream?`}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl border-white/10 text-white/60"
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </Button>
                <Button
                  className={`flex-1 rounded-xl ${
                    confirmAction.type === "block"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-yellow-600 hover:bg-yellow-700 text-white"
                  }`}
                  onClick={() => {
                    if (confirmAction.type === "block") handleBlock(confirmAction.userId);
                    else handleKick(confirmAction.userId);
                  }}
                >
                  {confirmAction.type === "block" ? "Block" : "Kick"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
