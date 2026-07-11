
import { useState } from 'react';
import { EmailSequenceAnalytics } from '@/types/email';
import { emailSequenceService } from '@/services/email';

export const useSequenceAnalytics = (sequenceId?: string) => {
  const [analytics, setAnalytics] = useState<EmailSequenceAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = async (targetSequenceId?: string) => {
    // Use the provided targetSequenceId or fall back to the hook's sequenceId
    const idToUse = targetSequenceId || sequenceId;
    
    if (!idToUse) {
      setError(new Error('No sequence ID provided'));
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await emailSequenceService.getSequenceAnalytics(idToUse);
      
      if (error) throw error;
      
      // Standardize property names to camelCase for frontend usage
      const enhancedData: EmailSequenceAnalytics = {
        id: data?.id || '',
        sequenceId: data?.sequenceId || data?.sequence_id || idToUse,
        sequence_id: data?.sequence_id || idToUse,
        totalEnrollments: data?.totalEnrollments || data?.total_enrollments || 0,
        total_enrollments: data?.total_enrollments || data?.totalEnrollments || 0,
        activeEnrollments: data?.activeEnrollments || data?.active_enrollments || 0,
        active_enrollments: data?.active_enrollments || data?.activeEnrollments || 0,
        completedEnrollments: data?.completedEnrollments || data?.completed_enrollments || 0,
        completed_enrollments: data?.completed_enrollments || data?.completedEnrollments || 0,
        cancelledEnrollments: data?.cancelledEnrollments || data?.cancelled_enrollments || 0,
        cancelled_enrollments: data?.cancelled_enrollments || data?.cancelledEnrollments || 0,
        conversionRate: data?.conversionRate || data?.conversion_rate || 0,
        conversion_rate: data?.conversion_rate || data?.conversionRate || 0,
        averageTimeToComplete: data?.averageTimeToComplete || data?.average_time_to_complete || 0,
        average_time_to_complete: data?.average_time_to_complete || data?.averageTimeToComplete || 0,
        totalEmailsSent: data?.totalEmailsSent || data?.total_emails_sent || 0,
        total_emails_sent: data?.total_emails_sent || data?.totalEmailsSent || 0,
        emailsSent: data?.emailsSent || data?.total_emails_sent || 0,
        openRate: data?.openRate || data?.open_rate || 0,
        open_rate: data?.open_rate || data?.openRate || 0,
        clickRate: data?.clickRate || data?.click_rate || 0,
        click_rate: data?.click_rate || data?.clickRate || 0,
        updatedAt: data?.updatedAt || data?.updated_at || new Date().toISOString(),
        updated_at: data?.updated_at || data?.updatedAt || new Date().toISOString(),
        createdAt: data?.createdAt || data?.created_at || new Date().toISOString(),
        created_at: data?.created_at || data?.createdAt || new Date().toISOString(),
        // Ensure timeline data is properly formatted
        timeline: Array.isArray(data?.timeline) ? data.timeline : []
      };
      
      setAnalytics(enhancedData);
      return enhancedData;
    } catch (err) {
      console.error('Error fetching sequence analytics:', err);
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch analytics');
      setError(errorObj);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Refresh analytics data periodically for active sequences
  const refreshAnalytics = async (intervalMs = 60000) => {
    if (!sequenceId) return null;
    
    try {
      const result = await fetchAnalytics(sequenceId);
      // Set up interval for refreshing data
      const intervalId = setInterval(async () => {
        await fetchAnalytics(sequenceId);
      }, intervalMs);
      
      // Return cleanup function
      return () => clearInterval(intervalId);
    } catch (err) {
      console.error('Error in refreshAnalytics:', err);
      return null;
    }
  };

  return {
    analytics,
    loading,
    error,
    fetchAnalytics,
    refreshAnalytics,
    setAnalytics
  };
};
