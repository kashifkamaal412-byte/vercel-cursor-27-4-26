import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Gift } from "@/data/giftData";

interface GiftAnimationState {
  gift: Gift | null;
  senderName: string;
  quantity: number;
}

interface GiftAnimationContextType {
  activeGift: GiftAnimationState | null;
  triggerGiftAnimation: (gift: Gift, senderName: string, quantity?: number) => void;
  clearGiftAnimation: () => void;
}

const GiftAnimationContext = createContext<GiftAnimationContextType | null>(null);

export const useGiftAnimation = () => {
  const ctx = useContext(GiftAnimationContext);
  if (!ctx) throw new Error("useGiftAnimation must be used within GiftAnimationProvider");
  return ctx;
};

export const GiftAnimationProvider = ({ children }: { children: ReactNode }) => {
  const [activeGift, setActiveGift] = useState<GiftAnimationState | null>(null);

  const triggerGiftAnimation = useCallback((gift: Gift, senderName: string, quantity = 1) => {
    setActiveGift({ gift, senderName, quantity });
  }, []);

  const clearGiftAnimation = useCallback(() => {
    setActiveGift(null);
  }, []);

  return (
    <GiftAnimationContext.Provider value={{ activeGift, triggerGiftAnimation, clearGiftAnimation }}>
      {children}
    </GiftAnimationContext.Provider>
  );
};
