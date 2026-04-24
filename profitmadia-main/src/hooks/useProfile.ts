import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';

export type Profile = Tables<'profiles'>;
export type ProfileUpdate = TablesUpdate<'profiles'>;

// File upload security constants
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const validateImageFile = (file: File): string | null => {
  // Validate MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Invalid file type. Please upload JPG, PNG, GIF, or WebP images.';
  }
  
  // Validate extension
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
    return 'Invalid file extension.';
  }
  
  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return 'File too large. Maximum size is 5MB.';
  }
  
  return null; // No error
};
export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Profile updated!');
    },
    onError: (error) => {
      toast.error('Failed to update profile');
      if (import.meta.env.DEV) {
        console.error('Profile update error:', error);
      }
    },
  });

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;
    
    // Validate file before upload
    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return null;
    }
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${user.id}/avatar.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { 
        upsert: true,
        contentType: file.type // Explicitly set content type
      });
    
    if (uploadError) {
      toast.error('Failed to upload avatar');
      if (import.meta.env.DEV) {
        console.error('Avatar upload error:', uploadError);
      }
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const uploadCover = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;
    
    // Validate file before upload
    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return null;
    }
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${user.id}/cover.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(fileName, file, { 
        upsert: true,
        contentType: file.type // Explicitly set content type
      });
    
    if (uploadError) {
      toast.error('Failed to upload cover');
      if (import.meta.env.DEV) {
        console.error('Cover upload error:', uploadError);
      }
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('covers')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const getAccountAge = () => {
    if (!profile?.created_at) return null;
    
    const created = new Date(profile.created_at);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return { value: diffDays, unit: 'days' };
    if (diffDays < 365) return { value: Math.floor(diffDays / 30), unit: 'months' };
    return { value: Math.floor(diffDays / 365), unit: 'years' };
  };

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    uploadAvatar,
    uploadCover,
    getAccountAge,
  };
};
