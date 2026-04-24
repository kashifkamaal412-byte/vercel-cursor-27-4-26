import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Music2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SimpleAudioPanelProps {
  videoVolume: number;
  onVideoVolumeChange: (volume: number) => void;
  musicVolume: number;
  onMusicVolumeChange: (volume: number) => void;
  hasMusic: boolean;
  onAddMusic: () => void;
}

export const SimpleAudioPanel = ({
  videoVolume,
  onVideoVolumeChange,
  musicVolume,
  onMusicVolumeChange,
  hasMusic,
  onAddMusic,
}: SimpleAudioPanelProps) => {
  const [isMuted, setIsMuted] = useState(false);

  const handleMuteToggle = () => {
    if (isMuted) {
      onVideoVolumeChange(100);
    } else {
      onVideoVolumeChange(0);
    }
    setIsMuted(!isMuted);
  };

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Audio</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleMuteToggle}>
          {isMuted || videoVolume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Original Audio */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Original Audio</span>
          </div>
          <span className="text-xs font-mono text-primary">{Math.round(videoVolume)}%</span>
        </div>
        <Slider
          value={[videoVolume]}
          onValueChange={([val]) => onVideoVolumeChange(val)}
          max={100}
          step={1}
        />
      </div>

      {/* Background Music */}
      <div className="space-y-2 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Background Music</span>
          </div>
          <span className={`text-xs font-mono ${hasMusic ? "text-primary" : "text-muted-foreground"}`}>
            {hasMusic ? `${Math.round(musicVolume)}%` : "None"}
          </span>
        </div>
        <Slider
          value={[musicVolume]}
          onValueChange={([val]) => onMusicVolumeChange(val)}
          max={100}
          step={1}
          disabled={!hasMusic}
          className={hasMusic ? "" : "opacity-50"}
        />
        {!hasMusic && (
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={onAddMusic}>
            <Plus className="w-4 h-4 mr-1" />
            Add Music
          </Button>
        )}
      </div>
    </div>
  );
};
