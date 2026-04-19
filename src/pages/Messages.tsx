import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Edit, Image } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { ConversationItem } from "@/components/messages/ConversationItem";
import { PinnedChannelItem } from "@/components/messages/PinnedChannelItem";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type TabType = "messages" | "requests";

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("messages");
  const { conversations, loading, fetchConversations, subscribeToConversations } = useMessages();

  useEffect(() => {
    if (user) {
      fetchConversations();
      const unsubscribe = subscribeToConversations();
      return unsubscribe;
    }
  }, [user, fetchConversations, subscribeToConversations]);

  const acceptedConversations = conversations.filter(conv => conv.status === 'accepted');
  const pendingSentConversations = conversations.filter(conv => conv.is_pending_sent);
  const requestConversations = conversations.filter(conv => conv.is_request);
  const messageConversations = [...acceptedConversations, ...pendingSentConversations];

  const filteredConversations = (activeTab === "messages" ? messageConversations : requestConversations)
    .filter(conv => {
      if (searchQuery) {
        const name = conv.other_user?.display_name || conv.other_user?.username || "";
        if (!name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });

  const pinnedChannels = acceptedConversations.slice(0, 4);
  const requestCount = requestConversations.length;
  const requestUnreadCount = requestConversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  if (!user) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">Sign in to view messages</h2>
            <p className="text-muted-foreground mb-4">Connect with creators and friends</p>
            <Button variant="glow" onClick={() => navigate("/auth")}>Sign In</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen pb-20 md:pb-6 bg-background md:max-w-3xl md:mx-auto">
        {/* Premium Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl md:static">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative md:hidden">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full animate-spin-slow opacity-70" />
                <Avatar className="w-10 h-10 border-2 border-background relative">
                  <AvatarImage src="" className="object-cover" />
                  <AvatarFallback className="bg-muted text-sm">{user?.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
              </motion.div>
              <motion.h1 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold text-foreground">
                Inbox
              </motion.h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-lg bg-muted/50 border border-glass-border/50 hover:bg-muted">
                <Plus className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-lg bg-muted/50 border border-glass-border/50 hover:bg-muted">
                <Edit className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-6">
              <button onClick={() => setActiveTab("messages")} className="relative pb-2">
                <span className={cn("text-base font-semibold transition-colors", activeTab === "messages" ? "text-foreground" : "text-muted-foreground")}>
                  Messages
                </span>
                {activeTab === "messages" && (
                  <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
              <button onClick={() => setActiveTab("requests")} className="relative pb-2 flex items-center gap-2">
                <span className={cn("text-base font-semibold transition-colors", activeTab === "requests" ? "text-foreground" : "text-muted-foreground")}>
                  Requests
                </span>
                {requestCount > 0 && (
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium",
                    requestUnreadCount > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>{requestCount}</span>
                )}
                {activeTab === "requests" && (
                  <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 pb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search neural network..."
                className="pl-11 h-11 bg-muted/30 border-glass-border/30 rounded-xl text-sm placeholder:text-muted-foreground/50" />
            </div>
          </div>
        </div>

        {/* Pinned */}
        {activeTab === "messages" && pinnedChannels.length > 0 && (
          <div className="px-4 mb-4">
            <h2 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Pinned Channels</h2>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
              {pinnedChannels.map((conv, index) => (
                <PinnedChannelItem key={conv.id} conversation={conv} index={index} currentUserId={user.id} />
              ))}
            </div>
          </div>
        )}

        {/* Conversations */}
        <div className="px-4">
          <h2 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
            {activeTab === "messages" ? "Recent Transmissions" : "Message Requests"}
          </h2>
          <div className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20">
                    <Skeleton className="w-14 h-14 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <Search className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-2">
                  {searchQuery ? "No results found" : activeTab === "requests" ? "No message requests" : "No conversations yet"}
                </h2>
                <p className="text-muted-foreground text-sm max-w-xs">
                  {searchQuery ? "Try searching with a different name" : activeTab === "requests" ? "Messages from people you don't follow will appear here" : "Start a conversation by visiting a creator's profile and tapping Message"}
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredConversations.map((conversation, index) => (
                  <motion.div key={conversation.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} layout>
                    <ConversationItem
                      conversation={conversation}
                      onClick={() => {
                        const otherUserId = conversation.participant_one === user.id ? conversation.participant_two : conversation.participant_one;
                        navigate(`/chat/${otherUserId}`);
                      }}
                      showRequestActions={activeTab === "requests"}
                      onRequestAction={fetchConversations}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Messages;
