import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Shield,
  ArrowLeft,
  Users,
  Video,
  MessageSquare,
  Loader2,
  Ban,
  CheckCircle,
  Trash2,
  RefreshCw,
  Heart,
  Eye,
  Search,
  Mail,
  AlertTriangle,
  Send,
  BarChart,
  Activity,
  Lock,
  Unlock,
  UserX,
  Edit,
  Save,
  X,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// ------------------ Types ------------------
interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  total_likes: number | null;
  total_views: number | null;
  total_followers: number | null;
  created_at: string;
  is_blocked?: boolean; // derived from blocked_users
  is_suspended?: boolean; // from profiles.is_suspended (admin suspension)
  warnings_count?: number; // derived from user_warnings
}

interface VideoItem {
  id: string;
  user_id: string;
  caption: string | null;
  video_url: string;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  status: string;
  created_at: string;
}

interface CommentItem {
  id: string;
  user_id: string;
  video_id: string;
  content: string;
  created_at: string;
}

interface Warning {
  id: string;
  user_id: string;
  admin_id: string;
  reason: string;
  created_at: string;
}

// ------------------ Main Component ------------------
const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [warningsMap, setWarningsMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  // Search & selection
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const [userVideos, setUserVideos] = useState<VideoItem[]>([]);
  const [userComments, setUserComments] = useState<CommentItem[]>([]);
  const [userWarnings, setUserWarnings] = useState<Warning[]>([]);
  const [userActivity, setUserActivity] = useState<
    { period: string; views: number; likes: number; comments: number; videos: number }[]
  >([]);
  const [loadingUserData, setLoadingUserData] = useState(false);

  // Messaging
  const [messageAllDialog, setMessageAllDialog] = useState(false);
  const [messageUserDialog, setMessageUserDialog] = useState(false);
  const [warningDialog, setWarningDialog] = useState(false);
  const [editProfileDialog, setEditProfileDialog] = useState(false);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [warningReason, setWarningReason] = useState("");

  // Edit profile form
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    users24h: 0,
    users7d: 0,
    videos24h: 0,
    videos7d: 0,
    comments24h: 0,
    comments7d: 0,
  });

  // ------------------ Permission Check ------------------
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      // Temporary override for specific email (for development)
      if (user.email === "kashifkamaal412@gmail.com") {
        setIsAdmin(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          if (import.meta.env.DEV) console.error("Error checking admin:", error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(!!data);
      } catch (err) {
        if (import.meta.env.DEV) console.error("Exception in checkAdmin:", err);
        setIsAdmin(false);
      }
    };

    if (!authLoading) checkAdmin();
  }, [user, authLoading]);

  // ------------------ Load All Data ------------------
  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadVideos(), loadComments(), loadBlocked(), loadWarnings(), loadStats()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, user_id, display_name, username, avatar_url, total_likes, total_views, total_followers, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setUsers(data as any);
  };

  const loadVideos = async () => {
    const { data } = await supabase.from("videos").select("*").order("created_at", { ascending: false }).limit(200);
    if (data) setVideos(data);
  };

  const loadComments = async () => {
    const { data } = await supabase.from("comments").select("*").order("created_at", { ascending: false }).limit(200);
    if (data) setComments(data);
  };

  const loadBlocked = async () => {
    if (!user) return;
    const { data } = await supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id);
    if (data) setBlockedIds(new Set(data.map((b) => b.blocked_id)));
  };

  const loadWarnings = async () => {
    const { data } = await (supabase as any).from("user_warnings").select("user_id, count");
    if (data) {
      const map = new Map((data as any[]).map((w: any) => [w.user_id, w.count]));
      setWarningsMap(map);
    }
  };

  const loadStats = async () => {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { count: users24h } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", dayAgo);
    const { count: users7d } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo);

    const { count: videos24h } = await supabase
      .from("videos")
      .select("*", { count: "exact", head: true })
      .gte("created_at", dayAgo);
    const { count: videos7d } = await supabase
      .from("videos")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo);

    const { count: comments24h } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .gte("created_at", dayAgo);
    const { count: comments7d } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo);

    setStats({
      users24h: users24h || 0,
      users7d: users7d || 0,
      videos24h: videos24h || 0,
      videos7d: videos7d || 0,
      comments24h: comments24h || 0,
      comments7d: comments7d || 0,
    });
  };

  // ------------------ User Actions ------------------
  const blockUser = async (userId: string) => {
    if (!user) return;
    const { error: blockError } = await supabase
      .from("blocked_users")
      .insert({ blocker_id: user.id, blocked_id: userId });
    if (blockError) {
      toast.error("Failed to block user: " + blockError.message);
      return;
    }
    setBlockedIds((prev) => new Set([...prev, userId]));
    if (selectedUserId === userId) {
      setSelectedUserProfile((prev) => (prev ? { ...prev, is_suspended: true } : prev));
    }
    setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, is_suspended: true } : u)));
    toast.success("User blocked ✅");
  };

  const unblockUser = async (userId: string) => {
    if (!user) return;
    const { error: unblockError } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId);
    if (unblockError) {
      toast.error("Failed to unblock user: " + unblockError.message);
      return;
    }
    setBlockedIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    if (selectedUserId === userId) {
      setSelectedUserProfile((prev) => (prev ? { ...prev, is_suspended: false } : prev));
    }
    setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, is_suspended: false } : u)));
    toast.success("User unblocked ✅");
  };

  const deleteVideo = async (videoId: string, fromUserView = false) => {
    if (!confirm("Are you sure you want to delete this video?")) return;
    const { error } = await supabase.from("videos").delete().eq("id", videoId);
    if (error) {
      toast.error("Delete failed: " + error.message);
      return;
    }
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    if (fromUserView) setUserVideos((prev) => prev.filter((v) => v.id !== videoId));
    toast.success("Video deleted ✅");
  };

  const deleteComment = async (commentId: string, fromUserView = false) => {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) {
      toast.error("Delete failed: " + error.message);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    if (fromUserView) setUserComments((prev) => prev.filter((c) => c.id !== commentId));
    toast.success("Comment deleted ✅");
  };

  // ------------------ Send Notifications ------------------
  const sendGlobalNotification = async () => {
    if (!messageTitle || !messageBody) {
      toast.error("Title and message required");
      return;
    }
    const { error } = await (supabase as any).from("notifications").insert({
      user_id: null, // null means global
      from_user_id: user!.id,
      type: "global",
      title: messageTitle,
      message: messageBody,
    });
    if (error) {
      toast.error("Failed: " + error.message);
      return;
    }
    toast.success("Global notification sent!");
    setMessageAllDialog(false);
    setMessageTitle("");
    setMessageBody("");
  };

  const sendUserNotification = async (targetUserId: string) => {
    if (!messageTitle || !messageBody) {
      toast.error("Title and message required");
      return;
    }
    const { error } = await (supabase as any).from("notifications").insert({
      user_id: targetUserId,
      from_user_id: user!.id,
      type: "individual",
      title: messageTitle,
      message: messageBody,
    });
    if (error) {
      toast.error("Failed: " + error.message);
      return;
    }
    toast.success("Notification sent!");
    setMessageUserDialog(false);
    setMessageTitle("");
    setMessageBody("");
  };

  const sendWarning = async (targetUserId: string) => {
    if (!warningReason) {
      toast.error("Warning reason required");
      return;
    }
    const { error } = await (supabase as any).from("user_warnings").insert({
      user_id: targetUserId,
      admin_id: user!.id,
      reason: warningReason,
    });
    if (error) {
      toast.error("Warning failed: " + error.message);
      return;
    }
    // Also send a notification
    await (supabase as any)
      .from("notifications")
      .insert({
        user_id: targetUserId,
        from_user_id: user!.id,
        type: "warning",
        title: "⚠️ You have received a warning",
        message: warningReason,
      })
      .catch(() => {});
    toast.success("Warning issued");
    setWarningDialog(false);
    setWarningReason("");
    loadWarnings();
    if (selectedUserId === targetUserId) {
      setUserWarnings((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          user_id: targetUserId,
          admin_id: user!.id,
          reason: warningReason,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  // ------------------ Edit Profile ------------------
  const handleEditProfile = () => {
    if (!selectedUserProfile) return;
    setEditDisplayName(selectedUserProfile.display_name || "");
    setEditUsername(selectedUserProfile.username || "");
    setEditAvatarPreview(selectedUserProfile.avatar_url || null);
    setEditAvatarFile(null);
    setEditProfileDialog(true);
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${selectedUserProfile?.user_id}_${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage.from("profiles").upload(filePath, file);

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      toast.error("Failed to upload avatar");
      return null;
    }

    const { data: urlData } = supabase.storage.from("profiles").getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const saveProfileChanges = async () => {
    if (!selectedUserProfile) return;

    setUploadingAvatar(true);

    let avatarUrl = selectedUserProfile.avatar_url;
    if (editAvatarFile) {
      const newUrl = await uploadAvatar(editAvatarFile);
      if (newUrl) avatarUrl = newUrl;
    }

    const updates: any = {};
    if (editDisplayName !== selectedUserProfile.display_name) updates.display_name = editDisplayName;
    if (editUsername !== selectedUserProfile.username) updates.username = editUsername;
    if (avatarUrl !== selectedUserProfile.avatar_url) updates.avatar_url = avatarUrl;

    if (Object.keys(updates).length === 0) {
      setEditProfileDialog(false);
      setUploadingAvatar(false);
      return;
    }

    const { error } = await supabase.from("profiles").update(updates).eq("user_id", selectedUserProfile.user_id);

    setUploadingAvatar(false);

    if (error) {
      toast.error("Failed to update profile: " + error.message);
      return;
    }

    toast.success("Profile updated successfully");
    setEditProfileDialog(false);

    // Refresh user list and selected user
    await loadUsers();
    if (selectedUserId) {
      loadUserDetails(selectedUserId);
    }
  };

  // ------------------ Load Selected User Data ------------------
  const loadUserDetails = async (userId: string) => {
    setLoadingUserData(true);
    setSelectedUserId(userId);
    const profile = users.find((u) => u.user_id === userId) || null;
    const isBlocked = blockedIds.has(userId);
    setSelectedUserProfile(profile ? { ...profile, is_blocked: isBlocked } : null);

    const { data: vids } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setUserVideos(vids || []);

    const { data: comms } = await supabase
      .from("comments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setUserComments(comms || []);

    const { data: warns } = await (supabase as any)
      .from("user_warnings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setUserWarnings((warns as unknown as Warning[]) || []);

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const getCounts = async (since: string) => {
      const [videosCount, commentsCount, likesCount] = await Promise.all([
        supabase
          .from("videos")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", since),
        supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", since),
        supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", since),
      ]);
      return {
        videos: videosCount.count || 0,
        comments: commentsCount.count || 0,
        likes: likesCount.count || 0,
      };
    };

    const [day, week, month] = await Promise.all([getCounts(dayAgo), getCounts(weekAgo), getCounts(monthAgo)]);

    setUserActivity([
      { period: "24h", ...day, views: 0 },
      { period: "7d", ...week, views: 0 },
      { period: "30d", ...month, views: 0 },
    ]);

    setLoadingUserData(false);
  };

  // ------------------ Render ------------------
  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">Only admins can access this page.</p>
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter users based on search
  const filteredUsers = users
    .map((u) => ({ ...u, is_blocked: blockedIds.has(u.user_id) }))
    .filter(
      (u) =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-bold">Admin Master Dashboard</h1>
          <div className="ml-auto flex gap-2">
            <Dialog open={messageAllDialog} onOpenChange={setMessageAllDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-1" /> Message All
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Global Notification</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input placeholder="Title" value={messageTitle} onChange={(e) => setMessageTitle(e.target.value)} />
                  <Textarea
                    placeholder="Message"
                    rows={4}
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                  />
                  <Button onClick={sendGlobalNotification} className="w-full">
                    <Send className="w-4 h-4 mr-2" /> Send to All Users
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={loadAll}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="w-5 h-5 mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-bold">{users.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Video className="w-5 h-5 mx-auto text-green-500 mb-1" />
              <p className="text-lg font-bold">{videos.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Videos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <MessageSquare className="w-5 h-5 mx-auto text-purple-500 mb-1" />
              <p className="text-lg font-bold">{comments.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Comments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Activity className="w-5 h-5 mx-auto text-orange-500 mb-1" />
              <p className="text-lg font-bold">{stats.users24h}</p>
              <p className="text-[10px] text-muted-foreground">Users 24h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <BarChart className="w-5 h-5 mx-auto text-indigo-500 mb-1" />
              <p className="text-lg font-bold">{stats.videos24h}</p>
              <p className="text-[10px] text-muted-foreground">Videos 24h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <MessageSquare className="w-5 h-5 mx-auto text-pink-500 mb-1" />
              <p className="text-lg font-bold">{stats.comments24h}</p>
              <p className="text-[10px] text-muted-foreground">Comments 24h</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: User List */}
          <div className="lg:col-span-1">
            <Card className="h-[calc(100vh-300px)]">
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" /> Users
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <ScrollArea className="h-[calc(100vh-400px)]">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No users found.</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredUsers.map((u) => {
                        const isBlocked = u.is_blocked;
                        const isSuspended = u.is_suspended;
                        const isSelf = u.user_id === user.id;
                        const warnings = warningsMap.get(u.user_id) || 0;
                        return (
                          <button
                            key={u.id}
                            onClick={() => loadUserDetails(u.user_id)}
                            className={`w-full text-left p-2 rounded-lg transition-colors ${
                              selectedUserId === u.user_id ? "bg-primary/10" : "hover:bg-muted"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {u.display_name || u.username || "Anonymous"}
                                  {isSelf && (
                                    <Badge variant="outline" className="ml-1 text-[9px]">
                                      You
                                    </Badge>
                                  )}
                                  {isBlocked && (
                                    <Badge variant="destructive" className="ml-1 text-[9px]">
                                      Blocked
                                    </Badge>
                                  )}
                                  {isSuspended && (
                                    <Badge variant="destructive" className="ml-1 text-[9px] bg-red-700">
                                      Suspended
                                    </Badge>
                                  )}
                                  {warnings > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="ml-1 text-[9px] bg-yellow-500/20 text-yellow-500"
                                    >
                                      ⚠️{warnings}
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Selected User Details */}
          <div className="lg:col-span-2">
            {selectedUserId && selectedUserProfile ? (
              <Card className="h-[calc(100vh-300px)] overflow-y-auto">
                <CardHeader className="p-3 pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted overflow-hidden relative group">
                        {selectedUserProfile.avatar_url ? (
                          <img src={selectedUserProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-6 h-6 m-3 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">
                          {selectedUserProfile.display_name || selectedUserProfile.username || "Anonymous"}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          @{selectedUserProfile.username || "no username"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleEditProfile}>
                        <Edit className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      {selectedUserProfile.is_suspended ? (
                        <Button size="sm" variant="outline" onClick={() => unblockUser(selectedUserProfile.user_id)}>
                          <Unlock className="w-4 h-4 mr-1" /> Unsuspend
                        </Button>
                      ) : (
                        <Button size="sm" variant="destructive" onClick={() => blockUser(selectedUserProfile.user_id)}>
                          <Lock className="w-4 h-4 mr-1" /> Suspend
                        </Button>
                      )}
                      <Dialog open={messageUserDialog} onOpenChange={setMessageUserDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Mail className="w-4 h-4 mr-1" /> Message
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Send Message to {selectedUserProfile.username}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <Input
                              placeholder="Title"
                              value={messageTitle}
                              onChange={(e) => setMessageTitle(e.target.value)}
                            />
                            <Textarea
                              placeholder="Message"
                              rows={4}
                              value={messageBody}
                              onChange={(e) => setMessageBody(e.target.value)}
                            />
                            <Button
                              onClick={() => sendUserNotification(selectedUserProfile.user_id)}
                              className="w-full"
                            >
                              <Send className="w-4 h-4 mr-2" /> Send
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={warningDialog} onOpenChange={setWarningDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <AlertTriangle className="w-4 h-4 mr-1" /> Warn
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Issue Warning to {selectedUserProfile.username}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <Textarea
                              placeholder="Reason for warning"
                              rows={4}
                              value={warningReason}
                              onChange={(e) => setWarningReason(e.target.value)}
                            />
                            <Button
                              onClick={() => sendWarning(selectedUserProfile.user_id)}
                              variant="destructive"
                              className="w-full"
                            >
                              <AlertTriangle className="w-4 h-4 mr-2" /> Issue Warning
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  {loadingUserData ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Suspended Banner */}
                      {selectedUserProfile.is_suspended && (
                        <div className="mb-4 p-4 bg-red-600/20 border border-red-600 rounded-lg flex items-center gap-3">
                          <UserX className="w-5 h-5 text-red-600" />
                          <div>
                            <p className="font-bold text-red-600">Account Suspended</p>
                            <p className="text-sm text-muted-foreground">
                              This user has been suspended by admin. They cannot use the app.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        <div className="text-center p-2 bg-muted rounded">
                          <Eye className="w-4 h-4 mx-auto mb-1" />
                          <p className="text-sm font-bold">{selectedUserProfile.total_views || 0}</p>
                          <p className="text-[9px] text-muted-foreground">Views</p>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <Heart className="w-4 h-4 mx-auto mb-1" />
                          <p className="text-sm font-bold">{selectedUserProfile.total_likes || 0}</p>
                          <p className="text-[9px] text-muted-foreground">Likes</p>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <Users className="w-4 h-4 mx-auto mb-1" />
                          <p className="text-sm font-bold">{selectedUserProfile.total_followers || 0}</p>
                          <p className="text-[9px] text-muted-foreground">Followers</p>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
                          <p className="text-sm font-bold">{userWarnings.length}</p>
                          <p className="text-[9px] text-muted-foreground">Warnings</p>
                        </div>
                      </div>

                      {/* Activity */}
                      <Card className="mb-4">
                        <CardHeader className="p-2">
                          <CardTitle className="text-xs">Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                            <div>
                              <p className="text-muted-foreground">24h</p>
                              <p className="font-bold">
                                V:{userActivity[0]?.videos || 0} C:{userActivity[0]?.comments || 0} L:
                                {userActivity[0]?.likes || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">7d</p>
                              <p className="font-bold">
                                V:{userActivity[1]?.videos || 0} C:{userActivity[1]?.comments || 0} L:
                                {userActivity[1]?.likes || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">30d</p>
                              <p className="font-bold">
                                V:{userActivity[2]?.videos || 0} C:{userActivity[2]?.comments || 0} L:
                                {userActivity[2]?.likes || 0}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* User's Videos */}
                      <Card className="mb-4">
                        <CardHeader className="p-2">
                          <CardTitle className="text-xs flex items-center gap-2">
                            <Video className="w-3 h-3" /> Videos ({userVideos.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                          <ScrollArea className="h-40">
                            {userVideos.length === 0 ? (
                              <p className="text-center text-muted-foreground py-4 text-xs">No videos</p>
                            ) : (
                              <div className="space-y-2">
                                {userVideos.map((v) => (
                                  <div
                                    key={v.id}
                                    className="flex items-center justify-between gap-2 text-xs border-b pb-1 last:border-0"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="truncate">{v.caption || "Untitled"}</p>
                                      <div className="flex gap-2 text-[9px] text-muted-foreground">
                                        <span>
                                          <Eye className="w-2.5 h-2.5 inline mr-0.5" />
                                          {v.view_count || 0}
                                        </span>
                                        <span>
                                          <Heart className="w-2.5 h-2.5 inline mr-0.5" />
                                          {v.like_count || 0}
                                        </span>
                                        <span>
                                          <MessageSquare className="w-2.5 h-2.5 inline mr-0.5" />
                                          {v.comment_count || 0}
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={() => deleteVideo(v.id, true)}
                                    >
                                      <Trash2 className="w-3 h-3 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                        </CardContent>
                      </Card>

                      {/* User's Comments */}
                      <Card className="mb-4">
                        <CardHeader className="p-2">
                          <CardTitle className="text-xs flex items-center gap-2">
                            <MessageSquare className="w-3 h-3" /> Comments ({userComments.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                          <ScrollArea className="h-32">
                            {userComments.length === 0 ? (
                              <p className="text-center text-muted-foreground py-4 text-xs">No comments</p>
                            ) : (
                              <div className="space-y-2">
                                {userComments.map((c) => (
                                  <div
                                    key={c.id}
                                    className="flex items-start justify-between gap-2 text-xs border-b pb-1 last:border-0"
                                  >
                                    <p className="flex-1 line-clamp-2">{c.content}</p>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 shrink-0"
                                      onClick={() => deleteComment(c.id, true)}
                                    >
                                      <Trash2 className="w-3 h-3 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                        </CardContent>
                      </Card>

                      {/* Warnings History */}
                      {userWarnings.length > 0 && (
                        <Card>
                          <CardHeader className="p-2">
                            <CardTitle className="text-xs flex items-center gap-2">
                              <AlertTriangle className="w-3 h-3" /> Warnings
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-2">
                            <div className="space-y-2">
                              {userWarnings.map((w) => (
                                <div key={w.id} className="text-xs border-l-2 border-yellow-500 pl-2 py-1">
                                  <p className="text-muted-foreground text-[9px]">
                                    {new Date(w.created_at).toLocaleString()}
                                  </p>
                                  <p>{w.reason}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-[calc(100vh-300px)] flex items-center justify-center">
                <CardContent className="text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Select a user to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileDialog} onOpenChange={setEditProfileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-muted group">
                {editAvatarPreview ? (
                  <img src={editAvatarPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-10 h-10 m-7 text-muted-foreground" />
                )}
                <label
                  htmlFor="avatar-upload"
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                >
                  <Camera className="w-6 h-6 text-white" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEditAvatarFile(file);
                      setEditAvatarPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Click to change avatar</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name</label>
              <Input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Display Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Username" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditProfileDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveProfileChanges} disabled={uploadingAvatar}>
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
