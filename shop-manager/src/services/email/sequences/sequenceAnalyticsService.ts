
import { supabase } from '@/lib/supabase';
import { EmailSequenceAnalytics } from '@/types/email';
import { GenericResponse } from '../utils/supabaseHelper';

/**
 * Service for email sequence analytics operations
 */
export const sequenceAnalyticsService = {
  /**
   * Get sequence analytics
   * @param sequenceId ID of the sequence to get analytics for
   * @returns Analytics data for the sequence
   */
  async getSequenceAnalytics(sequenceId: string): Promise<GenericResponse<EmailSequenceAnalytics>> {
    try {
      // Get enrollments data
      const { data, error } = await supabase
        .from('email_sequence_enrollments')
        .select('*')
        .eq('sequence_id', sequenceId);
        
      if (error) throw error;
      
      // Convert database records to EmailSequenceEnrollment objects
      const enrollments = data.map(record => ({
        id: record.id,
        sequence_id: record.sequence_id,
        customer_id: record.customer_id,
        status: record.status as 'active' | 'paused' | 'completed' | 'cancelled',
        current_step_id: record.current_step_id,
        created_at: record.created_at,
        updated_at: record.updated_at,
        completed_at: record.completed_at,
        // Support for UI components
        sequenceId: record.sequence_id,
        customerId: record.customer_id,
        currentStepId: record.current_step_id,
        startedAt: record.started_at || record.created_at,
        completedAt: record.completed_at,
        nextSendTime: record.next_send_time,
        metadata: record.metadata || {}
      }));
      
      // Calculate analytics from enrollments
      const totalEnrollments = enrollments.length;
      const activeEnrollments = enrollments.filter(e => e.status === 'active').length;
      const completedEnrollments = enrollments.filter(e => e.status === 'completed').length;
      const cancelledEnrollments = enrollments.filter(e => e.status === 'cancelled').length;
      
      // Calculate conversion rate
      const conversionRate = totalEnrollments > 0
        ? (completedEnrollments / totalEnrollments) * 100
        : 0;
      
      // Calculate average time to complete for completed enrollments
      let totalTimeToComplete = 0;
      let completedCount = 0;
      
      for (const enrollment of enrollments) {
        if (enrollment.status === 'completed' && enrollment.completed_at && enrollment.created_at) {
          const startDate = new Date(enrollment.created_at);
          const endDate = new Date(enrollment.completed_at);
          const timeToComplete = endDate.getTime() - startDate.getTime();
          totalTimeToComplete += timeToComplete;
          completedCount++;
        }
      }
      
      const averageTimeToComplete = completedCount > 0
        ? totalTimeToComplete / completedCount
        : 0;
      
      // Get sent emails count
      const { count: emailsSent, error: emailsError } = await supabase
        .from('email_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'sent')
        .like('metadata->>sequence_id', sequenceId);
      
      if (emailsError) console.error('Error counting emails:', emailsError);
      
      // Generate timeline data (past 30 days)
      const timelineData = [];
      const now = new Date();
      for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Count enrollments for this day
        const enrollmentsForDay = enrollments.filter(e => 
          e.created_at.split('T')[0] === dateStr
        ).length;
        
        // For emails, we'd need to query for each day but let's simplify for now
        timelineData.push({
          date: dateStr,
          enrollments: enrollmentsForDay,
          emailsSent: 0 // This would need a separate query per day to be accurate
        });
      }
      
      const analytics: EmailSequenceAnalytics = {
        id: `analytics-${sequenceId}`,
        sequence_id: sequenceId,
        sequenceId: sequenceId,
        total_enrollments: totalEnrollments,
        totalEnrollments: totalEnrollments,
        active_enrollments: activeEnrollments,
        activeEnrollments: activeEnrollments,
        completed_enrollments: completedEnrollments,
        completedEnrollments: completedEnrollments,
        cancelled_enrollments: cancelledEnrollments,
        conversion_rate: conversionRate,
        conversionRate: conversionRate,
        average_time_to_complete: averageTimeToComplete,
        averageTimeToComplete: averageTimeToComplete,
        updated_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        total_emails_sent: emailsSent || 0,
        totalEmailsSent: emailsSent || 0,
        emailsSent: emailsSent || 0,
        timeline: timelineData
      };
      
      return { data: analytics, error: null };
    } catch (error) {
      console.error('Error getting sequence analytics:', error);
      return { data: null, error };
    }
  }
};
