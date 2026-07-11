
import { WorkOrderService } from "@/services/workOrder/WorkOrderService";
import { PhaseProgressItem, RecentWorkOrder } from "@/types/dashboard";

const workOrderService = new WorkOrderService();

export const getPhaseProgress = async (): Promise<PhaseProgressItem[]> => {
  try {
    const workOrders = await workOrderService.getAllWorkOrders();
    
    // Filter for work orders that are in progress or pending
    const activeWorkOrders = workOrders.filter(order => 
      ['in-progress', 'in_progress', 'pending'].includes(order.status || '')
    );

    if (activeWorkOrders.length === 0) return [];

    // Convert real work orders to phase progress format
    return activeWorkOrders.map((order) => ({
      id: order.id,
      name: order.description || `Work Order ${order.id.slice(0, 8)}`,
      totalPhases: 4,
      completedPhases: order.status === 'in-progress' || order.status === 'in_progress' ? 2 : 1,
      progress: order.status === 'in-progress' || order.status === 'in_progress' ? 50 : 25
    }));
  } catch (error) {
    console.error("Error fetching phase progress:", error);
    return [];
  }
};

export const getRecentWorkOrders = async (): Promise<RecentWorkOrder[]> => {
  try {
    console.log("Starting to fetch recent work orders from service...");
    
    const workOrders = await workOrderService.getAllWorkOrders();
    console.log("Raw work orders from service:", workOrders?.length || 0);

    if (!workOrders || workOrders.length === 0) {
      console.log("No work orders found in service");
      return [];
    }

    // Take the 10 most recent work orders
    const recentOrders = workOrders.slice(0, 10);

    const formattedOrders = recentOrders.map(order => {
      console.log("Processing work order:", order.id);
      
      const customerName = order.customer_name || 
        (order.customer_first_name && order.customer_last_name 
          ? `${order.customer_first_name} ${order.customer_last_name}`.trim()
          : 'Unknown Customer');

      const formattedOrder: RecentWorkOrder = {
        id: order.id,
        customer: customerName,
        service: order.service_type || order.description || 'Service',
        status: order.status || 'pending',
        date: order.created_at ? new Date(order.created_at).toLocaleDateString() : '',
        priority: order.priority || 'medium',
        equipmentName: (order as any).equipment_name,
        assetNumber: (order as any).asset_number
      };
      
      console.log("Formatted work order:", formattedOrder);
      return formattedOrder;
    });

    console.log("Final formatted work orders:", formattedOrders.length);
    return formattedOrders;
  } catch (error) {
    console.error("Error fetching recent work orders:", error);
    return [];
  }
};
