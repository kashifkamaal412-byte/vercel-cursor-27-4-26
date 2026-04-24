import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell, Heart, MessageSquare, Gift, UserPlus, Video, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface NotificationSettingsProps {
  onBack: () => void;
}

const STORAGE_KEY = 'notification_preferences';

interface NotificationPrefs {
  likes: boolean;
  comments: boolean;
  gifts: boolean;
  new_followers: boolean;
  video_updates: boolean;
  promotions: boolean;
}

const defaultPrefs: NotificationPrefs = {
  likes: true,
  comments: true,
  gifts: true,
  new_followers: true,
  video_updates: true,
  promotions: false,
};

const NotificationSettings = ({ onBack }: NotificationSettingsProps) => {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPrefs({ ...defaultPrefs, ...JSON.parse(stored) });
      } catch { /* use defaults */ }
    }
  }, []);

  const handleToggle = (key: keyof NotificationPrefs, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast.success(`${key.replace('_', ' ')} notifications ${value ? 'enabled' : 'disabled'}`);
  };

  const options = [
    { key: 'likes' as const, icon: Heart, label: 'Likes', desc: 'When someone likes your video', color: 'text-red-500' },
    { key: 'comments' as const, icon: MessageSquare, label: 'Comments', desc: 'When someone comments on your video', color: 'text-blue-500' },
    { key: 'gifts' as const, icon: Gift, label: 'Gifts', desc: 'When someone sends you a gift', color: 'text-yellow-500' },
    { key: 'new_followers' as const, icon: UserPlus, label: 'New Followers', desc: 'When someone starts following you', color: 'text-green-500' },
    { key: 'video_updates' as const, icon: Video, label: 'Video Updates', desc: 'Processing status and milestones', color: 'text-purple-500' },
    { key: 'promotions' as const, icon: Megaphone, label: 'Promotions', desc: 'Tips, offers, and app updates', color: 'text-orange-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen pb-20"
    >
      <div className="p-4 flex items-center gap-3 border-b border-glass-border sticky top-0 bg-background/95 backdrop-blur-md z-10">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-bold text-foreground">Notifications</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose which notifications you'd like to receive
        </p>

        <div className="space-y-3">
          {options.map((opt, i) => (
            <motion.div
              key={opt.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-4 rounded-xl bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full bg-background/50 flex items-center justify-center ${opt.color}`}>
                  <opt.icon className="w-4 h-4" />
                </div>
                <div>
                  <Label className="text-sm font-medium">{opt.label}</Label>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </div>
              <Switch
                checked={prefs[opt.key]}
                onCheckedChange={(v) => handleToggle(opt.key, v)}
              />
            </motion.div>
          ))}
        </div>

        <Separator className="bg-glass-border" />

        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground">
            Note: These preferences control in-app notifications. Push notifications depend on your device settings.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default NotificationSettings;
