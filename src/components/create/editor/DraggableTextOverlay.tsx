import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue } from "framer-motion";
import { X, RotateCw, Maximize2 } from "lucide-react";

interface DraggableTextOverlayProps {
  id: string;
  text: string;
  initialPosition?: { x: number; y: number };
  initialRotation?: number;
  initialScale?: number;
  containerRef: React.RefObject<HTMLDivElement>;
  onRemove: (id: string) => void;
  onUpdate: (id: string, position: { x: number; y: number }, rotation: number, scale: number) => void;
  isEditing?: boolean;
}

export const DraggableTextOverlay = ({
  id,
  text,
  initialPosition = { x: 0, y: 0 },
  initialRotation = 0,
  initialScale = 1,
  containerRef,
  onRemove,
  onUpdate,
  isEditing = true,
}: DraggableTextOverlayProps) => {
  // Use motion values for smooth, continuous dragging without state freezing
  const x = useMotionValue(initialPosition.x);
  const y = useMotionValue(initialPosition.y);
  
  const [rotation, setRotation] = useState(initialRotation);
  const [scale, setScale] = useState(initialScale);
  const [isSelected, setIsSelected] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  
  const elementRef = useRef<HTMLDivElement>(null);
  const rotateStartAngle = useRef(0);
  const scaleStartDistance = useRef(0);
  const initialTouchDistance = useRef(0);
  const initialTouchScale = useRef(1);
  const lastUpdateRef = useRef({ x: initialPosition.x, y: initialPosition.y, rotation: initialRotation, scale: initialScale });

  // Sync position changes back to parent (debounced to prevent excessive updates)
  useEffect(() => {
    const unsubscribeX = x.on("change", (latestX) => {
      const latestY = y.get();
      if (Math.abs(latestX - lastUpdateRef.current.x) > 1 || Math.abs(latestY - lastUpdateRef.current.y) > 1) {
        lastUpdateRef.current = { ...lastUpdateRef.current, x: latestX, y: latestY };
        onUpdate(id, { x: latestX, y: latestY }, rotation, scale);
      }
    });
    
    return unsubscribeX;
  }, [id, x, y, rotation, scale, onUpdate]);

  // Sync rotation/scale changes
  useEffect(() => {
    if (lastUpdateRef.current.rotation !== rotation || lastUpdateRef.current.scale !== scale) {
      lastUpdateRef.current = { ...lastUpdateRef.current, rotation, scale };
      onUpdate(id, { x: x.get(), y: y.get() }, rotation, scale);
    }
  }, [id, x, y, rotation, scale, onUpdate]);

  // Handle rotation via pointer on rotate handle
  const handleRotateStart = useCallback((e: React.PointerEvent) => {
    if (!isEditing) return;
    e.stopPropagation();
    e.preventDefault();
    setIsInteracting(true);
    
    const element = elementRef.current;
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    rotateStartAngle.current = Math.atan2(
      e.clientY - centerY,
      e.clientX - centerX
    ) * (180 / Math.PI) - rotation;

    const handleRotateMove = (moveEvent: PointerEvent) => {
      const angle = Math.atan2(
        moveEvent.clientY - centerY,
        moveEvent.clientX - centerX
      ) * (180 / Math.PI);
      setRotation(angle - rotateStartAngle.current);
    };

    const handleRotateEnd = () => {
      setIsInteracting(false);
      document.removeEventListener("pointermove", handleRotateMove);
      document.removeEventListener("pointerup", handleRotateEnd);
      document.removeEventListener("pointercancel", handleRotateEnd);
    };

    document.addEventListener("pointermove", handleRotateMove);
    document.addEventListener("pointerup", handleRotateEnd);
    document.addEventListener("pointercancel", handleRotateEnd);
  }, [isEditing, rotation]);

  // Handle scale via pointer on scale handle
  const handleScaleStart = useCallback((e: React.PointerEvent) => {
    if (!isEditing) return;
    e.stopPropagation();
    e.preventDefault();
    setIsInteracting(true);

    const element = elementRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    scaleStartDistance.current = Math.hypot(
      e.clientX - centerX,
      e.clientY - centerY
    ) / scale;

    const handleScaleMove = (moveEvent: PointerEvent) => {
      const distance = Math.hypot(
        moveEvent.clientX - centerX,
        moveEvent.clientY - centerY
      );
      const newScale = Math.max(0.5, Math.min(3, distance / scaleStartDistance.current));
      setScale(newScale);
    };

    const handleScaleEnd = () => {
      setIsInteracting(false);
      document.removeEventListener("pointermove", handleScaleMove);
      document.removeEventListener("pointerup", handleScaleEnd);
      document.removeEventListener("pointercancel", handleScaleEnd);
    };

    document.addEventListener("pointermove", handleScaleMove);
    document.addEventListener("pointerup", handleScaleEnd);
    document.addEventListener("pointercancel", handleScaleEnd);
  }, [isEditing, scale]);

  // Handle pinch-to-zoom (multi-touch)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isEditing) return;
    
    if (e.touches.length >= 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      initialTouchDistance.current = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      initialTouchScale.current = scale;
      setIsInteracting(true);
    }
  }, [isEditing, scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isEditing) return;
    
    if (e.touches.length >= 2 && initialTouchDistance.current > 0) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const scaleFactor = currentDistance / initialTouchDistance.current;
      const newScale = Math.max(0.5, Math.min(3, initialTouchScale.current * scaleFactor));
      setScale(newScale);
    }
  }, [isEditing]);

  const handleTouchEnd = useCallback(() => {
    initialTouchDistance.current = 0;
    setIsInteracting(false);
  }, []);

  // Deselect when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (elementRef.current && !elementRef.current.contains(e.target as Node)) {
        setIsSelected(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Handle drag start - always select and mark as interacting
  const handleDragStart = useCallback(() => {
    setIsInteracting(true);
    setIsSelected(true);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsInteracting(false);
  }, []);

  return (
    <motion.div
      ref={elementRef}
      drag={isEditing}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={containerRef}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        e.stopPropagation();
        if (isEditing) setIsSelected(true);
      }}
      onPointerDown={(e) => {
        // Prevent parent from capturing pointer events during drag
        if (isEditing) {
          e.stopPropagation();
        }
      }}
      style={{
        x,
        y,
        rotate: rotation,
        scale: scale,
        touchAction: "none", // Critical: Prevents browser gestures from interfering
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      className={`absolute cursor-move select-none will-change-transform ${
        isSelected && isEditing ? "z-50" : "z-40"
      } ${isInteracting ? "pointer-events-auto" : ""}`}
      whileDrag={{ cursor: "grabbing" }}
    >
      {/* Text Content */}
      <div
        className={`relative px-4 py-2 rounded-lg transition-shadow ${
          isSelected && isEditing
            ? "ring-2 ring-primary ring-offset-2 ring-offset-transparent shadow-lg"
            : ""
        }`}
        style={{
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(8px)",
        }}
      >
        <span className="text-white text-lg font-medium whitespace-nowrap pointer-events-none">
          {text}
        </span>

        {/* Control Handles - Only show when selected and editing */}
        {isSelected && isEditing && (
          <>
            {/* Delete Button */}
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRemove(id);
              }}
              className="absolute -top-3 -right-3 w-7 h-7 bg-destructive rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform touch-none"
              style={{ touchAction: "none" }}
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Rotate Handle */}
            <div
              onPointerDown={handleRotateStart}
              className="absolute -bottom-4 -left-4 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 active:scale-95 transition-transform touch-none"
              style={{ touchAction: "none" }}
            >
              <RotateCw className="w-4 h-4 text-primary-foreground" />
            </div>

            {/* Scale Handle */}
            <div
              onPointerDown={handleScaleStart}
              className="absolute -bottom-4 -right-4 w-8 h-8 bg-secondary rounded-full flex items-center justify-center shadow-lg cursor-nwse-resize hover:scale-110 active:scale-95 transition-transform touch-none"
              style={{ touchAction: "none" }}
            >
              <Maximize2 className="w-4 h-4 text-secondary-foreground" />
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
