import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ProfileVisibility = 'public' | 'friends' | 'private';
export type InteractionPermission = 'everyone' | 'fans' | 'nobody';

export interface PrivacySettings {
  id: string;
  user_id: string;
  profile_visibility: ProfileVisibility;
  profile_locked: boolean;
  show_fans_list: boolean;
  show_following_list: boolean;
  show_gifts: boolean;
  show_gift_history: boolean;
  show_activity: boolean;
  who_can_message: InteractionPermission;
  who_can_gift: InteractionPermission;
  created_at: string;
  updated_at: string;
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface MutedUser {
  id: string;
  muter_id: string;
  muted_id: string;
  created_at: string;
}

export const usePrivacySettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch privacy settings
  const { data: privacySettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['privacy-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        // If no settings exist, create default ones
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: insertError } = await supabase
            .from('privacy_settings')
            .insert({ user_id: user.id })
            .select()
            .single();
          
          if (insertError) throw insertError;
          return newSettings as PrivacySettings;
        }
        throw error;
      }
      return data as PrivacySettings;
    },
    enabled: !!user?.id,
  });

  // Fetch blocked users
  const { data: blockedUsers = [], isLoading: blockedLoading } = useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('blocker_id', user.id);
      
      if (error) throw error;
      return data as BlockedUser[];
    },
    enabled: !!user?.id,
  });

  // Fetch muted users
  const { data: mutedUsers = [], isLoading: mutedLoading } = useQuery({
    queryKey: ['muted-users', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('muted_users')
        .select('*')
        .eq('muter_id', user.id);
      
      if (error) throw error;
      return data as MutedUser[];
    },
    enabled: !!user?.id,
  });

  // Update privacy settings
  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<PrivacySettings>) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('privacy_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as PrivacySettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy-settings', user?.id] });
      toast.success('Privacy settings updated');
    },
    onError: () => {
      toast.error('Failed to update settings');
    },
  });

  // Block a user
  const blockUser = useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('blocked_users')
        .insert({ blocker_id: user.id, blocked_id: blockedId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users', user?.id] });
      toast.success('User blocked');
    },
    onError: () => {
      toast.error('Failed to block user');
    },
  });

  // Unblock a user
  const unblockUser = useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users', user?.id] });
      toast.success('User unblocked');
    },
    onError: () => {
      toast.error('Failed to unblock user');
    },
  });

  // Mute a user
  const muteUser = useMutation({
    mutationFn: async (mutedId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('muted_users')
        .insert({ muter_id: user.id, muted_id: mutedId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muted-users', user?.id] });
      toast.success('User muted');
    },
    onError: () => {
      toast.error('Failed to mute user');
    },
  });

  // Unmute a user
  const unmuteUser = useMutation({
    mutationFn: async (mutedId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('muted_users')
        .delete()
        .eq('muter_id', user.id)
        .eq('muted_id', mutedId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muted-users', user?.id] });
      toast.success('User unmuted');
    },
    onError: () => {
      toast.error('Failed to unmute user');
    },
  });

  return {
    privacySettings,
    blockedUsers,
    mutedUsers,
    isLoading: settingsLoading || blockedLoading || mutedLoading,
    updateSettings,
    blockUser,
    unblockUser,
    muteUser,
    unmuteUser,
  };
};
