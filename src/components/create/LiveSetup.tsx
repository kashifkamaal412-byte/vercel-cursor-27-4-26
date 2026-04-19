import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LiveCreator } from "./LiveCreator";
import { InviteModal } from "./InviteModal";
import { Video, UserPlus, X } from "lucide-react";

interface LiveSetupProps {
  onExit: () => void;
  onEnterViewerMode: () => void;
}

export const LiveSetup = ({ onExit, onEnterViewerMode }: LiveSetupProps) => {
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [participants, setParticipants] = useState<string[]>(["Ayesha Khan (Host)"]);
  const [messages, setMessages] = useState<Array<{ user: string; text: string; isGift?: boolean }>>([]);

  const handleStartLive = () => {
    setIsLiveActive(true);
  };

  const handleInvite = (user: string) => {
    setTimeout(() => {
      setParticipants((prev) => [...prev, user]);
      setMessages((prev) => [...prev, { user: "System", text: `${user} joined the live` }]);
    }, 2000);
  };

  if (isLiveActive) {
    return (
      <LiveCreator
        participants={participants}
        setParticipants={setParticipants}
        messages={messages}
        setMessages={setMessages}
        onInviteClick={() => setShowInvite(true)}
        onExit={onExit}
        onEnterViewerMode={onEnterViewerMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" onClick={onExit}>
          <X className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-semibold">Go Live</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h2 className="text-2xl font-bold mb-2">Ready to go live?</h2>
          <p className="text-muted-foreground">Start streaming or invite guests first</p>
        </motion.div>

        <div className="w-full max-w-sm space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartLive}
            className="w-full glass p-6 rounded-2xl flex items-center gap-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground"
          >
            <Video className="w-8 h-8" />
            <div className="text-left flex-1">
              <h3 className="font-semibold text-lg">Start Live</h3>
              <p className="text-sm opacity-90">Begin streaming now</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowInvite(true)}
            className="w-full glass p-6 rounded-2xl flex items-center gap-4 border border-primary/20"
          >
            <UserPlus className="w-8 h-8 text-primary" />
            <div className="text-left flex-1">
              <h3 className="font-semibold text-lg">Invite Guests</h3>
              <p className="text-sm text-muted-foreground">Invite people before going live</p>
            </div>
          </motion.button>
        </div>
      </div>

      <InviteModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        onInvite={handleInvite}
        existingParticipants={participants}
      />
    </div>
  );
};
