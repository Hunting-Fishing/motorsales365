// Add this type if it doesn't exist in the file
export interface MonthlyRevenueData {
  date: string;
  revenue: number;
}

// Make sure these types exist or add them
export interface ServiceTypeData {
  name: string;
  value: number;
}

export interface DashboardStats {
  revenue: number;
  activeOrders: number;
  customers: number;
  lowStockParts: number;
  activeWorkOrders: string;
  workOrderChange: string;
  teamMembers: string;
  teamChange: string;
  inventoryItems: string;
  inventoryChange: string;
  avgCompletionTime: string;
  completionTimeChange: string;
  customerSatisfaction: string;
  phaseCompletionRate: string;
  schedulingEfficiency: string;
  qualityControlPassRate: string;
}

export interface PhaseProgressItem {
  id: string;
  name: string;
  totalPhases: number;
  completedPhases: number;
  progress: number;
}

export interface RecentWorkOrder {
  id: string;
  customer: string;
  service: string;
  status: string;
  date: string;
  priority: string;
  equipmentName?: string;
  assetNumber?: string;
}

export interface ChecklistStat {
  work_order_id: string;
  checklist_id: string;
  requiredItems: number;
  completedRequiredItems: number;
  completionRate: number;
}

export interface TechnicianEfficiencyData {
  id: string;
  name: string;
  totalHours: number;
  billableHours: number;
  efficiency: number;
}

export interface TechnicianPerformance {
  month: string;
  [technicianName: string]: number | string;
}

export interface TechnicianPerformanceData {
  technicians: string[];
  chartData: TechnicianPerformance[];
}

export interface EquipmentRecommendation {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  status: string;
  maintenanceType: string;
  maintenanceDate: string;
  priority: "High" | "Medium" | "Low";
}

// Re-export from revenueService if needed
export * from "../services/dashboard/revenueService";
