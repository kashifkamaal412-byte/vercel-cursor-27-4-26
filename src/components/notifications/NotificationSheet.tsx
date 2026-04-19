import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Settings,
  CheckCheck,
  Heart,
  MessageCircle,
  Eye,
  UserPlus,
  Share2,
  Bookmark,
  Repeat,
  Gift,
  Radio,
  Pin,
  TrendingUp,
  Flag,
  MoreHorizontal,
  Send,
  AtSign,
  Bell,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  from_user_id: string;
  user_id: string;
  video_id?: string | null;
  message: string;
  is_read: boolean;
  metadata?: any;
  created_at: string;
  actor?: {
    username?: string;
    display_name?: string;
    avatar_url?: string | null;
  };
  // UI convenience
  target_title?: string;
  target_thumbnail?: string | null;
  gift_type?: string;
  count?: number;
}

interface NotificationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tabs = [
  { id: "all", label: "All", icon: null },
  { id: "likes", label: "Likes", icon: Heart },
  { id: "comments", label: "Comments", icon: MessageCircle },
  { id: "mentions", label: "Mentions", icon: AtSign },
  { id: "follows", label: "Follows", icon: UserPlus },
  { id: "shares", label: "Shares", icon: Share2 },
  { id: "saves", label: "Saves", icon: Bookmark },
  { id: "reposts", label: "Reposts", icon: Repeat },
  { id: "gifts", label: "Gifts", icon: Gift },
  { id: "live", label: "Live", icon: Radio },
  { id: "pinned", label: "Pinned", icon: Pin },
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "reports", label: "Reports", icon: Flag },
];

