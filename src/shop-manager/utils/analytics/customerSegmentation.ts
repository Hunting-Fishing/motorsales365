import { Customer, adaptCustomerForUI } from "@/types/customer";
import { supabase } from "@/integrations/supabase/client";
import { calculateCustomerLifetimeValue } from "./customerLifetimeValue";

// Define customer segment types
export type CustomerSegmentType = 
  | 'high_value' 
  | 'medium_value'
  | 'low_value'
  | 'new'
  | 'at_risk'
  | 'loyal'
  | 'inactive';

export interface CustomerWithSegments extends Customer {
  segments: CustomerSegmentType[];
  clv?: number;
  lastOrderDate?: string;
  orderCount?: number;
}

/**
 * Calculate and return all relevant segments for a customer
 */
export const analyzeCustomerSegments = async (customerId: string): Promise<CustomerSegmentType[]> => {
  try {
    const segments: CustomerSegmentType[] = [];
    
    // Get CLV
    const clv = await calculateCustomerLifetimeValue(customerId);
    
    if (clv === null) return ['new']; // Default to new if no data
    
    // Get work order history
    const { data: workOrders, error: workOrdersError } = await supabase
      .from("work_orders")
      .select("id, created_at, total_cost, status")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    
    if (workOrdersError) {
      console.error("Error fetching work order data:", workOrdersError);
      return ['new'];
    }
    
    const orderCount = workOrders?.length || 0;
    const lastOrderDate = orderCount > 0 ? new Date(workOrders[0].created_at) : null;
    const now = new Date();
    
    // CLV-based segmentation
    if (clv > 1000) {
      segments.push('high_value');
    } else if (clv > 300) {
      segments.push('medium_value');
    } else {
      segments.push('low_value');
    }
    
    // Recency-based segmentation
    if (!lastOrderDate) {
      segments.push('new');
    } else {
      const daysSinceLastOrder = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastOrder > 365) {
        segments.push('inactive');
      } else if (daysSinceLastOrder > 180) {
        segments.push('at_risk');
      } else if (orderCount >= 3) {
        segments.push('loyal');
      }
    }
    
    return segments;
  } catch (error) {
    console.error("Error analyzing customer segments:", error);
    return ['new']; // Default to new if error
  }
};

/**
 * Get all customers with their calculated segments
 */
export const getCustomersWithSegments = async (): Promise<CustomerWithSegments[]> => {
  try {
    // Get all customers
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("*");
    
    if (customersError) {
      throw customersError;
    }
    
    // Convert raw database customers to UI-friendly format to handle JSON tags/segments
    const uiCustomers = (customers || []).map(customer => adaptCustomerForUI(customer as Customer));
    
    // Process each customer to add segment information
    const result = await Promise.all(uiCustomers.map(async (customer) => {
      const clv = await calculateCustomerLifetimeValue(customer.id);
      
      // Get work order history for this customer
      const { data: workOrders } = await supabase
        .from("work_orders")
        .select("created_at, total_cost, status")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      
      const orderCount = workOrders?.length || 0;
      const lastOrderDate = orderCount > 0 ? workOrders[0].created_at : null;
      
      // Calculate segments for this customer
      const segments = await analyzeCustomerSegments(customer.id);
      
      return {
        ...customer,
        segments,
        clv: clv || 0,
        lastOrderDate: lastOrderDate || '',
        orderCount
      } as CustomerWithSegments;
    }));
    
    return result;
  } catch (error) {
    console.error("Error getting customers with segments:", error);
    return [];
  }
};

/**
 * Calculate retention risk score for a customer (0-100, higher = higher risk)
 */
export const calculateRetentionRiskScore = async (customerId: string): Promise<number | null> => {
  try {
    // Get customer work order history
    const { data: workOrders, error: workOrdersError } = await supabase
      .from("work_orders")
      .select("id, created_at, status")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    
    if (workOrdersError) {
      console.error("Error fetching work order data:", workOrdersError);
      return null;
    }
    
    if (!workOrders || workOrders.length === 0) {
      return 50; // Neutral score for new customers
    }
    
    const now = new Date();
    const lastOrderDate = new Date(workOrders[0].created_at);
    const daysSinceLastOrder = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Start with base score based on time since last order
    let riskScore = 0;
    
    if (daysSinceLastOrder > 365) {
      riskScore = 80; // High risk if over a year
    } else if (daysSinceLastOrder > 180) {
      riskScore = 60; // Medium-high risk if over 6 months
    } else if (daysSinceLastOrder > 90) {
      riskScore = 40; // Medium risk if over 3 months
    } else if (daysSinceLastOrder > 30) {
      riskScore = 20; // Low-medium risk if over 1 month
    } else {
      riskScore = 10; // Low risk if recent activity
    }
    
    // Adjust based on order frequency
    if (workOrders.length >= 5) {
      riskScore -= 20; // Lower risk for frequent customers
    } else if (workOrders.length >= 3) {
      riskScore -= 10; // Slightly lower risk for semi-frequent customers
    }
    
    // Cap scores to 0-100 range
    return Math.max(0, Math.min(100, riskScore));
  } catch (error) {
    console.error("Error calculating retention risk score:", error);
    return null;
  }
};
