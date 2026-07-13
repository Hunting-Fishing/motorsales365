import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface FeedbackItem {
  id: string;
  customer_id: string;
  customer_name: string;
  work_order_id: string | null;
  work_order_number: string | null;
  overall_rating: number | null;
  comment: string | null;
  category: 'service' | 'staff' | 'pricing' | 'facility' | 'general';
  status: 'new' | 'reviewed' | 'responded' | 'resolved';
  submitted_at: string;
  response_text: string | null;
  responded_by: string | null;
  responded_by_name: string | null;
  responded_at: string | null;
}

export interface FeedbackStats {
  averageRating: number;
  totalResponses: number;
  newReviewsThisWeek: number;
  positivePercentage: number;
  responseRate: number;
}

// Fetch all feedback responses with customer and work order details
export const fetchFeedbackResponses = async (): Promise<FeedbackItem[]> => {
  try {
    const { data, error } = await supabase
      .from('feedback_responses')
      .select(`
        id,
        customer_id,
        work_order_id,
        overall_rating,
        comment,
        category,
        status,
        submitted_at,
        response_text,
        responded_by,
        responded_at
      `)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    // Fetch customer names and work order numbers
    const feedbackItems: FeedbackItem[] = await Promise.all(
      (data || []).map(async (item) => {
        let customerName = 'Unknown Customer';
        let workOrderNumber = null;
        let respondedByName = null;

        // Fetch customer name
        if (item.customer_id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('first_name, last_name')
            .eq('id', item.customer_id)
            .maybeSingle();
          
          if (customerData) {
            customerName = `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() || 'Unknown Customer';
          }
        }

        // Fetch work order number
        if (item.work_order_id) {
          const { data: workOrderData } = await supabase
            .from('work_orders')
            .select('work_order_number')
            .eq('id', item.work_order_id)
            .maybeSingle();
          
          if (workOrderData) {
            workOrderNumber = workOrderData.work_order_number;
          }
        }

        // Fetch responder name
        if (item.responded_by) {
          const { data: responderData } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .or(`id.eq.${item.responded_by},user_id.eq.${item.responded_by}`)
            .maybeSingle();
          
          if (responderData) {
            respondedByName = `${responderData.first_name || ''} ${responderData.last_name || ''}`.trim() || 'Staff';
          }
        }

        return {
          id: item.id,
          customer_id: item.customer_id,
          customer_name: customerName,
          work_order_id: item.work_order_id,
          work_order_number: workOrderNumber,
          overall_rating: item.overall_rating,
          comment: item.comment,
          category: (item.category as FeedbackItem['category']) || 'general',
          status: (item.status as FeedbackItem['status']) || 'new',
          submitted_at: item.submitted_at || new Date().toISOString(),
          response_text: item.response_text,
          responded_by: item.responded_by,
          responded_by_name: respondedByName,
          responded_at: item.responded_at,
        };
      })
    );

    return feedbackItems;
  } catch (error) {
    console.error('Error fetching feedback responses:', error);
    return [];
  }
};

// Calculate feedback statistics
export const calculateFeedbackStats = async (): Promise<FeedbackStats> => {
  try {
    const { data, error } = await supabase
      .from('feedback_responses')
      .select('overall_rating, status, submitted_at, response_text');

    if (error) throw error;

    const responses = data || [];
    const totalResponses = responses.length;

    if (totalResponses === 0) {
      return {
        averageRating: 0,
        totalResponses: 0,
        newReviewsThisWeek: 0,
        positivePercentage: 0,
        responseRate: 0,
      };
    }

    // Calculate average rating
    const ratingsWithValue = responses.filter(r => r.overall_rating !== null);
    const averageRating = ratingsWithValue.length > 0
      ? ratingsWithValue.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / ratingsWithValue.length
      : 0;

    // Count reviews from this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newReviewsThisWeek = responses.filter(r => 
      r.submitted_at && new Date(r.submitted_at) >= oneWeekAgo
    ).length;

    // Calculate positive percentage (4+ stars)
    const positiveCount = ratingsWithValue.filter(r => (r.overall_rating || 0) >= 4).length;
    const positivePercentage = ratingsWithValue.length > 0
      ? Math.round((positiveCount / ratingsWithValue.length) * 100)
      : 0;

    // Calculate response rate (how many have been responded to)
    const respondedCount = responses.filter(r => 
      r.status === 'responded' || r.status === 'resolved' || r.response_text
    ).length;
    const responseRate = Math.round((respondedCount / totalResponses) * 100);

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalResponses,
      newReviewsThisWeek,
      positivePercentage,
      responseRate,
    };
  } catch (error) {
    console.error('Error calculating feedback stats:', error);
    return {
      averageRating: 0,
      totalResponses: 0,
      newReviewsThisWeek: 0,
      positivePercentage: 0,
      responseRate: 0,
    };
  }
};

// Update feedback status
export const updateFeedbackStatus = async (
  feedbackId: string, 
  status: FeedbackItem['status']
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('feedback_responses')
      .update({ status })
      .eq('id', feedbackId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating feedback status:', error);
    toast({
      title: 'Error',
      description: 'Failed to update feedback status.',
      variant: 'destructive',
    });
    return false;
  }
};

// Submit staff response to feedback
export const submitStaffResponse = async (
  feedbackId: string,
  responseText: string,
  respondedBy: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('feedback_responses')
      .update({
        response_text: responseText,
        responded_by: respondedBy,
        responded_at: new Date().toISOString(),
        status: 'responded',
      })
      .eq('id', feedbackId);

    if (error) throw error;
    
    toast({
      title: 'Response Sent',
      description: 'Your response has been saved successfully.',
    });
    return true;
  } catch (error) {
    console.error('Error submitting feedback response:', error);
    toast({
      title: 'Error',
      description: 'Failed to submit response. Please try again.',
      variant: 'destructive',
    });
    return false;
  }
};

// Update feedback category
export const updateFeedbackCategory = async (
  feedbackId: string,
  category: FeedbackItem['category']
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('feedback_responses')
      .update({ category })
      .eq('id', feedbackId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating feedback category:', error);
    return false;
  }
};