export function NotificationSheet({ open, onOpenChange }: NotificationSheetProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!open || !user) return;
    fetchNotifications();
    // Realtime subscription
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          if (!newNotif.is_read) setUnreadCount((prev) => prev + 1);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, user]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch actor profiles
      const fromUserIds = [...new Set((data || []).map((n: any) => n.from_user_id))];
      let profilesMap: Record<string, any> = {};
      if (fromUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", fromUserIds);
        (profiles || []).forEach((p: any) => { profilesMap[p.user_id] = p; });
      }

      const mapped: Notification[] = (data || []).map((n: any) => ({
        ...n,
        actor: profilesMap[n.from_user_id] || undefined,
        target_title: n.metadata?.video_caption,
        gift_type: n.metadata?.gift_type,
      }));
      setNotifications(mapped);
      setUnreadCount(mapped.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const handleAction = async (type: string, targetId: string, action: string) => {
    // Implement actions: like back, reply, follow back, thank for gift, etc.
    // For now, just show toast
    toast.success(`${action} action triggered`);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab !== "all" && n.type !== activeTab.replace(/s$/, "")) return false;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        n.actor?.display_name.toLowerCase().includes(searchLower) ||
        n.actor?.username.toLowerCase().includes(searchLower) ||
        n.target_title?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Group by date
  const grouped: { [key: string]: Notification[] } = {};
  filteredNotifications.forEach((n) => {
    const date = new Date(n.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let key = "Older";
    if (date.toDateString() === today.toDateString()) key = "Today";
    else if (date.toDateString() === yesterday.toDateString()) key = "Yesterday";
    else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) key = "This Week";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(n);
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">Notifications</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={markAllAsRead} title="Mark all as read">
                  <CheckCheck className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    /* open settings */
                  }}
                >
                  <Settings className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="overflow-x-auto hide-scrollbar border-b">
              <div className="flex gap-1 px-4 min-w-max">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeTab === tab.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    {tab.icon && <tab.icon className="w-4 h-4" />}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Unread badge floating */}
            {unreadCount > 0 && (
              <div className="absolute top-20 right-4 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-full">
                {unreadCount} new
              </div>
            )}

            {/* Notifications list */}
            <div className="overflow-y-auto h-[calc(100%-180px)] pb-20">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No notifications</p>
                </div>
              ) : (
                Object.entries(grouped).map(([section, items]) => (
                  <div key={section}>
                    <div className="sticky top-0 bg-background/95 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-muted-foreground border-y">
                      {section}
                    </div>
                    {items.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notification={notif}
                        onMarkRead={() => markAsRead(notif.id)}
                        onAction={handleAction}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  onAction,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onAction: (type: string, targetId: string, action: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [replyText, setReplyText] = useState("");

  const getIcon = () => {
    switch (notification.type) {
      case "like":
        return <Heart className="w-4 h-4 text-red-500" />;
      case "comment":
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case "follow":
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case "mention":
        return <AtSign className="w-4 h-4 text-purple-500" />;
      case "share":
        return <Share2 className="w-4 h-4 text-cyan-500" />;
      case "save":
        return <Bookmark className="w-4 h-4 text-yellow-500" />;
      case "repost":
        return <Repeat className="w-4 h-4 text-emerald-500" />;
      case "gift":
        return <Gift className="w-4 h-4 text-pink-500" />;
      case "live":
        return <Radio className="w-4 h-4 text-red-500" />;
      case "report":
        return <Flag className="w-4 h-4 text-orange-500" />;
      case "trending":
        return <TrendingUp className="w-4 h-4 text-amber-500" />;
      case "pinned":
        return <Pin className="w-4 h-4 text-indigo-500" />;
      default:
        return null;
    }
  };

  const getActionButtons = () => {
    switch (notification.type) {
      case "like":
        return (
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => onAction("like", notification.video_id!, "like back")}
          >
            <Heart className="w-3 h-3" /> Like back
          </Button>
        );
      case "comment":
        return (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setIsExpanded(!isExpanded)}>
              <MessageCircle className="w-3 h-3" /> Reply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1"
              onClick={() => onAction("comment", notification.video_id!, "view")}
            >
              <Eye className="w-3 h-3" /> View
            </Button>
          </div>
        );
      case "follow":
        return (
          <Button
            size="sm"
            variant="default"
            className="gap-1"
            onClick={() => onAction("follow", notification.from_user_id, "follow back")}
          >
            <UserPlus className="w-3 h-3" /> Follow back
          </Button>
        );
      case "gift":
        return (
          <Button
            size="sm"
            variant="default"
            className="gap-1 bg-pink-500 hover:bg-pink-600"
            onClick={() => onAction("gift", notification.video_id!, "thank")}
          >
            <Gift className="w-3 h-3" /> Thank
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1"
            onClick={() => onAction(notification.type, notification.video_id!, "view")}
          >
            <Eye className="w-3 h-3" /> View
          </Button>
        );
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 border-b hover:bg-muted/50 transition-colors ${!notification.is_read ? "bg-primary/5" : ""}`}
      onClick={onMarkRead}
    >
      <div className="flex gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={notification.actor?.avatar_url || undefined} />
          <AvatarFallback>{notification.actor?.display_name?.[0] || "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-semibold">{notification.actor?.display_name}</span>{" "}
              <span className="text-muted-foreground text-sm">
                {notification.type === "like" && "liked your video"}
                {notification.type === "comment" && "commented on your video"}
                {notification.type === "follow" && "followed you"}
                {notification.type === "mention" && "mentioned you in a comment"}
                {notification.type === "share" && "shared your video"}
                {notification.type === "save" && "saved your video"}
                {notification.type === "repost" && "reposted your video"}
                {notification.type === "gift" && `sent you a ${notification.gift_type || "gift"} on your video`}
                {notification.type === "live" && "is live now"}
                {notification.type === "report" && "reported your video"}
                {notification.type === "trending" && "your video is trending"}
                {notification.type === "pinned" && "pinned your video"}
              </span>
              {notification.target_title && (
                <span className="text-muted-foreground text-sm block truncate">"{notification.target_title}"</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
              {getIcon()}
              <span>{timeAgo}</span>
            </div>
          </div>

          {/* Media thumbnail */}
          {notification.target_thumbnail && (
            <div className="mt-2 w-16 h-16 rounded-md overflow-hidden border">
              <img src={notification.target_thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-2">{getActionButtons()}</div>

          {/* Inline reply for comments */}
          {isExpanded && notification.type === "comment" && (
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1"
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                size="sm"
                className="gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction("comment", notification.video_id!, "send reply");
                  setReplyText("");
                }}
              >
                <Send className="w-3 h-3" /> Send
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
