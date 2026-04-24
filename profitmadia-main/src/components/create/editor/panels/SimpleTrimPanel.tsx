import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface SimpleTrimPanelProps {
  duration: number;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  onReset: () => void;
}

export const SimpleTrimPanel = ({
  duration,
  trimStart,
  trimEnd,
  onTrimChange,
  onReset,
}: SimpleTrimPanelProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const trimDuration = ((trimEnd - trimStart) / 100) * duration;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Trim Video</h3>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Start Point */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Start</span>
          <span className="font-mono text-primary">{formatTime((trimStart / 100) * duration)}</span>
        </div>
        <Slider
          value={[trimStart]}
          onValueChange={([val]) => onTrimChange(Math.min(val, trimEnd - 5), trimEnd)}
          max={100}
          step={0.5}
        />
      </div>

      {/* End Point */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">End</span>
          <span className="font-mono text-primary">{formatTime((trimEnd / 100) * duration)}</span>
        </div>
        <Slider
          value={[trimEnd]}
          onValueChange={([val]) => onTrimChange(trimStart, Math.max(val, trimStart + 5))}
          max={100}
          step={0.5}
        />
      </div>

      {/* Duration Info */}
      <div className="bg-muted/30 rounded-lg p-3 flex justify-between">
        <span className="text-sm text-muted-foreground">Selected Duration</span>
        <span className="font-mono text-primary font-semibold">{formatTime(trimDuration)}</span>
      </div>
    </div>
  );
};
