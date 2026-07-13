import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV } from '@/utils/export';
import {
  FeatureRequest,
  CreateFeatureRequestPayload,
  FeatureRequestVote,
  ModuleType,
} from '@/types/feature-requests';

export function useFeatureRequests(moduleFilter?: ModuleType) {
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadFeatureRequests = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('feature_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by module if specified
      if (moduleFilter) {
        query = query.eq('module', moduleFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFeatureRequests((data || []) as FeatureRequest[]);
    } catch (error) {
      console.error('Error loading feature requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feature requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createFeatureRequest = async (
    payload: CreateFeatureRequestPayload,
    attachmentUrls: string[] = []
  ): Promise<FeatureRequest | null> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('feature_requests')
        .insert({
          title: payload.title,
          description: payload.description,
          reason_for_change: payload.reason_for_change,
          module: payload.module,
          category: payload.category,
          priority: payload.priority,
          submitter_name: payload.submitter_name,
          submitter_email: payload.submitter_email,
          submitted_by: user?.id,
          is_public: true,
          is_featured: false,
          vote_count: 0,
          upvotes: 0,
          downvotes: 0,
          tags: payload.tags || [],
          attachments: attachmentUrls,
        })
        .select()
        .single();

      if (error) throw error;

      // Reload feature requests to show the new one
      loadFeatureRequests();

      return data as FeatureRequest;
    } catch (error) {
      console.error('Error creating feature request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feature request. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const notifyDeveloper = async (request: FeatureRequest): Promise<boolean> => {
    try {
      // Insert notification record - store subject/body in notification_data jsonb column
      const { error } = await supabase.from('feature_request_notifications').insert({
        feature_request_id: request.id,
        recipient_email: 'jordilwbailey@gmail.com',
        recipient_type: 'developer',
        notification_type: 'new_request',
        notification_data: {
          subject: `New Feature Request: ${request.title}`,
          body: `A new feature request has been submitted:

ID: RQ-${request.request_number}
Title: ${request.title}
Module: ${request.module}
Priority: ${request.priority}
Category: ${request.category}

Description:
${request.description}

${request.reason_for_change ? `Reason for Change:\n${request.reason_for_change}` : ''}

Submitted by: ${request.submitter_name || 'Anonymous'}
Email: ${request.submitter_email || 'Not provided'}`,
        },
      });

      if (error) {
        console.error('Error creating notification record:', error);
        return false;
      }

      // Try to send the notification via edge function
      try {
        await supabase.functions.invoke('send-feature-request-notification', {
          body: { featureRequestId: request.id },
        });
      } catch (fnError) {
        console.warn('Edge function call failed, notification queued:', fnError);
        // Notification is still in the database, can be processed later
      }

      return true;
    } catch (error) {
      console.error('Error notifying developer:', error);
      return false;
    }
  };

  const updateFeatureRequestStatus = async (
    id: string,
    status: FeatureRequest['status'],
    progressNotes?: string
  ): Promise<boolean> => {
    try {
      const updates: Record<string, any> = { status };
      if (progressNotes) {
        updates.progress_notes = progressNotes;
      }

      const { error } = await supabase.from('feature_requests').update(updates).eq('id', id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Feature request status changed to ${status.replace('_', ' ')}`,
      });

      loadFeatureRequests();
      return true;
    } catch (error) {
      console.error('Error updating feature request status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
      return false;
    }
  };

  const voteOnFeatureRequest = async (
    featureRequestId: string,
    voteType: 'upvote' | 'downvote'
  ): Promise<boolean> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to vote on feature requests',
          variant: 'destructive',
        });
        return false;
      }

      // Check if user has already voted
      const { data: existingVote } = await supabase
        .from('feature_request_votes')
        .select('*')
        .eq('feature_request_id', featureRequestId)
        .eq('user_id', user.id)
        .single();

      if (existingVote) {
        // Update existing vote
        if (existingVote.vote_type === voteType) {
          // Remove vote if clicking the same vote type
          const { error } = await supabase
            .from('feature_request_votes')
            .delete()
            .eq('id', existingVote.id);

          if (error) throw error;
        } else {
          // Change vote type
          const { error } = await supabase
            .from('feature_request_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);

          if (error) throw error;
        }
      } else {
        // Create new vote
        const { error } = await supabase.from('feature_request_votes').insert({
          feature_request_id: featureRequestId,
          user_id: user.id,
          vote_type: voteType,
        });

        if (error) throw error;
      }

      // Reload to get updated vote counts
      loadFeatureRequests();
      return true;
    } catch (error) {
      console.error('Error voting on feature request:', error);
      toast({
        title: 'Error',
        description: 'Failed to register vote',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getUserVote = async (featureRequestId: string): Promise<FeatureRequestVote | null> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data, error } = await supabase
        .from('feature_request_votes')
        .select('*')
        .eq('feature_request_id', featureRequestId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      return data as FeatureRequestVote;
    } catch (error) {
      console.error('Error getting user vote:', error);
      return null;
    }
  };

  const exportFeatureRequests = () => {
    if (featureRequests.length === 0) {
      toast({
        title: 'No Data',
        description: 'There are no feature requests to export',
        variant: 'destructive',
      });
      return;
    }

    const exportData = featureRequests.map((request) => ({
      ID: `RQ-${request.request_number}`,
      DATE: new Date(request.created_at).toLocaleDateString(),
      'REQUESTED BY': request.submitter_name || 'Anonymous',
      MODULE: request.module?.toUpperCase() || 'GENERAL',
      'CHANGE REQUEST DESCRIPTION': request.title,
      'DETAILED DESCRIPTION': request.description,
      'REASONS FOR THE CHANGE': request.reason_for_change || '',
      CATEGORY: request.category?.replace('_', '/').toUpperCase() || '',
      PRIORITY: request.priority?.toUpperCase() || '',
      STATUS: request.status?.replace('_', ' ').toUpperCase() || '',
      'PROGRESS OF PENDING AND APPROVED CHANGES': request.progress_notes || '',
      'ACTIONS RELATED TO THE CHANGE': request.developer_actions || '',
      NOTES: request.admin_notes || '',
      VOTES: request.vote_count || 0,
      'SUBMITTED DATE': new Date(request.created_at).toLocaleDateString(),
      'LAST UPDATED': new Date(request.updated_at).toLocaleDateString(),
      'COMPLETED DATE': request.completed_at
        ? new Date(request.completed_at).toLocaleDateString()
        : '',
    }));

    exportToCSV(exportData, `Change_Log_${moduleFilter || 'All'}`);

    toast({
      title: 'Export Complete',
      description: `Exported ${exportData.length} feature request(s) to CSV`,
    });
  };

  useEffect(() => {
    loadFeatureRequests();
  }, [moduleFilter]);

  return {
    featureRequests,
    isLoading,
    loadFeatureRequests,
    createFeatureRequest,
    notifyDeveloper,
    updateFeatureRequestStatus,
    voteOnFeatureRequest,
    getUserVote,
    exportFeatureRequests,
  };
}
