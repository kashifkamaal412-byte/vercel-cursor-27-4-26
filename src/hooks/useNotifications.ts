import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface FollowNotification {
  id: string;
  type: 'follow' | 'unfollow';
  from_user_id: string;
  to_user_id: string;
  created_at: string;
  is_read: boolean;
}

const useFollowNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<FollowNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    // Real-time subscription
    const channel = supabase
      .channel('follow-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'follows',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        const newNotif = payload.new as FollowNotification;
        setNotifications([newNotif, ...notifications]);
        if (!newNotif.is_read) setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('follows').update({ is_read: true }).eq('id', id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking follow as read:', error);
    }
  };

  return { notifications, unreadCount, markAsRead };
};

// Export for DesktopSidebar
export const useNotifications = useFollowNotifications;

// Usage in Profile component
// const { notifications, unreadCount, markAsRead } = useFollowNotifications();
