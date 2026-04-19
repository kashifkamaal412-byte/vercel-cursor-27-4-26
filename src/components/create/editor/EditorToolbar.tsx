import { motion } from "framer-motion";
import { Scissors, Ratio, Volume2 } from "lucide-react";

export type EditorTool = "trim" | "aspect" | "audio";

interface EditorToolbarProps {
  activeTool: EditorTool | null;
  onToolSelect: (tool: EditorTool | null) => void;
}

const tools: { id: EditorTool; icon: typeof Scissors; label: string }[] = [
  { id: "trim", icon: Scissors, label: "Trim" },
  { id: "aspect", icon: Ratio, label: "Aspect Ratio" },
  { id: "audio", icon: Volume2, label: "Audio" },
];

export const EditorToolbar = ({ activeTool, onToolSelect }: EditorToolbarProps) => {
  return (
    <div className="bg-card/30 backdrop-blur-sm border-t border-border p-3">
      <div className="flex justify-center gap-4">
        {tools.map((tool) => (
          <motion.button
            key={tool.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToolSelect(activeTool === tool.id ? null : tool.id)}
            className={`flex flex-col items-center gap-2 px-6 py-3 rounded-xl transition-all ${
              activeTool === tool.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <tool.icon className="w-6 h-6" />
            <span className="text-xs font-medium">{tool.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
