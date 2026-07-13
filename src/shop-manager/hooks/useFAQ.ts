import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  orderIndex: number;
  isActive: boolean;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FAQFeedback {
  faqId: string;
  isHelpful: boolean;
  rating?: number;
  feedbackText?: string;
}

// Fetch all active FAQs
export const useFAQ = (category?: string) => {
  return useQuery({
    queryKey: ['faq', category],
    queryFn: async () => {
      try {
        let query = supabase
          .from('help_faq')
          .select('*')
          .eq('is_active', true)
          .order('order_index')
          .order('created_at');

        if (category && category !== 'all') {
          query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map((faq): FAQ => ({
          id: faq.id,
          question: faq.question,
          answer: faq.answer,
          category: faq.category || 'general',
          orderIndex: faq.order_index || 0,
          isActive: faq.is_active || false,
          viewCount: faq.view_count || 0,
          helpfulCount: faq.helpful_count || 0,
          notHelpfulCount: faq.not_helpful_count || 0,
          createdBy: faq.created_by,
          createdAt: faq.created_at,
          updatedAt: faq.updated_at
        }));
      } catch (error) {
        console.error('Error fetching FAQ:', error);
        return [];
      }
    },
  });
};

// Get FAQ categories
export const useFAQCategories = () => {
  return useQuery({
    queryKey: ['faq-categories'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('help_faq')
          .select('category')
          .eq('is_active', true);

        if (error) throw error;

        // Get unique categories
        const categories = [...new Set((data || []).map(item => item.category))];
        return categories.filter(Boolean);
      } catch (error) {
        console.error('Error fetching FAQ categories:', error);
        return ['general', 'work_orders', 'customers', 'inventory', 'reports', 'settings'];
      }
    },
  });
};

// Track FAQ view
export const useTrackFAQView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (faqId: string) => {
      const { error } = await supabase.rpc('increment_faq_views', {
        faq_id: faqId
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq'] });
    }
  });
};

// Submit FAQ feedback
export const useSubmitFAQFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedback: FAQFeedback) => {
      const { data, error } = await supabase.rpc('submit_help_feedback', {
        p_resource_type: 'faq',
        p_resource_id: feedback.faqId,
        p_rating: feedback.rating,
        p_is_helpful: feedback.isHelpful,
        p_feedback_text: feedback.feedbackText
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq'] });
    }
  });
};

// Admin functions for managing FAQs
export const useCreateFAQ = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (faq: Omit<FAQ, 'id' | 'viewCount' | 'helpfulCount' | 'notHelpfulCount' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('help_faq')
        .insert({
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          order_index: faq.orderIndex,
          is_active: faq.isActive
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq'] });
      queryClient.invalidateQueries({ queryKey: ['faq-categories'] });
    }
  });
};

export const useUpdateFAQ = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (faq: Partial<FAQ> & { id: string }) => {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (faq.question) updateData.question = faq.question;
      if (faq.answer) updateData.answer = faq.answer;
      if (faq.category) updateData.category = faq.category;
      if (faq.orderIndex !== undefined) updateData.order_index = faq.orderIndex;
      if (faq.isActive !== undefined) updateData.is_active = faq.isActive;

      const { data, error } = await supabase
        .from('help_faq')
        .update(updateData)
        .eq('id', faq.id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq'] });
      queryClient.invalidateQueries({ queryKey: ['faq-categories'] });
    }
  });
};

export const useDeleteFAQ = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (faqId: string) => {
      const { error } = await supabase
        .from('help_faq')
        .delete()
        .eq('id', faqId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq'] });
      queryClient.invalidateQueries({ queryKey: ['faq-categories'] });
    }
  });
};