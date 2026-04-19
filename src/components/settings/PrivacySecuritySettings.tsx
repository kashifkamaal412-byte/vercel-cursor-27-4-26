import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Shield, 
  Eye, 
  EyeOff, 
  Lock, 
  Users, 
  Gift, 
  MessageSquare, 
  Activity,
  UserX,
  VolumeX,
  LogOut,
  ChevronRight,
  Globe,
  UserCheck,
  Ban,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePrivacySettings, ProfileVisibility, InteractionPermission } from '@/hooks/usePrivacySettings';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface PrivacySecuritySettingsProps {
  onBack: () => void;
}

const PrivacySecuritySettings = ({ onBack }: PrivacySecuritySettingsProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { privacySettings, isLoading, updateSettings, blockedUsers, mutedUsers, unblockUser, unmuteUser } = usePrivacySettings();
  const [showBlockedList, setShowBlockedList] = useState(false);
  const [showMutedList, setShowMutedList] = useState(false);

  const handleVisibilityChange = (value: ProfileVisibility) => {
    updateSettings.mutate({ profile_visibility: value });
  };

  const handleToggle = (key: string, value: boolean) => {
    updateSettings.mutate({ [key]: value });
  };

  const handlePermissionChange = (key: string, value: InteractionPermission) => {
    updateSettings.mutate({ [key]: value });
  };

  const handleSecureLogout = async () => {
    toast.success('Logging out securely...');
    await signOut();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const visibilityOptions = [
    { value: 'public', label: 'Public', icon: Globe, description: 'Anyone can see your profile' },
    { value: 'friends', label: 'Fans Only', icon: Heart, description: 'Only fans can see your full profile' },
    { value: 'private', label: 'Private', icon: Lock, description: 'Only you can see your profile' },
  ];

  const permissionOptions = [
    { value: 'everyone', label: 'Everyone' },
    { value: 'fans', label: 'Fans Only' },
    { value: 'nobody', label: 'Nobody' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen pb-20"
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-glass-border sticky top-0 bg-background/95 backdrop-blur-md z-10">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Privacy & Security</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        {/* Profile Visibility Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Eye className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Profile Visibility</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Control who can see your profile and content
          </p>
          
          <div className="grid gap-3">
            {visibilityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleVisibilityChange(option.value as ProfileVisibility)}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  privacySettings?.profile_visibility === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-glass-border bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <option.icon className={`w-5 h-5 ${
                  privacySettings?.profile_visibility === option.value ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                {privacySettings?.profile_visibility === option.value && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <UserCheck className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        <Separator className="bg-glass-border" />

        {/* Profile Lock Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-accent" />
              <div>
                <h2 className="text-base font-semibold text-foreground">Profile Lock</h2>
                <p className="text-xs text-muted-foreground">Require fans to follow to see content</p>
              </div>
            </div>
            <Switch
              checked={privacySettings?.profile_locked || false}
              onCheckedChange={(checked) => handleToggle('profile_locked', checked)}
            />
          </div>
        </section>

        <Separator className="bg-glass-border" />

        {/* Visibility Controls */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <EyeOff className="w-5 h-5 text-secondary" />
            <h2 className="text-base font-semibold">What Others Can See</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">Fans List</Label>
              </div>
              <Switch
                checked={privacySettings?.show_fans_list || false}
                onCheckedChange={(checked) => handleToggle('show_fans_list', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">Following List</Label>
              </div>
              <Switch
                checked={privacySettings?.show_following_list || false}
                onCheckedChange={(checked) => handleToggle('show_following_list', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <Gift className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">Total Gifts</Label>
              </div>
              <Switch
                checked={privacySettings?.show_gifts || false}
                onCheckedChange={(checked) => handleToggle('show_gifts', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <Gift className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">Gift History</Label>
              </div>
              <Switch
                checked={privacySettings?.show_gift_history || false}
                onCheckedChange={(checked) => handleToggle('show_gift_history', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">Activity (likes, interactions)</Label>
              </div>
              <Switch
                checked={privacySettings?.show_activity || false}
                onCheckedChange={(checked) => handleToggle('show_activity', checked)}
              />
            </div>
          </div>
        </section>

        <Separator className="bg-glass-border" />

        {/* Interaction Controls */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Who Can Interact</h2>
          </div>

          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-muted/30 space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">Send Messages</Label>
              </div>
              <Select
                value={privacySettings?.who_can_message || 'everyone'}
                onValueChange={(value) => handlePermissionChange('who_can_message', value as InteractionPermission)}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {permissionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 space-y-2">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">Send Gifts</Label>
              </div>
              <Select
                value={privacySettings?.who_can_gift || 'everyone'}
                onValueChange={(value) => handlePermissionChange('who_can_gift', value as InteractionPermission)}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {permissionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <Separator className="bg-glass-border" />

        {/* Block & Mute Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Ban className="w-5 h-5 text-destructive" />
            <h2 className="text-base font-semibold">Blocked & Muted</h2>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowBlockedList(!showBlockedList)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <UserX className="w-5 h-5 text-destructive" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Blocked Users</p>
                  <p className="text-xs text-muted-foreground">{blockedUsers.length} users blocked</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showBlockedList ? 'rotate-90' : ''}`} />
            </button>

            {showBlockedList && blockedUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pl-8 space-y-2"
              >
                {blockedUsers.map((blocked) => (
                  <div key={blocked.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                    <span className="text-sm text-muted-foreground">User #{blocked.blocked_id.slice(0, 8)}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs text-destructive"
                      onClick={() => unblockUser.mutate(blocked.blocked_id)}
                    >
                      Unblock
                    </Button>
                  </div>
                ))}
              </motion.div>
            )}

            <button
              onClick={() => setShowMutedList(!showMutedList)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <VolumeX className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Muted Users</p>
                  <p className="text-xs text-muted-foreground">{mutedUsers.length} users muted</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showMutedList ? 'rotate-90' : ''}`} />
            </button>

            {showMutedList && mutedUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pl-8 space-y-2"
              >
                {mutedUsers.map((muted) => (
                  <div key={muted.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                    <span className="text-sm text-muted-foreground">User #{muted.muted_id.slice(0, 8)}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => unmuteUser.mutate(muted.muted_id)}
                    >
                      Unmute
                    </Button>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </section>

        <Separator className="bg-glass-border" />

        {/* Security Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Security</h2>
          </div>

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground">Your Data is Protected</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Your account data is securely stored and protected with industry-standard encryption. 
                  We never share your personal information with third parties.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/30">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-secondary mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground">Long-term Data Protection</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Your content, fans, and account history are preserved indefinitely. 
                  Even after many years, your data remains safe and accessible.
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={handleSecureLogout}
          >
            <LogOut className="w-4 h-4" />
            Secure Logout
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Logs you out on this device while keeping your data safe
          </p>
        </section>
      </div>
    </motion.div>
  );
};

export default PrivacySecuritySettings;
