import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

export interface SafetyMeeting {
  id: string;
  shop_id: string;
  meeting_type: 'toolbox_talk' | 'safety_committee' | 'all_hands' | 'training';
  title: string;
  description?: string;
  meeting_date: string;
  duration_minutes?: number;
  location?: string;
  facilitator_id?: string;
  facilitator_name?: string;
  topics: string[];
  discussion_notes?: string;
  action_items: ActionItem[];
  attachments: string[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  due_date?: string;
  completed: boolean;
}

export interface MeetingAttendee {
  id: string;
  meeting_id: string;
  employee_id?: string;
  employee_name: string;
  attended: boolean;
  signature_data?: string;
  signed_at?: string;
  notes?: string;
  created_at: string;
}

export interface CreateMeetingInput {
  meeting_type: string;
  title: string;
  description?: string;
  meeting_date: string;
  duration_minutes?: number;
  location?: string;
  facilitator_id?: string;
  facilitator_name?: string;
  topics?: string[];
}

export function useSafetyMeetings() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['safety-meetings', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('safety_meetings')
        .select('*')
        .order('meeting_date', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(meeting => ({
        ...meeting,
        action_items: (Array.isArray(meeting.action_items) ? meeting.action_items : []) as unknown as ActionItem[],
      })) as SafetyMeeting[];
    },
    enabled: !!shopId,
  });

  const createMeeting = useMutation({
    mutationFn: async (input: CreateMeetingInput) => {
      if (!shopId) throw new Error('No shop ID');
      const { data, error } = await supabase
        .from('safety_meetings')
        .insert({
          ...input,
          shop_id: shopId,
          topics: input.topics || [],
          action_items: [],
          attachments: [],
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-meetings'] });
      toast.success('Meeting scheduled successfully');
    },
    onError: (error) => {
      toast.error('Failed to create meeting: ' + error.message);
    },
  });

  const updateMeeting = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetyMeeting> & { id: string }) => {
      // Convert action_items to JSON-compatible format
      const dbUpdates: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };
      if (updates.action_items) {
        dbUpdates.action_items = JSON.parse(JSON.stringify(updates.action_items));
      }
      const { data, error } = await supabase
        .from('safety_meetings')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-meetings'] });
      toast.success('Meeting updated');
    },
    onError: (error) => {
      toast.error('Failed to update meeting: ' + error.message);
    },
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('safety_meetings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-meetings'] });
      toast.success('Meeting deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete meeting: ' + error.message);
    },
  });

  return {
    meetings,
    isLoading,
    createMeeting,
    updateMeeting,
    deleteMeeting,
  };
}

export function useMeetingAttendees(meetingId: string | null) {
  const queryClient = useQueryClient();

  const { data: attendees = [], isLoading } = useQuery({
    queryKey: ['meeting-attendees', meetingId],
    queryFn: async () => {
      if (!meetingId) return [];
      const { data, error } = await supabase
        .from('safety_meeting_attendees')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('employee_name');
      
      if (error) throw error;
      return (data || []) as MeetingAttendee[];
    },
    enabled: !!meetingId,
  });

  const addAttendee = useMutation({
    mutationFn: async (input: { meeting_id: string; employee_id?: string; employee_name: string }) => {
      const { data, error } = await supabase
        .from('safety_meeting_attendees')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-attendees', meetingId] });
    },
  });

  const updateAttendee = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MeetingAttendee> & { id: string }) => {
      const { data, error } = await supabase
        .from('safety_meeting_attendees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-attendees', meetingId] });
    },
  });

  const removeAttendee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('safety_meeting_attendees')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-attendees', meetingId] });
    },
  });

  return {
    attendees,
    isLoading,
    addAttendee,
    updateAttendee,
    removeAttendee,
  };
}
