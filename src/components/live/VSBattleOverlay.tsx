import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Trophy, Timer, Flame, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLiveStream } from "@/hooks/useLiveStream";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface VSBattleOverlayProps {
  streamId: string;
  isCreator?: boolean;
  battleId?: string | null;
  onBattleEnd?: () => void;
}

interface BattleData {
  id: string;
  stream_a_id: string;
  stream_b_id: string;
  score_a: number;
  score_b: number;
  status: string;
  duration_seconds: number;
  started_at: string | null;
  winner_stream_id: string | null;
  creator_a?: { name: string; avatar: string };
  creator_b?: { name: string; avatar: string };
}

export const VSBattleOverlay = ({ streamId, isCreator, battleId, onBattleEnd }: VSBattleOverlayProps) => {
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showWinner, setShowWinner] = useState(false);
  const [winnerSide, setWinnerSide] = useState<"a" | "b" | "draw" | null>(null);

  useEffect(() => {
    if (!battleId) return;

    const fetchBattle = async () => {
      const { data } = await (supabase as any)
        .from("pk_battles")
        .select("*")
        .eq("id", battleId)
        .single();

      if (!data) return;

      // Fetch creator profiles
      const streamIds = [data.stream_a_id, data.stream_b_id];
      const { data: streams } = await (supabase as any)
        .from("live_streams")
        .select("id, creator_id")
        .in("id", streamIds);

      if (streams) {
        const creatorIds = streams.map((s: any) => s.creator_id);
        const { data: profiles } = await supabase
          .from("public_profile_view")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", creatorIds);

        const profileMap = new Map((profiles || []).map(p => [p.user_id as string, p]));
        const streamMap = new Map(streams.map((s: any) => [s.id as string, s.creator_id as string]));

        const creatorAId = streamMap.get(data.stream_a_id) as string | undefined;
        const creatorBId = streamMap.get(data.stream_b_id) as string | undefined;

        data.creator_a = {
          name: (creatorAId && profileMap.get(creatorAId)?.display_name) || (creatorAId && profileMap.get(creatorAId)?.username) || "Creator A",
          avatar: (creatorAId && profileMap.get(creatorAId)?.avatar_url) || "",
        };
        data.creator_b = {
          name: (creatorBId && profileMap.get(creatorBId)?.display_name) || (creatorBId && profileMap.get(creatorBId)?.username) || "Creator B",
          avatar: (creatorBId && profileMap.get(creatorBId)?.avatar_url) || "",
        };
      }

      setBattle(data);

      if (data.status === "active" && data.started_at) {
        const elapsed = Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000);
        setTimeLeft(Math.max(0, (data.duration_seconds || 180) - elapsed));
      }
    };

    fetchBattle();

    const channel = supabase
      .channel(`battle-${battleId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "pk_battles",
        filter: `id=eq.${battleId}`,
      }, (payload: any) => {
        setBattle(prev => prev ? { ...prev, ...payload.new } : null);
        if (payload.new.status === "ended") {
          const sa = payload.new.score_a || 0;
          const sb = payload.new.score_b || 0;
          setWinnerSide(sa > sb ? "a" : sb > sa ? "b" : "draw");
          setShowWinner(true);
          setTimeout(() => {
            setShowWinner(false);
            onBattleEnd?.();
          }, 6000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [battleId]);

  // Countdown timer
  useEffect(() => {
    if (!battle || battle.status !== "active" || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [battle?.status, timeLeft]);

  if (!battle) return null;

  const totalScore = (battle.score_a || 0) + (battle.score_b || 0);
  const percentA = totalScore > 0 ? ((battle.score_a || 0) / totalScore) * 100 : 50;
  const percentB = 100 - percentA;
  const isAWinning = (battle.score_a || 0) > (battle.score_b || 0);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <>
      {/* VS Battle Score Bar */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-16 left-3 right-3 z-50"
      >
        {/* Timer */}
        <div className="flex justify-center mb-2">
          <motion.div
            animate={timeLeft < 30 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: timeLeft < 30 ? Infinity : 0 }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
              timeLeft < 30 ? "bg-red-600 text-white" : "bg-black/70 backdrop-blur-md text-white border border-white/10"
            }`}
          >
            <Timer className="w-3 h-3" />
            {formatTime(timeLeft)}
          </motion.div>
        </div>

        {/* Score Bar */}
        <div className="bg-black/70 backdrop-blur-xl rounded-2xl p-2.5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7 border-2 border-blue-500">
                <AvatarImage src={battle.creator_a?.avatar || ""} />
                <AvatarFallback className="text-[9px] bg-blue-500/20 text-blue-400">A</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[10px] font-bold text-white truncate max-w-[60px]">{battle.creator_a?.name || "A"}</p>
                <motion.p
                  key={battle.score_a}
                  initial={{ scale: 1.5, color: "#60a5fa" }}
                  animate={{ scale: 1, color: "#ffffff" }}
                  className="text-sm font-black text-white"
                >
                  {battle.score_a || 0}
                </motion.p>
              </div>
            </div>

            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-1"
            >
              <Swords className="w-6 h-6 text-yellow-400" />
            </motion.div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-[10px] font-bold text-white truncate max-w-[60px]">{battle.creator_b?.name || "B"}</p>
                <motion.p
                  key={battle.score_b}
                  initial={{ scale: 1.5, color: "#f87171" }}
                  animate={{ scale: 1, color: "#ffffff" }}
                  className="text-sm font-black text-white"
                >
                  {battle.score_b || 0}
                </motion.p>
              </div>
              <Avatar className="w-7 h-7 border-2 border-red-500">
                <AvatarImage src={battle.creator_b?.avatar || ""} />
                <AvatarFallback className="text-[9px] bg-red-500/20 text-red-400">B</AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2.5 rounded-full overflow-hidden flex bg-white/5">
            <motion.div
              animate={{ width: `${percentA}%` }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-l-full relative"
            >
              {isAWinning && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white/30 to-transparent"
                />
              )}
            </motion.div>
            <motion.div
              animate={{ width: `${percentB}%` }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-gradient-to-r from-red-400 to-red-600 rounded-r-full relative"
            >
              {!isAWinning && (battle.score_b || 0) > (battle.score_a || 0) && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white/30 to-transparent"
                />
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Winner Announcement */}
      <AnimatePresence>
        {showWinner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 10, stiffness: 150 }}
              className="text-center px-6"
            >
              {/* Sparkle ring */}
              {Array.from({ length: 16 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1.5, 0],
                    opacity: [0, 1, 0],
                    x: Math.cos((i / 16) * Math.PI * 2) * 120,
                    y: Math.sin((i / 16) * Math.PI * 2) * 120,
                  }}
                  transition={{ duration: 2, delay: 0.2 + i * 0.08, repeat: 1 }}
                  className="absolute left-1/2 top-1/2 w-3 h-3 bg-yellow-400 rounded-full"
                />
              ))}

              <motion.div
                animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_30px_rgba(250,204,21,0.6)]" />
              </motion.div>

              <motion.h2
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-black text-white mb-2"
              >
                {winnerSide === "draw" ? "IT'S A DRAW!" : "WINNER!"}
              </motion.h2>

              {winnerSide !== "draw" && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-3 justify-center"
                >
                  <Avatar className="w-14 h-14 border-3 border-yellow-400 shadow-lg shadow-yellow-400/30">
                    <AvatarImage src={winnerSide === "a" ? battle.creator_a?.avatar : battle.creator_b?.avatar} />
                    <AvatarFallback className="bg-yellow-500/20 text-yellow-400 text-lg font-bold">
                      {winnerSide === "a" ? "A" : "B"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-lg font-bold text-white">
                      {winnerSide === "a" ? battle.creator_a?.name : battle.creator_b?.name}
                    </p>
                    <p className="text-sm text-yellow-400 font-semibold flex items-center gap-1">
                      <Crown className="w-4 h-4" />
                      Score: {winnerSide === "a" ? battle.score_a : battle.score_b}
                    </p>
                  </div>
                </motion.div>
              )}

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-white/40 text-xs mt-4"
              >
                Final Score: {battle.score_a} — {battle.score_b}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
