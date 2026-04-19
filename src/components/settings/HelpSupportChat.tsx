import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, HelpCircle, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HelpSupportChatProps {
  onBack: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const HelpSupportChat = ({ onBack }: HelpSupportChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! 👋 I'm your AI support assistant. How can I help you today? You can ask me about features, settings, privacy, uploading videos, or anything else about the app.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const { data, error } = await supabase.functions.invoke("support-chat", {
        body: {
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      const reply = data?.reply || "Sorry, I couldn't process that. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error("Support chat error:", e);
      toast.error("Failed to get a response. Please try again.");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having trouble connecting right now. Please try again in a moment." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen pb-20 flex flex-col"
    >
      <div className="p-4 flex items-center gap-3 border-b border-glass-border sticky top-0 bg-background/95 backdrop-blur-md z-10">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-lg font-bold text-foreground">Help & Support</h1>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted/50 text-foreground rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-secondary" />
              </div>
            )}
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-2 items-center">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted/50 p-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 p-4 border-t border-glass-border bg-background/95 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2 items-end"
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question... (Shift+Enter for new line)"
            className="flex-1 bg-muted/30 resize-none min-h-[40px] max-h-[150px]"
            disabled={isLoading}
            rows={1}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="h-10 w-10">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </motion.div>
  );
};

export default HelpSupportChat;
