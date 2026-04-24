import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift as GiftIcon, Play, ChevronRight, Sparkles, Heart } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGifts, GiftRecord } from "@/hooks/useGifts";
import { freeGifts, premiumGifts } from "@/data/giftData";
import { cn } from "@/lib/utils";

interface GiftHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const allGifts = [...freeGifts, ...premiumGifts];

const getGiftEmoji = (giftType: string): string => {
  return allGifts.find(g => g.id === giftType)?.emoji || "🎁";
};

const getGiftName = (giftType: string): string => {
  return allGifts.find(g => g.id === giftType)?.name || "Gift";
};

const isGiftPremium = (giftType: string): boolean => {
  return premiumGifts.some(g => g.id === giftType);
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

interface GroupedGift {
  sender_id: string;
  video_id: string;
  sender_profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  video?: {
    caption: string | null;
    thumbnail_url: string | null;
  };
  gifts: {
    gift_type: string;
    count: number;
    total_value: number;
    isPremium: boolean;
  }[];
  total_value: number;
  latest_at: string;
}

export const GiftHistory = ({ open, onOpenChange, userId }: GiftHistoryProps) => {
  const { fetchReceivedGifts } = useGifts();
  const [giftRecords, setGiftRecords] = useState<GiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "premium" | "free">("all");

  useEffect(() => {
    if (open && userId) {
      setLoading(true);
      fetchReceivedGifts(userId).then(gifts => {
        setGiftRecords(gifts);
        setLoading(false);
      });
    }
  }, [open, userId, fetchReceivedGifts]);

  const { groupedGifts, stats } = useMemo(() => {
    const filtered = activeTab === "all" 
      ? giftRecords 
      : activeTab === "premium"
        ? giftRecords.filter(g => isGiftPremium(g.gift_type))
        : giftRecords.filter(g => !isGiftPremium(g.gift_type));

    const grouped = new Map<string, GroupedGift>();
    
    filtered.forEach(gift => {
      const key = `${gift.sender_id}-${gift.video_id}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          sender_id: gift.sender_id,
          video_id: gift.video_id,
          sender_profile: gift.sender_profile,
          video: gift.video,
          gifts: [],
          total_value: 0,
          latest_at: gift.created_at,
        });
      }
      
      const group = grouped.get(key)!;
      const existingGift = group.gifts.find(g => g.gift_type === gift.gift_type);
      
      if (existingGift) {
        existingGift.count += 1;
        existingGift.total_value += gift.gift_value;
      } else {
        group.gifts.push({
          gift_type: gift.gift_type,
          count: 1,
          total_value: gift.gift_value,
          isPremium: isGiftPremium(gift.gift_type),
        });
      }
      
      group.total_value += gift.gift_value;
      
      if (new Date(gift.created_at) > new Date(group.latest_at)) {
        group.latest_at = gift.created_at;
      }
    });

    const totalGifts = giftRecords.length;
    const premiumCount = giftRecords.filter(g => isGiftPremium(g.gift_type)).length;
    const freeCount = giftRecords.filter(g => !isGiftPremium(g.gift_type)).length;
    const premiumValue = giftRecords.filter(g => isGiftPremium(g.gift_type)).reduce((s, g) => s + g.gift_value, 0);

    return {
      groupedGifts: Array.from(grouped.values()).sort(
        (a, b) => new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime()
      ),
      stats: { totalGifts, premiumCount, freeCount, premiumValue },
    };
  }, [giftRecords, activeTab]);

  const tabs = [
    { id: "all" as const, label: "All", count: stats.totalGifts },
    { id: "premium" as const, label: "Premium", count: stats.premiumCount, icon: Sparkles },
    { id: "free" as const, label: "Free", count: stats.freeCount, icon: Heart },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-3xl bg-background border-t border-glass-border p-0"
      >
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <GiftIcon className="w-5 h-5 text-amber-400" />
            Gift History
          </SheetTitle>
        </SheetHeader>

        {/* Stats Summary */}
        <div className="px-4 py-3">
          <div className="flex gap-3">
            <div className="flex-1 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-2xl p-3 border border-amber-500/20">
              <p className="text-xs text-muted-foreground">Total Gifts</p>
              <p className="text-xl font-bold text-amber-400">{stats.totalGifts}</p>
            </div>
            <div className="flex-1 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-2xl p-3 border border-purple-500/20">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Premium</p>
              <p className="text-xl font-bold text-purple-400">{stats.premiumCount}</p>
            </div>
            <div className="flex-1 bg-gradient-to-br from-pink-500/10 to-pink-600/5 rounded-2xl p-3 border border-pink-500/20">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3" /> Free</p>
              <p className="text-xl font-bold text-pink-400">{stats.freeCount}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3 flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
              {tab.label}
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                activeTab === tab.id ? "bg-primary-foreground/20" : "bg-muted-foreground/20"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Gift List */}
        <ScrollArea className="flex-1 h-[calc(100%-240px)]">
          <div className="px-4 pb-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : groupedGifts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <GiftIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  {activeTab === "premium" ? "No premium gifts yet" : activeTab === "free" ? "No free gifts yet" : "No gifts received yet"}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {groupedGifts.map((group, index) => (
                  <motion.div
                    key={`${group.sender_id}-${group.video_id}-${activeTab}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-muted/30 rounded-2xl p-3 border border-glass-border"
                  >
                    {/* Sender Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={group.sender_profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted text-foreground text-sm">
                          {group.sender_profile?.display_name?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {group.sender_profile?.display_name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{group.sender_profile?.username || "user"} • {formatTimeAgo(group.latest_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {group.gifts.reduce((s, g) => s + g.count, 0)} gifts
                        </p>
                        {group.total_value > 0 && (
                          <p className="text-[10px] text-amber-400">+{group.total_value.toLocaleString()} coins</p>
                        )}
                      </div>
                    </div>

                    {/* Video Reference */}
                    {group.video && (
                      <div className="flex items-center gap-2 bg-background/50 rounded-xl p-2 mb-3">
                        <div className="w-12 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                          {group.video.thumbnail_url ? (
                            <img 
                              src={group.video.thumbnail_url} 
                              alt="" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex-1 line-clamp-2">
                          {group.video.caption || "Untitled video"}
                        </p>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    )}

                    {/* Gifts Sent */}
                    <div className="flex flex-wrap gap-2">
                      {group.gifts.map((gift) => (
                        <div 
                          key={gift.gift_type}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-2.5 py-1",
                            gift.isPremium 
                              ? "bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20"
                              : "bg-background border border-glass-border"
                          )}
                        >
                          <span className="text-lg">{getGiftEmoji(gift.gift_type)}</span>
                          <span className="text-xs text-muted-foreground">{getGiftName(gift.gift_type)}</span>
                          {gift.count > 1 && (
                            <span className="text-xs font-medium text-foreground">×{gift.count}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
