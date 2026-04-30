import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  useLiveStream,
  useLiveRealtimeChat,
  useLiveRealtimeViewers,
  useLiveRealtimeGifts,
} from "@/hooks/useLiveStream";
import { GiftSheet } from "@/components/gifts/GiftSheet";
import { LiveStreamGiftAnimation, StreamGift } from "./LiveStreamGiftAnimation";
import { TopGifterLeaderboard } from "./TopGifterLeaderboard";
import { VSBattleOverlay } from "./VSBattleOverlay";
import { LivePollSystem } from "./LivePollSystem";
import { VIPBadge, VIPEntranceEffect, getViewerLevel } from "./VIPBadgeSystem";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Send, Gift, X, Eye, UserPlus, Share2, Flag, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Gift as GiftType } from "@/data/giftData";

interface ViewerLiveRoomProps {
  stream: any;
  onExit: () => void;
}

export const ViewerLiveRoom = ({ stream, onExit }: ViewerLiveRoomProps) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const chatMessages = useLiveRealtimeChat(stream.id);
  const viewerCount = useLiveRealtimeViewers(stream.id);
  const { latestGift } = useLiveRealtimeGifts(stream.id);
  const { joinStream, leaveStream, sendChatMessage: sendDbChat, sendLiveGift, requestToJoinAsGuest, getZegoToken } = useLiveStream();

  const zegoContainerRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<any>(null);
  const initedRef = useRef(false);
  const mediaSyncRef = useRef<number | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sessionKeyRef = useRef(Math.random().toString(36).slice(2, 10));

  const [message, setMessage] = useState("");
  const [isConnecting, setIsConnecting] = useState(true);
  const [showGiftSheet, setShowGiftSheet] = useState(false);
  const [activeGift, setActiveGift] = useState<StreamGift | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; emoji: string }[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasRequestedJoin, setHasRequestedJoin] = useState(false);
  const [giftCombo, setGiftCombo] = useState(0);
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [entranceEffect, setEntranceEffect] = useState<{ name: string; level: any } | null>(null);
  const giftComboTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Gift combo
  useEffect(() => {
    if (latestGift) {
      setActiveGift({
        id: latestGift.id,
        senderName: latestGift.sender_name || "Someone",
        giftName: latestGift.gift_type,
        giftValue: latestGift.gift_value,
        giftImage: latestGift.gift_image || undefined,
      });
      setGiftCombo(prev => prev + 1);
      if (giftComboTimer.current) clearTimeout(giftComboTimer.current);
      giftComboTimer.current = setTimeout(() => setGiftCombo(0), 3000);
    }
  }, [latestGift]);

  // Check follow status
  useEffect(() => {
    if (!user || !stream.creator_id) return;
    supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", stream.creator_id)
      .maybeSingle()
      .then(({ data }) => setIsFollowing(!!data));
  }, [user, stream.creator_id]);

  // Check for active battles
  useEffect(() => {
    const checkBattle = async () => {
      const { data } = await (supabase as any)
        .from("pk_battles")
        .select("id")
        .or(`stream_a_id.eq.${stream.id},stream_b_id.eq.${stream.id}`)
        .eq("status", "active")
        .maybeSingle();
      if (data) setActiveBattleId(data.id);
    };
    checkBattle();
  }, [stream.id]);

  // VIP entrance effect
  useEffect(() => {
    if (!user || !profile) return;
    const totalGifts = profile.total_gifts || 0;
    const level = getViewerLevel(totalGifts);
    if (level.level >= 3) {
      setEntranceEffect({
        name: profile.display_name || profile.username || "Viewer",
        level,
      });
    }
  }, [user, profile]);

  // Media sync
  const syncMedia = useCallback(() => {
    const container = zegoContainerRef.current;
    if (!container) return;
    container.querySelectorAll("video, audio").forEach((el) => {
      const media = el as HTMLVideoElement | HTMLAudioElement;
      if (media.muted) media.muted = false;
      if (media.paused) media.play().catch(() => {});
      media.autoplay = true;
    });
  }, []);

  // Subscribe to stream status
  useEffect(() => {
    const channel = supabase
      .channel(`stream-status-${stream.id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "live_streams",
        filter: `id=eq.${stream.id}`,
      }, (payload: any) => {
        if (payload.new.status === "ended") {
          toast.info("Stream has ended");
          if (mediaSyncRef.current) clearInterval(mediaSyncRef.current);
          if (observerRef.current) observerRef.current.disconnect();
          try { zpRef.current?.destroy(); zpRef.current = null; } catch {}
          leaveStream(stream.id).catch(() => {});
          onExit();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [stream.id, onExit]);

  // Ensure video elements are visible and fill the container for audience view
  useEffect(() => {
    const container = zegoContainerRef.current;
    if (!container) return;
    const observer = new MutationObserver(() => {
      const videos = container.querySelectorAll('video');
      videos.forEach((video) => {
        const v = video as HTMLVideoElement;
        v.style.width = '100%';
        v.style.height = '100%';
        v.style.objectFit = 'cover';
        v.style.position = 'absolute';
        v.style.top = '0';
        v.style.left = '0';
        v.style.zIndex = '1';
      });
    });
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Zego initialization
  useEffect(() => {
    if (!user || !zegoContainerRef.current || initedRef.current) return;
    initedRef.current = true;

    const initZego = async () => {
      try {
        setIsConnecting(true);
        await joinStream(stream.id);

        const sanitizedRoomId = stream.id.replace(/[^a-zA-Z0-9]/g, "");
        const userName = profile?.display_name || profile?.username || "Viewer";
        
        // Use test token generation with AppSign from env
        const appId = parseInt(import.meta.env.VITE_ZEGO_APP_ID || "1497584012");
        const appSign = import.meta.env.VITE_ZEGO_APP_SIGN || "";
        const zegoUserId = `audience_${user.id.slice(0, 8)}`;
        
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appId, appSign, sanitizedRoomId, zegoUserId, userName
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        await zp.joinRoom({
          container: zegoContainerRef.current!,
          scenario: {
            mode: ZegoUIKitPrebuilt.LiveStreaming,
            config: { role: ZegoUIKitPrebuilt.Audience },
          },
          showPreJoinView: false,
          showTextChat: false,
          showUserList: false,
          showLeavingView: false,
          showMyCameraToggleButton: false,
          showMyMicrophoneToggleButton: false,
          showAudioVideoSettingsButton: false,
          layout: "Auto",
          onJoinRoom: () => {
            setIsConnecting(false);
            toast.success("Connected to live!");
            mediaSyncRef.current = window.setInterval(syncMedia, 500);
            observerRef.current = new MutationObserver(() => syncMedia());
            if (zegoContainerRef.current) {
              observerRef.current.observe(zegoContainerRef.current, { childList: true, subtree: true });
            }
          },
          onInRoomMessageReceived: (messageInfo: any) => {
            try {
              const raw = typeof messageInfo.message === "string"
                ? messageInfo.message
                : messageInfo.message?.message || "";
              const msgData = JSON.parse(raw);
              if (msgData.type === "stream-ended") {
                toast.info("Stream has ended");
                onExit();
              } else if (msgData.type === "gift") {
                setActiveGift({
                  id: String(Date.now()),
                  senderName: messageInfo.fromUser?.userName || "Someone",
                  giftName: msgData.giftName,
                  giftValue: msgData.giftValue,
                  giftImage: msgData.giftImage,
                  emoji: msgData.emoji,
                });
              }
            } catch {}
          },
          onLeaveRoom: () => {
            console.log("🔴 [Viewer] onLeaveRoom called, exiting");
            onExit();
          },
        });
      } catch (err: any) {
        console.error("❌ [Viewer] Error:", err);
        initedRef.current = false;
        setIsConnecting(false);
        toast.error("Failed to connect to live stream");
      }
    };

    initZego();

    return () => {
      if (mediaSyncRef.current) clearInterval(mediaSyncRef.current);
      if (observerRef.current) observerRef.current.disconnect();
      try { zpRef.current?.destroy(); zpRef.current = null; } catch {}
      leaveStream(stream.id);
    };
  }, [user, stream.id]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (zpRef.current) {
      zpRef.current.sendInRoomMessage(JSON.stringify({ type: "chat", message: message.trim() }));
    }
    sendDbChat(stream.id, message.trim());
    setMessage("");
  };

  const handleSendGift = async (gift: GiftType, quantity: number) => {
    if (zpRef.current) {
      zpRef.current.sendInRoomMessage(JSON.stringify({
        type: "gift", giftName: gift.name, giftValue: gift.value * quantity,
        giftImage: gift.imageUrl || null, emoji: gift.emoji,
      }));
    }
    await sendLiveGift(stream.id, gift.name, gift.value * quantity, gift.imageUrl);
    toast.success(`Sent ${gift.name}!`);
  };

  const handleTapHeart = () => {
    const id = Date.now();
    const x = 20 + Math.random() * 60;
    const emojis = ["❤️", "💕", "💗", "💖", "🩷"];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    setFloatingHearts(prev => [...prev.slice(-20), { id, x, emoji }]);
    setTimeout(() => setFloatingHearts(prev => prev.filter(h => h.id !== id)), 2500);
    sendDbChat(stream.id, "❤️").catch(() => {});
  };

  const handleFollow = async () => {
    if (!user || !stream.creator_id) return;
    try {
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", stream.creator_id);
        setIsFollowing(false);
      } else {
        await supabase.from("follows").insert({ follower_id: user.id, following_id: stream.creator_id });
        setIsFollowing(true);
        toast.success("Followed!");
      }
    } catch {}
  };

  const handleRequestJoin = async () => {
    try {
      await requestToJoinAsGuest(stream.id);
      setHasRequestedJoin(true);
      toast.success("Join request sent!");
    } catch {
      toast.error("Could not send request");
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: stream.title, text: `Watch ${stream.creator_name} live!`, url: window.location.href });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col">
      <div ref={zegoContainerRef} className="absolute inset-0 w-full h-full z-0" style={{ minHeight: '100vh' }} />

      {/* Connecting overlay */}
      <AnimatePresence>
        {isConnecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/90 z-50"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-14 h-14 rounded-full border-3 border-transparent border-t-red-500 border-r-pink-500 mx-auto mb-5"
              />
              <p className="text-white text-lg font-bold">Connecting...</p>
              <p className="text-white/40 text-sm mt-1">{stream.title}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gift Animation */}
      <LiveStreamGiftAnimation gift={activeGift} />

      {/* VS Battle Overlay */}
      {activeBattleId && (
        <VSBattleOverlay
          streamId={stream.id}
          battleId={activeBattleId}
          onBattleEnd={() => setActiveBattleId(null)}
        />
      )}

      {/* VIP Entrance Effect */}
      <AnimatePresence>
        {entranceEffect && (
          <VIPEntranceEffect
            userName={entranceEffect.name}
            level={entranceEffect.level}
            onComplete={() => setEntranceEffect(null)}
          />
        )}
      </AnimatePresence>

      {/* Gift Combo */}
      <AnimatePresence>
        {giftCombo > 1 && (
          <motion.div
            key={giftCombo}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute top-1/3 right-6 z-50 pointer-events-none"
          >
            <div className="text-center">
              <motion.p
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.3 }}
                className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-lg"
              >
                x{giftCombo}
              </motion.p>
              <p className="text-xs text-yellow-400 font-bold">COMBO!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Hearts */}
      <AnimatePresence>
        {floatingHearts.map(h => (
          <motion.div
            key={h.id}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -350, scale: [0.5, 1.2, 1.5, 1], x: Math.sin(h.x) * 30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="absolute bottom-36 z-40 text-2xl pointer-events-none"
            style={{ right: `${h.x}px` }}
          >
            {h.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* MAIN UI OVERLAY */}
      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        {/* TOP BAR */}
        <div className="p-3 flex justify-between items-start pointer-events-auto">
          <div className="flex items-center gap-2">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 bg-black/60 backdrop-blur-md p-1 pr-3 rounded-full border border-white/10"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-500 via-pink-500 to-yellow-500 p-[2px]">
                <img
                  src={stream.creator_avatar || stream.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.creator_id}`}
                  className="w-full h-full rounded-full object-cover bg-black"
                  alt=""
                />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-white text-xs font-bold leading-tight">{stream.creator_name || stream.profiles?.display_name || "Creator"}</p>
                  <VIPBadge totalGifts={stream.gift_count || 0} size="sm" />
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white/50 text-[10px] font-medium">LIVE</span>
                </div>
              </div>
            </motion.div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleFollow}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                isFollowing
                  ? "bg-white/5 text-white/60 border-white/15"
                  : "bg-gradient-to-r from-red-500 to-pink-500 text-white border-transparent shadow-lg shadow-red-500/20"
              }`}
            >
              {isFollowing ? "Following" : "Follow"}
            </motion.button>
          </div>

          <div className="flex items-center gap-2">
            <TopGifterLeaderboard streamId={stream.id} />
            <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
              <Eye className="w-3 h-3 text-white/70" />
              <span className="text-white text-xs font-semibold">{viewerCount}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onExit}
              className="w-9 h-9 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10"
            >
              <X size={18} />
            </motion.button>
          </div>
        </div>

        <div className="flex-1" />

        {/* CHAT + CONTROLS */}
        <div className="p-3 space-y-3 pointer-events-auto">
          {/* Chat messages with VIP badges */}
          <div className="h-52 overflow-y-auto space-y-1.5 flex flex-col justify-end mask-fade-top scrollbar-hide">
            {chatMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 bg-black/40 backdrop-blur-sm self-start px-3 py-1.5 rounded-2xl border border-white/5 max-w-[85%]"
              >
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarImage src={msg.user_avatar || ""} />
                  <AvatarFallback className="text-[9px] bg-white/10 text-white">{(msg.user_name || "U")[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-yellow-400 text-[11px] font-bold">{msg.user_name}</span>
                  </div>
                  {msg.message_type === "reaction" ? (
                    <span className="text-lg ml-1">{msg.content}</span>
                  ) : (
                    <p className="text-white text-xs leading-tight">{msg.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input + Action Buttons */}
          <div className="flex items-center gap-2">
            <form
              onSubmit={handleSendMessage}
              className="flex-1 flex items-center bg-black/50 backdrop-blur-md rounded-full border border-white/10 px-4 py-2.5"
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Say something..."
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              />
              <motion.button whileTap={{ scale: 0.85, rotate: 15 }} type="submit" className="ml-2">
                <Send size={18} className="text-white/60" />
              </motion.button>
            </form>

            <motion.button
              whileTap={{ scale: 0.75 }}
              onClick={handleTapHeart}
              className="w-11 h-11 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10"
            >
              <motion.div whileTap={{ scale: 1.5 }}>
                <Heart size={22} className="text-red-500 fill-red-500" />
              </motion.div>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => setShowGiftSheet(true)}
              className="w-11 h-11 bg-gradient-to-tr from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30"
            >
              <Gift size={20} className="text-black" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleShare}
              className="w-11 h-11 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10"
            >
              <Share2 size={18} className="text-white/70" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleRequestJoin}
              disabled={hasRequestedJoin}
              className={`w-11 h-11 rounded-full flex items-center justify-center border ${
                hasRequestedJoin
                  ? "bg-green-500/10 border-green-500/20"
                  : "bg-black/50 backdrop-blur-md border-white/10"
              }`}
            >
              <UserPlus size={18} className={hasRequestedJoin ? "text-green-400" : "text-white/70"} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Gift Sheet */}
      <GiftSheet
        open={showGiftSheet}
        onOpenChange={setShowGiftSheet}
        onSendGift={handleSendGift}
        creatorName={stream.creator_name || stream.profiles?.display_name || "Creator"}
        creatorAvatar={stream.creator_avatar || stream.profiles?.avatar_url}
      />

      <style>{`
        .mask-fade-top {
          mask-image: linear-gradient(to top, black 80%, transparent 100%);
        }
        video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 100vh !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 1 !important;
        }
        [class*="leaveButton"], [class*="headerRight"], [class*="ZegoRoomHeader"] { display: none !important; }
        [class*="videoContainer"], [class*="zego-video-container"] { width: 100% !important; height: 100% !important; position: absolute !important; top: 0 !important; left: 0 !important; }
      `}</style>
    </div>
  );
};
