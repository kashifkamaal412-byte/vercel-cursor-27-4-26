import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, Square } from "lucide-react";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5" | "original";

interface AspectRatioPanelProps {
  selectedRatio: AspectRatio;
  onRatioSelect: (ratio: AspectRatio) => void;
}

const ratios: { id: AspectRatio; label: string; icon: typeof Monitor; description: string }[] = [
  { id: "original", label: "Original", icon: Monitor, description: "Keep original" },
  { id: "16:9", label: "16:9", icon: Monitor, description: "Landscape / YouTube" },
  { id: "9:16", label: "9:16", icon: Smartphone, description: "Portrait / TikTok" },
  { id: "1:1", label: "1:1", icon: Square, description: "Square / Instagram" },
  { id: "4:5", label: "4:5", icon: Smartphone, description: "Portrait / Instagram" },
];

export const AspectRatioPanel = ({ selectedRatio, onRatioSelect }: AspectRatioPanelProps) => {
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Aspect Ratio</h3>
      
      <div className="grid grid-cols-3 gap-3">
        {ratios.map((ratio) => (
          <Button
            key={ratio.id}
            variant={selectedRatio === ratio.id ? "default" : "outline"}
            className={`flex flex-col items-center gap-2 h-auto py-4 ${
              selectedRatio === ratio.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => onRatioSelect(ratio.id)}
          >
            <ratio.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{ratio.label}</span>
            <span className="text-[10px] text-muted-foreground">{ratio.description}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
