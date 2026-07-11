import { supabase } from '@/integrations/supabase/client';

export interface CallLog {
  id: string;
  customer_id?: string;
  work_order_id?: string;
  caller_id: string;
  caller_name: string;
  recipient_id?: string;
  recipient_name?: string;
  call_type: 'incoming' | 'outgoing' | 'missed';
  call_direction: 'inbound' | 'outbound';
  phone_number: string;
  duration_seconds: number;
  call_status: 'completed' | 'missed' | 'busy' | 'failed' | 'voicemail';
  notes?: string;
  recording_url?: string;
  call_started_at: string;
  call_ended_at?: string;
  created_at: string;
  updated_at: string;
}

export const callLogsService = {
  // Get all call logs
  async getCallLogs(): Promise<CallLog[]> {
    const { data, error } = await supabase
      .from('call_logs')
      .select(`
        *,
        customers!customer_id(first_name, last_name),
        work_orders!work_order_id(id, status)
      `)
      .order('call_started_at', { ascending: false });

    if (error) {
      console.error('Error fetching call logs:', error);
      throw error;
    }

    return (data as CallLog[]) || [];
  },

  // Get call logs for today
  async getTodayCallLogs(): Promise<CallLog[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .gte('call_started_at', today.toISOString())
      .order('call_started_at', { ascending: false });

    if (error) {
      console.error('Error fetching today call logs:', error);
      throw error;
    }

    return (data as CallLog[]) || [];
  },

  // Get call logs by customer
  async getCallLogsByCustomer(customerId: string): Promise<CallLog[]> {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('customer_id', customerId)
      .order('call_started_at', { ascending: false });

    if (error) {
      console.error('Error fetching call logs by customer:', error);
      throw error;
    }

    return (data as CallLog[]) || [];
  },

  // Get call logs by work order
  async getCallLogsByWorkOrder(workOrderId: string): Promise<CallLog[]> {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('call_started_at', { ascending: false });

    if (error) {
      console.error('Error fetching call logs by work order:', error);
      throw error;
    }

    return (data as CallLog[]) || [];
  },

  // Create new call log
  async createCallLog(callLog: Omit<CallLog, 'id' | 'created_at' | 'updated_at'>): Promise<CallLog> {
    const { data, error } = await supabase
      .from('call_logs')
      .insert(callLog)
      .select()
      .single();

    if (error) {
      console.error('Error creating call log:', error);
      throw error;
    }

    return data as CallLog;
  },

  // Update call log
  async updateCallLog(id: string, updates: Partial<CallLog>): Promise<CallLog> {
    const { data, error } = await supabase
      .from('call_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating call log:', error);
      throw error;
    }

    return data as CallLog;
  },

  // Delete call log
  async deleteCallLog(id: string): Promise<void> {
    const { error } = await supabase
      .from('call_logs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting call log:', error);
      throw error;
    }
  },

  // Start a call (create initial log entry)
  async startCall(callData: {
    caller_id: string;
    caller_name: string;
    phone_number: string;
    call_type: 'incoming' | 'outgoing' | 'missed';
    call_direction: 'inbound' | 'outbound';
    customer_id?: string;
    work_order_id?: string;
  }): Promise<CallLog> {
    const callLog = {
      ...callData,
      duration_seconds: 0,
      call_status: 'completed' as const,
      call_started_at: new Date().toISOString()
    };

    return this.createCallLog(callLog);
  },

  // End a call (update with final details)
  async endCall(id: string, endData: {
    call_status: 'completed' | 'missed' | 'busy' | 'failed' | 'voicemail';
    duration_seconds: number;
    notes?: string;
    recording_url?: string;
  }): Promise<CallLog> {
    return this.updateCallLog(id, {
      ...endData,
      call_ended_at: new Date().toISOString()
    });
  },

  // Get call statistics
  async getCallStats(startDate?: string, endDate?: string): Promise<{
    totalCalls: number;
    inboundCalls: number;
    outboundCalls: number;
    missedCalls: number;
    averageDuration: number;
    totalDuration: number;
  }> {
    let query = supabase
      .from('call_logs')
      .select('call_direction, call_status, duration_seconds');

    if (startDate) {
      query = query.gte('call_started_at', startDate);
    }
    if (endDate) {
      query = query.lte('call_started_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching call stats:', error);
      throw error;
    }

    const calls = data || [];
    const totalCalls = calls.length;
    const inboundCalls = calls.filter(call => call.call_direction === 'inbound').length;
    const outboundCalls = calls.filter(call => call.call_direction === 'outbound').length;
    const missedCalls = calls.filter(call => call.call_status === 'missed').length;
    const totalDuration = calls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
    const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

    return {
      totalCalls,
      inboundCalls,
      outboundCalls,
      missedCalls,
      averageDuration,
      totalDuration
    };
  },

  // Search call logs
  async searchCallLogs(searchTerm: string): Promise<CallLog[]> {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .or(`caller_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
      .order('call_started_at', { ascending: false });

    if (error) {
      console.error('Error searching call logs:', error);
      throw error;
    }

    return (data as CallLog[]) || [];
  }
};