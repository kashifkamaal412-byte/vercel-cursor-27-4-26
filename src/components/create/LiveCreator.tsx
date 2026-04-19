import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Gift, Users, Share2, Camera, CameraOff, Mic, MicOff, X, Video, Radio, Star } from "lucide-react";

interface LiveCreatorProps {
  participants: string[];
  setParticipants: (updater: (prev: string[]) => string[]) => void;
  messages: Array<{ user: string; text: string; isGift?: boolean }>;
  setMessages: (updater: (prev: any[]) => any[]) => void;
  onInviteClick: () => void;
  onExit: () => void;
  onEnterViewerMode: () => void;
}

export const LiveCreator = ({
  participants,
  setParticipants,
  messages,
  setMessages,
  onInviteClick,
  onExit,
  onEnterViewerMode,
}: LiveCreatorProps) => {
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [likes, setLikes] = useState(2300);
  const [viewers, setViewers] = useState(12450);
  const [messageInput, setMessageInput] = useState("");
  const [timer, setTimer] = useState(15);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    setMessages((prev) => [...prev, { user: "You", text: messageInput }]);
    setMessageInput("");
  };

  const handleSendGift = (gift: string) => {
    setMessages((prev) => [...prev, { user: "You", text: `sent ${gift}`, isGift: true }]);
  };

  const handleLike = () => {
    setLikes((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onExit}>
            <X className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-1">
            <span className="font-semibold">Ayesha Khan</span>
            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
            <span className="text-sm">{likes.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-red-600 px-2 py-1 rounded-full text-xs font-semibold">
            <Radio className="w-3 h-3" />
            LIVE
          </div>
          <span className="text-sm">{formatTime(timer)}</span>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">{viewers.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
            <Gift className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onInviteClick}>
            <Users className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
            <Star className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
            <Share2 className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onEnterViewerMode}>
            <Users className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-gray-900 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          {cameraOn ? (
            <video autoPlay muted className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <CameraOff className="w-16 h-16 mx-auto text-gray-500" />
              <p className="text-gray-400 mt-2">Camera is off</p>
            </div>
          )}
        </div>

        <div className="absolute bottom-24 left-4 flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="bg-black/50 border-white/20 text-white hover:bg-black/70"
            onClick={() => setCameraOn(!cameraOn)}
          >
            {cameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="bg-black/50 border-white/20 text-white hover:bg-black/70"
            onClick={() => setMicOn(!micOn)}
          >
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
        </div>

        <div className="absolute top-20 right-4 bg-black/50 rounded-lg p-2 max-w-[150px]">
          <p className="text-xs font-semibold mb-1">Participants ({participants.length})</p>
          <div className="space-y-1">
            {participants.slice(0, 3).map((p, i) => (
              <div key={i} className="text-xs truncate">
                {p}
              </div>
            ))}
            {participants.length > 3 && <div className="text-xs">+{participants.length - 3} more</div>}
          </div>
        </div>
      </div>

      <div className="bg-black/80 p-4 border-t border-white/10">
        <div className="max-h-32 overflow-y-auto mb-3 space-y-1">
          {messages.map((msg, idx) => (
            <div key={idx} className={`text-sm ${msg.isGift ? "text-yellow-400" : "text-white"}`}>
              <span className="font-semibold">{msg.user}:</span> {msg.text}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Write a message..."
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <Button variant="ghost" size="icon" className="text-white" onClick={handleLike}>
            <Heart className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white">
            <Gift className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex gap-2 mt-2">
          {[99, 499, 999, 1999].map((amount) => (
            <Button
              key={amount}
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 text-white text-xs"
              onClick={() => handleSendGift(`✨ x${amount}`)}
            >
              {amount}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
