import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Pin, Smile } from "lucide-react";
import { LiveChatMessage, useLiveRealtimeChat } from "@/hooks/useLiveStream";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LiveChatProps {
  streamId: string;
  onSendMessage: (content: string) => void;
  isCreator?: boolean;
}

const EMOJI_QUICK = ["❤️", "🔥", "😂", "😍", "👏", "🎉", "💯", "🙏"];

export const LiveChat = ({ streamId, onSendMessage, isCreator }: LiveChatProps) => {
  const messages = useLiveRealtimeChat(streamId);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const pinnedMessage = messages.find(m => m.is_pinned);

  return (
    <div className="flex flex-col h-full">
      {pinnedMessage && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border-b border-primary/20">
          <Pin className="w-3 h-3 text-primary" />
          <span className="text-xs text-primary font-medium truncate">{pinnedMessage.content}</span>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-2 animate-in slide-in-from-left-2 duration-300 ${msg.message_type === "reaction" ? "justify-center" : ""}`}>
            {msg.message_type === "reaction" ? (
              <span className="text-2xl">{msg.content}</span>
            ) : msg.message_type === "system" ? (
              <p className="text-xs text-muted-foreground text-center w-full">{msg.content}</p>
            ) : (
              <>
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarImage src={msg.user_avatar || ""} />
                  <AvatarFallback className="text-[10px] bg-muted">{(msg.user_name || "U")[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-primary mr-1.5">{msg.user_name}</span>
                  <span className="text-xs text-foreground/90">{msg.content}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {showEmoji && (
        <div className="flex gap-1 px-3 py-2 bg-card/80 border-t border-border/30">
          {EMOJI_QUICK.map(e => (
            <button key={e} onClick={() => { onSendMessage(e); setShowEmoji(false); }} className="text-xl hover:scale-125 transition-transform">{e}</button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2 bg-black/40">
        <Button variant="ghost" size="icon" className="w-8 h-8 text-foreground/60" onClick={() => setShowEmoji(!showEmoji)}>
          <Smile className="w-4 h-4" />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something..."
          className="flex-1 h-8 text-xs bg-white/10 border-white/10 text-foreground placeholder:text-foreground/40"
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button variant="ghost" size="icon" className="w-8 h-8 text-primary" onClick={handleSend}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
