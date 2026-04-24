import { motion } from "framer-motion";
import { ArrowLeft, Palette, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ThemeOption, useAppTheme } from "@/contexts/ThemeContext";

interface AppearanceSettingsProps {
  onBack: () => void;
}

const accentColors = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Green", value: "#22c55e" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
];

const AppearanceSettings = ({ onBack }: AppearanceSettingsProps) => {
  const { theme, accent, setTheme, setAccent } = useAppTheme();

  const changeTheme = (mode: ThemeOption) => {
    if (theme === mode) return;
    setTheme(mode);
    toast.success(`Theme switched to ${mode}`);
  };

  const changeAccent = (color: string) => {
    if (accent === color) return;
    setAccent(color);
    toast.success("Accent color updated");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen pb-20"
    >
      {/* HEADER */}
      <div className="p-4 flex items-center gap-3 border-b border-glass-border sticky top-0 bg-background/95 backdrop-blur-md z-10">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Appearance</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        {/* THEME SECTION */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">Choose Theme</p>
          <div className="grid gap-3">
            {[
              { value: "light", icon: Sun, label: "Light" },
              { value: "dark", icon: Moon, label: "Dark" },
              { value: "system", icon: Monitor, label: "System" },
            ].map((opt, i) => (
              <motion.button
                key={opt.value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => changeTheme(opt.value as ThemeOption)}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-300 ${
                  theme === opt.value
                    ? "border-primary bg-primary/10"
                    : "border-glass-border bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <opt.icon className="w-5 h-5" />
                <span className="font-medium">{opt.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* ACCENT SECTION */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">Accent Color</p>
          <div className="grid grid-cols-3 gap-4">
            {accentColors.map((color, i) => (
              <motion.button
                key={color.value}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => changeAccent(color.value)}
                className={`h-14 rounded-xl transition-all duration-300 ${
                  accent === color.value ? "ring-4 ring-ring ring-offset-2 ring-offset-background" : ""
                }`}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AppearanceSettings;
