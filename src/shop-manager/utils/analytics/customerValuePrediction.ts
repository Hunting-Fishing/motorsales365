
import { Customer } from "@/types/customer";
import { calculateCustomerLifetimeValue } from "./customerLifetimeValue";
import { supabase } from "@/integrations/supabase/client";

/**
 * Predicts future customer lifetime value based on historical data
 * and growth patterns
 */
export const predictFutureCustomerValue = async (customerId: string, timeframeMonths: number = 12): Promise<number | null> => {
  try {
    // Get current CLV
    const currentClv = await calculateCustomerLifetimeValue(customerId);
    if (currentClv === null) return null;
    
    // Get customer history to determine patterns
    const { data: workOrders, error: workOrdersError } = await supabase
      .from("work_orders")
      .select("id, created_at, total_cost, status")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true });
    
    if (workOrdersError) {
      console.error("Error fetching work order data for prediction:", workOrdersError);
      return null;
    }
    
    if (!workOrders || workOrders.length === 0) {
      // No history - use default prediction factor (20% increase)
      return currentClv * 1.2;
    }
    
    // Analyze growth rate over time
    // In a real implementation, this would use more sophisticated ML algorithms
    // but for demo purposes, we'll implement a simple growth model
    
    // Group orders by quarters
    const quarterlyData: Record<string, number> = {};
    workOrders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const quarter = `${orderDate.getFullYear()}-Q${Math.floor(orderDate.getMonth() / 3) + 1}`;
      
      if (!quarterlyData[quarter]) {
        quarterlyData[quarter] = 0;
      }
      
      quarterlyData[quarter] += order.total_cost || 0;
    });
    
    // Convert to array and sort chronologically
    const quarters = Object.keys(quarterlyData).sort();
    
    // If we have at least 2 quarters of data, calculate growth rate
    if (quarters.length >= 2) {
      const oldestQuarterValue = quarterlyData[quarters[0]];
      const newestQuarterValue = quarterlyData[quarters[quarters.length - 1]];
      
      // Calculate quarterly growth rate
      const numQuarters = quarters.length - 1;
      const quarterlyGrowthRate = Math.pow(newestQuarterValue / oldestQuarterValue, 1 / numQuarters) - 1;
      
      // Calculate projected value based on timeframe
      const projectedQuarters = timeframeMonths / 3;
      return currentClv * Math.pow(1 + quarterlyGrowthRate, projectedQuarters);
    }
    
    // Default growth prediction if insufficient historical data
    return currentClv * 1.25;
    
  } catch (error) {
    console.error("Error predicting future customer value:", error);
    return null;
  }
};

/**
 * Get recommended next services based on customer history and patterns
 */
export const getRecommendedNextServices = async (customerId: string): Promise<string[]> => {
  try {
    // Get work history to analyze patterns
    const { data: workOrders, error: workOrdersError } = await supabase
      .from("work_orders")
      .select("id, created_at, description, total_cost")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    
    if (workOrdersError) {
      console.error("Error fetching work order data for recommendations:", workOrdersError);
      return ["Regular Maintenance", "Diagnostic Check"];
    }
    
    if (!workOrders || workOrders.length === 0) {
      return ["Initial Service Package", "Full Inspection"];
    }
    
    // In a real implementation, this would analyze the service history 
    // and use ML to predict what services are most likely needed next
    // For demo purposes, we'll return reasonable recommendations based on
    // basic patterns like time since last service
    
    const lastServiceDate = new Date(workOrders[0].created_at);
    const daysSinceLastService = Math.floor((new Date().getTime() - lastServiceDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastService > 180) {
      return ["Full Maintenance", "System Diagnostic", "Performance Check"];
    } else if (daysSinceLastService > 90) {
      return ["Regular Maintenance", "Fluid Check", "Filter Replacement"];
    } else {
      return ["Quick Service", "Inspection", "Performance Optimization"];
    }
    
  } catch (error) {
    console.error("Error determining recommended services:", error);
    return ["Maintenance Service", "System Check"];
  }
};

/**
 * Calculate optimal time for next communication based on customer behavior
 */
export const getOptimalContactTime = async (customerId: string): Promise<string> => {
  try {
    // Get communication history and response rates
    const { data: communications, error: commsError } = await supabase
      .from("customer_communications")
      .select("*")
      .eq("customer_id", customerId)
      .order("date", { ascending: false });
    
    if (commsError) {
      console.error("Error fetching communication data:", commsError);
      return "Next month";
    }
    
    // Simple logic for demo purposes
    // In production, this would analyze patterns in customer responsiveness
    
    // See when last service was performed
    const { data: workOrders, error: woError } = await supabase
      .from("work_orders")
      .select("created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1);
    
    if (woError || !workOrders || workOrders.length === 0) {
      return "Within 2 weeks";
    }
    
    const lastServiceDate = new Date(workOrders[0].created_at);
    const daysSinceLastService = Math.floor((new Date().getTime() - lastServiceDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastService > 270) {
      return "Immediately";
    } else if (daysSinceLastService > 180) {
      return "Within 2 weeks";
    } else if (daysSinceLastService > 90) {
      return "Next month";
    } else {
      return "In 2-3 months";
    }
    
  } catch (error) {
    console.error("Error determining optimal contact time:", error);
    return "Next month";
  }
};
