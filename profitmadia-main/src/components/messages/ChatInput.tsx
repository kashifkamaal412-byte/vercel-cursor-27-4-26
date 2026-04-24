import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Smile, Image, Mic, Gift, X, Square, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Message } from "@/hooks/useMessages";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

interface ChatInputProps {
  onSend: (content: string, type?: string, mediaUrl?: string) => void;
  onGiftClick: () => void;
  onImageUpload?: (file: File) => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

export const ChatInput = ({
  onSend,
  onGiftClick,
  onImageUpload,
  replyingTo,
  onCancelReply,
  disabled,
  onTyping,
  onStopTyping
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Voice recorder hook
  const {
    isRecording,
    duration,
    audioBlob,
    audioUrl,
    waveformData,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
    clearAudio,
  } = useVoiceRecorder();

  // Handle audio playback
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
    }
  }, [audioUrl]);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim(), "text");
      setMessage("");
      onStopTyping?.();
    }
  };

  const handleSendVoice = async () => {
    if (audioBlob && audioUrl) {
      // In production, upload to storage and get URL
      // For now, send as voice message indicator
      onSend("🎤 Voice message", "voice", audioUrl);
      clearAudio();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      onTyping?.();
    } else {
      onStopTyping?.();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicPress = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      const started = await startRecording();
      if (!started) {
        // Permission denied or error
      }
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-safe-area-inset-bottom">
      {/* Reply preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mx-4 mb-2 px-4 py-2 bg-muted/50 backdrop-blur-sm rounded-xl border border-glass-border/50 flex items-center justify-between"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary font-medium">Replying to message</p>
              <p className="text-sm text-muted-foreground truncate">{replyingTo.content}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onCancelReply}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden audio element for playback */}
      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlaying(false)}
        className="hidden" 
      />

      {/* Input area */}
      <div className="px-4 pb-4">
        {/* Recording UI */}
        {isRecording ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-xl rounded-2xl border border-glass-border"
          >
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={cancelRecording}
              className="text-destructive"
            >
              <X className="w-5 h-5" />
            </Button>
            
            <div className="flex-1 flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-3 h-3 rounded-full bg-destructive"
              />
              <span className="text-sm text-foreground font-medium">{formatDuration(duration)}</span>
              
              {/* Real waveform visualization */}
              <div className="flex-1 h-8 flex items-center gap-0.5 overflow-hidden">
                {waveformData.length > 0 
                  ? waveformData.map((value, i) => (
                      <motion.div 
                        key={i}
                        animate={{ height: Math.max(4, value * 28) }}
                        className="w-1 bg-primary rounded-full"
                        style={{ minHeight: 4 }}
                      />
                    ))
                  : Array.from({ length: 20 }).map((_, i) => (
                      <motion.div 
                        key={i}
                        animate={{ height: [8, Math.random() * 24 + 8, 8] }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                        className="w-1 bg-primary rounded-full"
                      />
                    ))
                }
              </div>
            </div>

            <Button
              onClick={stopRecording}
              className="bg-primary text-primary-foreground rounded-full w-10 h-10 p-0"
            >
              <Square className="w-4 h-4 fill-current" />
            </Button>
          </motion.div>
        ) : audioUrl ? (
          /* Recorded audio preview */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-xl rounded-2xl border border-glass-border"
          >
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={clearAudio}
              className="text-destructive"
            >
              <X className="w-5 h-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handlePlayPause}
              className="text-foreground"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            
            <div className="flex-1 flex items-center gap-3">
              <span className="text-sm text-foreground font-medium">{formatDuration(duration)}</span>
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary rounded-full"
                  style={{ width: isPlaying ? "100%" : "0%" }}
                  animate={{ width: isPlaying ? "100%" : "0%" }}
                  transition={{ duration: duration, ease: "linear" }}
                />
              </div>
            </div>

            <Button
              onClick={handleSendVoice}
              className="bg-primary text-primary-foreground rounded-full w-10 h-10 p-0 glow-primary"
            >
              <Send className="w-4 h-4" />
            </Button>
          </motion.div>
        ) : (
          /* Normal text input */
          <div className="flex items-end gap-2">
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground"
              >
                <Image className="w-5 h-5" />
              </Button>
            </div>

            {/* Input field */}
            <div className="flex-1 relative">
              <Input
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                onBlur={() => onStopTyping?.()}
                placeholder="Type a message..."
                disabled={disabled}
                className="pr-10 bg-card/80 backdrop-blur-xl border-glass-border rounded-2xl h-11 text-sm"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <Smile className="w-5 h-5" />
              </button>
            </div>

            {/* Gift button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onGiftClick}
              className="text-accent hover:text-accent/80 hover:bg-accent/10"
            >
              <Gift className="w-5 h-5" />
            </Button>

            {/* Send/Record button */}
            {message.trim() ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <Button
                  onClick={handleSend}
                  disabled={disabled}
                  className="bg-primary text-primary-foreground rounded-full w-10 h-10 p-0 glow-primary"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </motion.div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMicPress}
                className={cn(
                  "text-muted-foreground hover:text-foreground transition-colors",
                  "active:scale-95"
                )}
              >
                <Mic className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
