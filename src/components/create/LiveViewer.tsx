import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Gift, Users, Radio, X } from "lucide-react";

interface LiveViewerProps {
  onExit: () => void;
}

export const LiveViewer = ({ onExit }: LiveViewerProps) => {
  const [messages, setMessages] = useState([
    { user: "Ayesha", text: "Hello everyone ❤️" },
    { user: "Usman", text: "Great voice 😊" },
    { user: "Sana", text: "sent Rose ✨ x1", isGift: true },
    { user: "Rehan", text: "How are you Ayesha? 😍😘" },
    { user: "System", text: "Bilal joined the LIVE" },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { user: "You", text: input }]);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/80">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white" onClick={onExit}>
            <X className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold">Ayesha Khan</span>
              <span className="text-xs text-muted-foreground">86.4K</span>
            </div>
            <Button variant="outline" size="sm" className="h-6 text-xs border-primary text-primary">
              + Follow
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-red-600 px-2 py-1 rounded-full text-xs">
            <Radio className="w-3 h-3" />
            LIVE
          </div>
          <span className="text-sm">12.5K</span>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="w-1/3 bg-black/40 p-4 border-r border-white/10">
          <h3 className="font-semibold mb-3">Participants</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Host</span>
            </div>
            {["Ali Raza", "Sara", "Hamza", "Zoya"].map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span>{name}</span>
              </div>
            ))}
          </div>
          <Button className="w-full mt-4" variant="outline">
            Request
          </Button>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className={`text-sm ${msg.isGift ? "text-yellow-400" : ""}`}>
                <span className="font-semibold">{msg.user}:</span> {msg.text}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white/10 border-white/20 text-white"
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <Button variant="ghost" size="icon">
                <Heart className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Gift className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
