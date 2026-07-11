
import { supabase } from "@/integrations/supabase/client";

/**
 * Assign a customer to multiple segments
 */
export const assignCustomerToSegments = async (customerId: string, segmentIds: string[]) => {
  if (!segmentIds.length) return [];

  const assignments = segmentIds.map(segmentId => ({
    customer_id: customerId,
    segment_id: segmentId
  }));

  const { data, error } = await supabase
    .from('customer_segment_assignments')
    .insert(assignments)
    .select();

  if (error) {
    console.error("Error assigning customer to segments:", error);
    throw error;
  }

  return data;
};
