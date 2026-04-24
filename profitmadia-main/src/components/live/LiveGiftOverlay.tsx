import { motion, AnimatePresence } from "framer-motion";
import { useLiveRealtimeGifts, LiveGift } from "@/hooks/useLiveStream";

interface LiveGiftOverlayProps {
  streamId: string;
}

export const LiveGiftOverlay = ({ streamId }: LiveGiftOverlayProps) => {
  const { latestGift } = useLiveRealtimeGifts(streamId);

  return (
    <AnimatePresence>
      {latestGift && (
        <motion.div
          key={latestGift.id}
          initial={{ x: -100, opacity: 0, scale: 0.5 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 200, opacity: 0, scale: 0.5 }}
          transition={{ type: "spring", damping: 15 }}
          className="absolute left-4 top-1/3 z-30 flex items-center gap-3 bg-black/60 backdrop-blur-md rounded-full px-4 py-2 border border-primary/30"
        >
          {latestGift.gift_image ? (
            <img src={latestGift.gift_image} className="w-10 h-10 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-lg">
              🎁
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-foreground">{latestGift.sender_name}</p>
            <p className="text-xs text-primary">sent {latestGift.gift_type} × {latestGift.gift_value}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
