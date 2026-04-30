import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  X, Camera, CameraOff, Mic, MicOff, RefreshCw,
  Gift, Share2, Radio, UserPlus, Eye, Sparkles, Coins,
  Shield, BarChart3, Swords, MoreHorizontal,
} from "lucide-react";
import { LiveChat } from "./LiveChat";
import { LiveStreamGiftAnimation, StreamGift } from "./LiveStreamGiftAnimation";
import { TopGifterLeaderboard } from "./TopGifterLeaderboard";
import { MultiGuestPanel } from "./MultiGuestPanel";
import { ModeratorTools } from "./ModeratorTools";
import { LivePollSystem } from "./LivePollSystem";
import { VSBattleOverlay } from "./VSBattleOverlay";
import { useLiveStream, useLiveRealtimeViewers, useLiveRealtimeGifts } from "@/hooks/useLiveStream";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { toast } from "sonner";

interface CreatorLiveRoomProps {
  streamId: string;
  onEndLive: () => void;
  onMiniPlayer?: () => void;
}

export const CreatorLiveRoom = ({ streamId, onEndLive, onMiniPlayer }: CreatorLiveRoomProps) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const viewerCount = useLiveRealtimeViewers(streamId);
  const { latestGift } = useLiveRealtimeGifts(streamId);

  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);
  const [totalGifts, setTotalGifts] = useState(0);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [showGuests, setShowGuests] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showBeauty, setShowBeauty] = useState(false);
  const [showModerator, setShowModerator] = useState(false);
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGift, setActiveGift] = useState<StreamGift | null>(null);
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);

  const [beautySmooth, setBeautySmooth] = useState(0);
  const [beautyBrightness, setBeautyBrightness] = useState(100);
  const [beautyColorTone, setBeautyColorTone] = useState(100);

  const zegoContainerRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<any>(null);
  const initedRef = useRef(false);
  const endingRef = useRef(false);
  const sessionKeyRef = useRef(Math.random().toString(36).slice(2, 10));
  const { endStream, sendChatMessage: sendDbChat, getZegoToken } = useLiveStream();

  useEffect(() => {
    const interval = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (latestGift) {
      setActiveGift({
        id: latestGift.id,
        senderName: latestGift.sender_name || "Someone",
        giftName: latestGift.gift_type,
        giftValue: latestGift.gift_value,
        giftImage: latestGift.gift_image || undefined,
      });
      setTotalCoinsEarned(prev => prev + latestGift.gift_value);
      setTotalGifts(prev => prev + 1);
    }
  }, [latestGift]);

  // Check for active battles
  useEffect(() => {
    const checkBattle = async () => {
      const { data } = await (supabase as any)
        .from("pk_battles")
        .select("id")
        .or(`stream_a_id.eq.${streamId},stream_b_id.eq.${streamId}`)
        .eq("status", "active")
        .maybeSingle();
      if (data) setActiveBattleId(data.id);
    };
    checkBattle();
  }, [streamId]);

  useEffect(() => {
    if (!user?.id || !zegoContainerRef.current || initedRef.current) return;

    const initializeZego = async () => {
      try {
        setIsLoading(true);
        initedRef.current = true;

        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          mediaStream.getTracks().forEach(t => t.stop());
        } catch {
          toast.error("Camera or microphone not available");
          initedRef.current = false;
          setIsLoading(false);
          return;
        }

        const tokenData = await getZegoToken(streamId, "host");

        if (!tokenData?.token || !tokenData?.appId || !tokenData?.zegoUserId) {
          throw new Error("Failed to get Zego token");
        }

        const sanitizedRoomId = tokenData.sanitizedRoomId || streamId.replace(/[^a-zA-Z0-9]/g, "");
        const userName = profile?.display_name || profile?.username || `User_${user.id.slice(0, 4)}`;

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
          tokenData.appId, tokenData.token, sanitizedRoomId, tokenData.zegoUserId, userName
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        await zp.joinRoom({
          container: zegoContainerRef.current!,
          scenario: {
            mode: ZegoUIKitPrebuilt.LiveStreaming,
            config: { role: ZegoUIKitPrebuilt.Host },
          },
          turnOnCameraWhenJoining: true,
          turnOnMicrophoneWhenJoining: true,
          showPreJoinView: false,
          showMyCameraToggleButton: false,
          showMyMicrophoneToggleButton: false,
          showAudioVideoSettingsButton: false,
          showTextChat: false,
          showUserList: false,
          showLeavingView: false,
          layout: "Auto",
          onJoinRoom: () => {
            setIsLoading(false);
            toast.success("You are LIVE! 🔴");
          },
          onLeaveRoom: () => {
            if (!endingRef.current) handleEndLive();
          },
        });
      } catch (error: any) {
        console.error("❌ [Creator] Init Failed:", error);
        initedRef.current = false;
        setIsLoading(false);
        toast.error("Failed to start live — check camera and internet");
      }
    };

    initializeZego();

    return () => {
      if (zpRef.current) {
        try { zpRef.current.destroy(); } catch {}
        zpRef.current = null;
      }
    };
  }, [user?.id, streamId]);

  const handleEndLive = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    try {
      if (zpRef.current) {
        try { zpRef.current.sendInRoomMessage(JSON.stringify({ type: "stream-ended" })); } catch {}
        try { zpRef.current.destroy(); } catch {};
        zpRef.current = null;
      }
      await (supabase as any)
        .from("live_streams")
        .update({ status: "ended", ended_at: new Date().toISOString(), duration_seconds: timer })
        .eq("id", streamId);
    } catch (e) {
      console.error(e);
    } finally {
      onEndLive();
    }
  }, [onEndLive, streamId, timer]);

  const handleSendChat = async (msg: string) => {
    if (zpRef.current) {
      zpRef.current.sendInRoomMessage(JSON.stringify({ type: "chat", message: msg }));
    }
    await sendDbChat(streamId, msg);
  };

  const toggleCamera = () => {
    const next = !cameraOn;
    try { zpRef.current?.turnCameraOn(next); } catch {}
    setCameraOn(next);
  };
  const toggleMic = () => {
    const next = !micOn;
    try { zpRef.current?.turnMicrophoneOn(next); } catch {}
    setMicOn(next);
  };
  const flipCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    try { zpRef.current?.useFrontCamera(next === "user"); } catch {}
    setFacingMode(next);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 3600).toString().padStart(2, "0")}:${Math.floor((s % 3600) / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const beautyCSS = `
    video { object-fit: cover !important; filter: brightness(${beautyBrightness}%) blur(${beautySmooth * 0.1}px) saturate(${beautyColorTone}%); }
    [class*="leaveButton"], [class*="headerRight"], [class*="ZegoRoomHeader"] { display: none !important; }
  `;

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col z-50">
      <style>{beautyCSS}</style>
      <div ref={zegoContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-14 h-14 rounded-full border-3 border-transparent border-t-red-500 border-r-pink-500 mx-auto mb-5"
            />
            <p className="text-lg font-bold">Starting camera...</p>
            <p className="text-white/40 text-sm mt-1">Preparing your live stream</p>
          </div>
        </div>
      )}

      <LiveStreamGiftAnimation gift={activeGift} />

      {/* VS Battle Overlay */}
      {activeBattleId && (
        <VSBattleOverlay
          streamId={streamId}
          isCreator
          battleId={activeBattleId}
          onBattleEnd={() => setActiveBattleId(null)}
        />
      )}

      {/* Top Bar */}
      <div className="relative z-30 flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-red-500">
              <img
                src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                className="w-full h-full object-cover"
                alt=""
              />
            </div>
            <div className="pr-2">
              <p className="text-[11px] font-bold leading-tight">{profile?.display_name || profile?.username || "Creator"}</p>
              <p className="text-[9px] text-white/50">{formatTime(timer)}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-red-600 px-3 py-1 rounded-full shadow-lg shadow-red-600/30">
            <Radio className="w-3 h-3 animate-pulse" />
            <span className="text-xs font-black tracking-wide">LIVE</span>
          </div>
          <div className="bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
            <Eye className="w-3 h-3" />
            <span className="text-xs font-semibold">{viewerCount}</span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 text-black shadow-lg shadow-yellow-500/20"
          >
            <Coins className="w-3 h-3" /> {totalCoinsEarned}
          </motion.div>
          <TopGifterLeaderboard streamId={streamId} />
        </div>
      </div>

      <div className="flex-1" />

      {/* Chat */}
      <div className="relative z-30 h-[35vh]">
        <LiveChat streamId={streamId} onSendMessage={handleSendChat} isCreator />
      </div>

      {/* Bottom Controls */}
      <div className="relative z-30 flex items-center justify-between p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <div className="flex gap-1.5">
          {[
            { icon: cameraOn ? Camera : CameraOff, action: toggleCamera, active: cameraOn, label: "Camera" },
            { icon: micOn ? Mic : MicOff, action: toggleMic, active: micOn, label: "Mic" },
            { icon: RefreshCw, action: flipCamera, label: "Flip" },
            { icon: Sparkles, action: () => setShowBeauty(!showBeauty), color: "text-pink-400", label: "Beauty" },
            { icon: UserPlus, action: () => setShowGuests(true), label: "Guests" },
            { icon: Shield, action: () => setShowModerator(true), color: "text-red-400", label: "Mod" },
          ].map((btn, i) => (
            <motion.div key={i} whileTap={{ scale: 0.85 }}>
              <Button
                size="icon"
                variant="ghost"
                className={`rounded-full w-9 h-9 bg-white/10 backdrop-blur-sm border border-white/10 ${btn.color || ""}`}
                onClick={btn.action}
              >
                <btn.icon size={16} />
              </Button>
            </motion.div>
          ))}
          {/* Poll button */}
          <LivePollSystem streamId={streamId} isCreator onSendMessage={handleSendChat} />
        </div>
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            variant="destructive"
            className="rounded-full px-5 h-9 font-bold shadow-lg shadow-red-500/30 bg-gradient-to-r from-red-600 to-red-500 text-sm"
            onClick={() => setShowEndConfirm(true)}
          >
            End
          </Button>
        </motion.div>
      </div>

      {/* Beauty Filters */}
      <AnimatePresence>
        {showBeauty && (
          <motion.div
            initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
            className="absolute bottom-28 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl p-5 rounded-t-3xl border-t border-white/10"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <p className="text-sm font-bold">Beauty Filters</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowBeauty(false)}>
                <X size={16} />
              </Button>
            </div>
            {[
              { label: "Smooth", value: beautySmooth, set: setBeautySmooth, max: 10 },
              { label: "Brightness", value: beautyBrightness, set: setBeautyBrightness, max: 150, min: 50 },
              { label: "Color Tone", value: beautyColorTone, set: setBeautyColorTone, max: 150, min: 50 },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3 mb-3">
                <span className="text-xs w-20 text-white/50 font-medium">{s.label}</span>
                <input
                  type="range"
                  min={s.min || 0}
                  max={s.max}
                  value={s.value}
                  onChange={e => s.set(Number(e.target.value))}
                  className="flex-1 h-1 accent-pink-500"
                />
                <span className="text-[10px] text-white/30 w-8 text-right">{s.value}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Confirm */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-neutral-900/95 p-6 rounded-3xl w-full max-w-xs border border-white/10 text-center backdrop-blur-xl"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <Radio className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">End Live Stream?</h3>
              <div className="flex items-center justify-center gap-4 text-sm text-white/50 mb-5">
                <div className="text-center">
                  <p className="font-bold text-white">{viewerCount}</p>
                  <p className="text-[10px]">Viewers</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="font-bold text-white">{formatTime(timer)}</p>
                  <p className="text-[10px]">Duration</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="font-bold text-yellow-400">🪙 {totalCoinsEarned}</p>
                  <p className="text-[10px]">Earned</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1 rounded-xl h-11" variant="outline" onClick={() => setShowEndConfirm(false)}>Cancel</Button>
                <Button className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700" onClick={handleEndLive}>End Stream</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Moderator Tools */}
      <AnimatePresence>
        {showModerator && (
          <ModeratorTools streamId={streamId} isCreator onClose={() => setShowModerator(false)} />
        )}
      </AnimatePresence>

      {showGuests && <MultiGuestPanel streamId={streamId} onClose={() => setShowGuests(false)} isCreator />}
    </div>
  );
};
