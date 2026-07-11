import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChatStats {
  activeChats: number;
  onlineMembers: number;
  averageResponseTime: number;
  messagesToday: number;
  loading: boolean;
}

export const useChatStats = (userId?: string) => {
  const [stats, setStats] = useState<ChatStats>({
    activeChats: 0,
    onlineMembers: 0,
    averageResponseTime: 0,
    messagesToday: 0,
    loading: true
  });

  useEffect(() => {
    if (!userId) return;

    const fetchStats = async () => {
      try {
        // Get active chats count
        const { count: activeChatsCount } = await supabase
          .from('chat_rooms')
          .select('*', { count: 'exact', head: true })
          .eq('is_archived', false);

        // Get online members count (profiles who have been active in last 15 minutes)
        // Note: using updated_at as proxy since last_seen column doesn't exist
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { count: onlineMembersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('updated_at', fifteenMinutesAgo);

        // Get messages today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: messagesTodayCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());

        // Calculate average response time (simplified - time between consecutive messages in active chats)
        const { data: recentMessages } = await supabase
          .from('chat_messages')
          .select('created_at, room_id, sender_id')
          .gte('created_at', today.toISOString())
          .order('created_at', { ascending: true })
          .limit(100);

        let totalResponseTime = 0;
        let responseCount = 0;

        if (recentMessages && recentMessages.length > 1) {
          for (let i = 1; i < recentMessages.length; i++) {
            const current = recentMessages[i];
            const previous = recentMessages[i - 1];
            
            if (current.room_id === previous.room_id && current.sender_id !== previous.sender_id) {
              const responseTime = new Date(current.created_at).getTime() - new Date(previous.created_at).getTime();
              totalResponseTime += responseTime;
              responseCount++;
            }
          }
        }

        const averageResponseTime = responseCount > 0 
          ? Math.round(totalResponseTime / responseCount / 1000 / 60) // Convert to minutes
          : 0;

        setStats({
          activeChats: activeChatsCount || 0,
          onlineMembers: onlineMembersCount || 0,
          averageResponseTime,
          messagesToday: messagesTodayCount || 0,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching chat stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();

    // Refresh stats every minute
    const interval = setInterval(fetchStats, 60000);

    return () => clearInterval(interval);
  }, [userId]);

  return stats;
};
