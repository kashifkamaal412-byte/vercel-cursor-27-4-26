import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Plus, X, Check, Vote, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface LivePoll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  createdAt: number;
  duration: number; // seconds
  isActive: boolean;
}

interface LivePollSystemProps {
  streamId: string;
  isCreator?: boolean;
  onSendMessage?: (content: string) => void;
}

export const LivePollSystem = ({ streamId, isCreator, onSendMessage }: LivePollSystemProps) => {
  const [activePoll, setActivePoll] = useState<LivePoll | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [votedOption, setVotedOption] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Timer countdown
  useEffect(() => {
    if (!activePoll?.isActive) return;
    const remaining = Math.max(0, activePoll.duration - Math.floor((Date.now() - activePoll.createdAt) / 1000));
    setTimeLeft(remaining);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setActivePoll(p => p ? { ...p, isActive: false } : null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activePoll]);

  const handleCreatePoll = () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) return;

    const poll: LivePoll = {
      id: Date.now().toString(),
      question: question.trim(),
      options: options.filter(o => o.trim()).map((text, i) => ({
        id: `opt_${i}`,
        text: text.trim(),
        votes: 0,
      })),
      totalVotes: 0,
      createdAt: Date.now(),
      duration: 60,
      isActive: true,
    };

    setActivePoll(poll);
    setShowCreate(false);
    setQuestion("");
    setOptions(["", ""]);
    setVotedOption(null);

    // Broadcast via chat
    onSendMessage?.(`📊 Poll: ${poll.question}`);
  };

  const handleVote = (optionId: string) => {
    if (votedOption || !activePoll?.isActive) return;
    setVotedOption(optionId);
    setActivePoll(prev => {
      if (!prev) return null;
      return {
        ...prev,
        totalVotes: prev.totalVotes + 1,
        options: prev.options.map(o =>
          o.id === optionId ? { ...o, votes: o.votes + 1 } : o
        ),
      };
    });
  };

  return (
    <>
      {/* Creator: Create Poll Button */}
      {isCreator && !activePoll && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCreate(true)}
          className="w-10 h-10 bg-purple-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-purple-500/30"
        >
          <BarChart3 className="w-4.5 h-4.5 text-purple-400" />
        </motion.button>
      )}

      {/* Create Poll Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-neutral-900 rounded-t-3xl p-5 border-t border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Vote className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-white text-lg">Create Poll</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}>
                  <X className="w-5 h-5 text-white/60" />
                </Button>
              </div>

              <Input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="mb-3 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />

              {options.map((opt, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input
                    value={opt}
                    onChange={e => {
                      const newOpts = [...options];
                      newOpts[i] = e.target.value;
                      setOptions(newOpts);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                  {i >= 2 && (
                    <Button variant="ghost" size="icon" onClick={() => setOptions(options.filter((_, j) => j !== i))}>
                      <X className="w-4 h-4 text-white/40" />
                    </Button>
                  )}
                </div>
              ))}

              {options.length < 4 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-400 mb-4"
                  onClick={() => setOptions([...options, ""])}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Option
                </Button>
              )}

              <Button
                onClick={handleCreatePoll}
                disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl h-11 font-bold"
              >
                Start Poll (60s)
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Poll Display */}
      <AnimatePresence>
        {activePoll && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="absolute left-3 z-40 w-[75%]"
            style={{ bottom: "35%" }}
          >
            <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-3.5 border border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] text-purple-400 font-bold uppercase">Poll</span>
                </div>
                {activePoll.isActive && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    timeLeft < 10 ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/60"
                  }`}>
                    {timeLeft}s
                  </span>
                )}
                {!activePoll.isActive && (
                  <span className="text-[10px] font-bold text-white/40 px-2 py-0.5 rounded-full bg-white/5">Ended</span>
                )}
              </div>

              <p className="text-xs font-bold text-white mb-2.5">{activePoll.question}</p>

              <div className="space-y-1.5">
                {activePoll.options.map(opt => {
                  const percent = activePoll.totalVotes > 0 ? Math.round((opt.votes / activePoll.totalVotes) * 100) : 0;
                  const isVoted = votedOption === opt.id;
                  const isWinner = !activePoll.isActive && opt.votes === Math.max(...activePoll.options.map(o => o.votes));

                  return (
                    <motion.button
                      key={opt.id}
                      whileTap={activePoll.isActive && !votedOption ? { scale: 0.97 } : {}}
                      onClick={() => handleVote(opt.id)}
                      disabled={!!votedOption || !activePoll.isActive}
                      className={`w-full relative overflow-hidden rounded-xl p-2 text-left transition-all ${
                        isVoted
                          ? "border border-purple-500/50 bg-purple-500/10"
                          : isWinner
                          ? "border border-yellow-500/40 bg-yellow-500/5"
                          : "border border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {/* Progress fill */}
                      {(votedOption || !activePoll.isActive) && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={`absolute inset-0 rounded-xl ${
                            isWinner ? "bg-yellow-500/15" : "bg-white/5"
                          }`}
                        />
                      )}

                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isVoted && <Check className="w-3 h-3 text-purple-400" />}
                          {isWinner && <Crown className="w-3 h-3 text-yellow-400" />}
                          <span className="text-[11px] font-semibold text-white">{opt.text}</span>
                        </div>
                        {(votedOption || !activePoll.isActive) && (
                          <span className="text-[10px] font-bold text-white/60">{percent}%</span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <p className="text-[9px] text-white/30 mt-2 text-center">
                {activePoll.totalVotes} vote{activePoll.totalVotes !== 1 ? "s" : ""}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
