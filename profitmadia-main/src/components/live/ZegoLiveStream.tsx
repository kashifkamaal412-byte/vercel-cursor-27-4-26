import { useEffect, useRef, useState } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ZegoLiveStreamProps {
  roomId: string;
  role: "host" | "audience";
  onLeave?: () => void;
}

export const ZegoLiveStream = ({ roomId, role, onLeave }: ZegoLiveStreamProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<any>(null);
  const initedRef = useRef(false);
  const { user } = useAuth();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionKeyRef = useRef(Math.random().toString(36).slice(2, 10));

  useEffect(() => {
    if (!user?.id || !containerRef.current || initedRef.current) return;
    initedRef.current = true;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        if (role === "host") {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            stream.getTracks().forEach((t) => t.stop());
          } catch {
            setError("Camera or microphone not available");
            setLoading(false);
            initedRef.current = false;
            return;
          }
        }

        const { data, error: fnError } = await supabase.functions.invoke("generate-zego-token", {
          body: { roomId, role, sessionKey: sessionKeyRef.current },
        });

        if (fnError || !data?.token || !data?.appId || !data?.zegoUserId) {
          throw new Error(fnError?.message || "Token generation failed");
        }

        const sanitizedRoomId = data.sanitizedRoomId || roomId.replace(/[^a-zA-Z0-9]/g, "");
        const userName = profile?.display_name || profile?.username || `User_${user.id.slice(0, 6)}`;

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
          data.appId, data.token, sanitizedRoomId, data.zegoUserId, userName
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        const zegoRole = role === "host" ? ZegoUIKitPrebuilt.Host : ZegoUIKitPrebuilt.Audience;

        await zp.joinRoom({
          container: containerRef.current!,
          scenario: {
            mode: ZegoUIKitPrebuilt.LiveStreaming,
            config: { role: zegoRole },
          },
          showPreJoinView: false,
          turnOnCameraWhenJoining: role === "host",
          turnOnMicrophoneWhenJoining: role === "host",
          showMyCameraToggleButton: role === "host",
          showMyMicrophoneToggleButton: role === "host",
          showAudioVideoSettingsButton: false,
          showTextChat: true,
          showUserList: true,
          showLeavingView: false,
          showRoomTimer: role === "host",
          layout: "Auto",
          onJoinRoom: () => {
            setLoading(false);
            toast.success(role === "host" ? "You are LIVE! 🔴" : "Connected to live!");
          },
          onLeaveRoom: () => {
            onLeave?.();
          },
        });
      } catch (err: any) {
        console.error(`❌ [${role}] Init error:`, err);
        setError(err.message || "Could not start live");
        setLoading(false);
        initedRef.current = false;
      }
    };

    init();

    return () => {
      try { zpRef.current?.destroy(); } catch {}
      zpRef.current = null;
    };
  }, [user?.id, roomId, role]);

  useEffect(() => {
    if (role !== "audience") return;
    const channel = supabase
      .channel(`stream-end-${roomId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "live_streams",
        filter: `id=eq.${roomId}`,
      }, (payload: any) => {
        if (payload.new.status === "ended") {
          toast.info("Stream has ended");
          try { zpRef.current?.destroy(); } catch {}
          zpRef.current = null;
          onLeave?.();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, role, onLeave]);

  if (error) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <p className="text-xl">❌ {error}</p>
          <button
            onClick={onLeave}
            className="px-6 py-2 bg-destructive text-destructive-foreground rounded-full"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full border-3 border-transparent border-t-red-500 border-r-pink-500 mx-auto mb-4"
            />
            <p className="text-white text-lg font-bold">
              {role === "host" ? "Starting camera..." : "Connecting..."}
            </p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
      <style>{`
        video { object-fit: cover !important; }
      `}</style>
    </div>
  );
};
