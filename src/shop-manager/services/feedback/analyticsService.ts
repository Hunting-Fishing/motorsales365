
import { supabase } from "@/integrations/supabase/client";
import { FeedbackAnalytics } from "./types";

// Calculate feedback analytics for a specific form
export const getFeedbackAnalytics = async (formId: string): Promise<FeedbackAnalytics | null> => {
  try {
    const { data, error } = await supabase
      .from('feedback_responses')
      .select('*')
      .eq('form_id', formId);

    if (error) throw error;
    
    if (!data || data.length === 0) {
      return {
        average_rating: 0,
        total_responses: 0,
        nps_score: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        response_rate: 0,
        feedback_by_category: {}
      };
    }

    // Calculate NPS scores
    let promoters = 0;
    let passives = 0;
    let detractors = 0;
    let totalRating = 0;
    let ratingCount = 0;

    data.forEach(response => {
      if (response.nps_score !== null && response.nps_score !== undefined) {
        if (response.nps_score >= 9) promoters++;
        else if (response.nps_score >= 7) passives++;
        else detractors++;
      }

      if (response.overall_rating !== null && response.overall_rating !== undefined) {
        totalRating += response.overall_rating;
        ratingCount++;
      }
    });

    // Calculate NPS score: (% Promoters - % Detractors) * 100
    const npsScore = data.length > 0 
      ? ((promoters / data.length) - (detractors / data.length)) * 100 
      : 0;

    // Calculate average rating
    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    // Calculate feedback by category (you would need to define these categories based on your form structure)
    const feedbackByCategory: Record<string, number> = {};
    
    return {
      average_rating: averageRating,
      total_responses: data.length,
      nps_score: npsScore,
      promoters,
      passives,
      detractors,
      response_rate: 0, // This would require knowing how many people were asked for feedback
      feedback_by_category: feedbackByCategory
    };
  } catch (error) {
    console.error('Error calculating feedback analytics:', error);
    return null;
  }
};
