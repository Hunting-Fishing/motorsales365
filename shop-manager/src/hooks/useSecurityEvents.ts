import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import type { SecurityEvent } from '@/types/phase4';

export function useSecurityEvents() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  useEffect(() => {
    fetchSecurityEvents();
  }, []);

  const fetchSecurityEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents(data as any || []);
    } catch (error: any) {
      console.error('Error fetching security events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load security events',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveEvent = async (eventId: string, resolvedBy: string) => {
    try {
      const { error } = await supabase
        .from('security_events')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy
        })
        .eq('id', eventId);

      if (error) throw error;
      
      await fetchSecurityEvents();
      toast({
        title: 'Success',
        description: 'Security event resolved'
      });
    } catch (error: any) {
      console.error('Error resolving security event:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve security event',
        variant: 'destructive'
      });
    }
  };

  return {
    loading,
    events,
    resolveEvent,
    refetch: fetchSecurityEvents
  };
}
