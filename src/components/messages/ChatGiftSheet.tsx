import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { freeGifts, premiumGifts, Gift } from "@/data/giftData";
import { cn } from "@/lib/utils";

interface ChatGiftSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSendGift: (gift: Gift, quantity: number) => void;
  recipientName?: string;
}

export const ChatGiftSheet = ({ isOpen, onClose, onSendGift, recipientName }: ChatGiftSheetProps) => {
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [quantity, setQuantity] = useState(1);

  const handleSend = () => {
    if (selectedGift) {
      onSendGift(selectedGift, quantity);
      setSelectedGift(null);
      setQuantity(1);
      onClose();
    }
  };

  // Use imported freeGifts and premiumGifts directly

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl rounded-t-3xl z-50 max-h-[70vh] overflow-hidden border-t border-glass-border"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Send Gift</h2>
                {recipientName && (
                  <p className="text-sm text-muted-foreground">to {recipientName}</p>
                )}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Gift grid */}
            <div className="px-5 pb-4 overflow-y-auto max-h-[40vh] hide-scrollbar space-y-4">
              {/* Free gifts */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Free</h3>
                <div className="grid grid-cols-4 gap-3">
                  {freeGifts.map((gift) => (
                    <motion.button
                      key={gift.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedGift(gift)}
                      className={cn(
                        "aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all",
                        selectedGift?.id === gift.id
                          ? "bg-primary/20 border-2 border-primary"
                          : "bg-muted/50 border border-glass-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-2xl">{gift.emoji}</span>
                      <span className="text-[10px] text-muted-foreground">Free</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Premium gifts */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Premium
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {premiumGifts.map((gift) => (
                    <motion.button
                      key={gift.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedGift(gift)}
                      className={cn(
                        "aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all relative overflow-hidden",
                        selectedGift?.id === gift.id
                          ? "bg-primary/20 border-2 border-primary"
                          : "bg-muted/50 border border-glass-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-2xl">{gift.emoji}</span>
                      <span className="text-[10px] text-primary font-medium">₹{gift.value}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom bar with quantity and send */}
            <div className="px-5 py-4 border-t border-glass-border bg-card/50">
              <div className="flex items-center justify-between gap-4">
                {/* Quantity selector */}
                <div className="flex items-center gap-3 bg-muted/50 rounded-full px-2 py-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-lg font-bold w-8 text-center">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setQuantity(Math.min(100, quantity + 1))}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Quick quantity buttons */}
                <div className="flex gap-2">
                  {[5, 10, 50].map(n => (
                    <button
                      key={n}
                      onClick={() => setQuantity(n)}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium transition-colors",
                        quantity === n ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                {/* Send button */}
                <Button
                  onClick={handleSend}
                  disabled={!selectedGift}
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-full px-6 glow-primary"
                >
                  Send
                  {selectedGift && (
                    <span className="ml-1 text-xs opacity-80">
                      ₹{selectedGift.value * quantity}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
