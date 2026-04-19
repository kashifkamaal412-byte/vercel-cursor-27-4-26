import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

interface LikeBurstAnimationProps {
  show: boolean;
  onComplete: () => void;
}

// Colorful heart colors for the burst effect
const heartColors = [
  "#FF6B6B", // Coral red
  "#FF85A2", // Pink
  "#FFD93D", // Yellow
  "#6BCB77", // Green
  "#4D96FF", // Blue
  "#A66CFF", // Purple
  "#FF9F45", // Orange
  "#F72585", // Magenta
];

export const LikeBurstAnimation = ({ show, onComplete }: LikeBurstAnimationProps) => {
  // Generate random hearts with different positions and delays
  const hearts = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    color: heartColors[i % heartColors.length],
    x: (Math.random() - 0.5) * 200, // Random X spread
    y: -(Math.random() * 150 + 50), // Float upward
    scale: Math.random() * 0.5 + 0.5, // Random size
    delay: Math.random() * 0.2, // Staggered start
    rotation: (Math.random() - 0.5) * 60, // Random rotation
  }));

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-50">
          {hearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ 
                opacity: 0, 
                scale: 0, 
                x: 0, 
                y: 0,
                rotate: 0 
              }}
              animate={{ 
                opacity: [0, 1, 1, 0], 
                scale: [0, heart.scale * 1.5, heart.scale, 0],
                x: heart.x,
                y: heart.y,
                rotate: heart.rotation
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 1.2,
                delay: heart.delay,
                ease: "easeOut"
              }}
              className="absolute"
            >
              <Heart 
                className="drop-shadow-lg"
                style={{ 
                  color: heart.color,
                  fill: heart.color,
                  width: 24 + heart.scale * 20,
                  height: 24 + heart.scale * 20,
                }}
              />
            </motion.div>
          ))}
          
          {/* Central big heart pulse */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 0], 
              scale: [0, 1.5, 2]
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute"
          >
            <Heart 
              className="w-20 h-20 text-red-500 fill-red-500 drop-shadow-2xl"
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
