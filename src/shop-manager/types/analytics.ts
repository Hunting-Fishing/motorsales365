export interface AnalyticsOverview {
  totalRevenue: number;
  totalWorkOrders: number;
  activeCustomers: number;
  avgOrderValue: number;
  revenueChange: number;
  workOrderChange: number;
  customerChange: number;
  avgOrderChange: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface WorkOrderDataPoint {
  status: string;
  count: number;
}

export interface CustomerDataPoint {
  name: string;
  value: number;
}

export interface PerformanceMetric {
  label: string;
  value: number;
  target: number;
}

export interface TopProductAnalytics {
  id: string;
  name: string;
  category: string;
  count: number;
  percentage: number;
  views?: number;
  clicks?: number;
  saves?: number;
  shares?: number;
}

export interface CategoryAnalytics {
  name: string;
  count: number;
}

export interface ProductAnalyticsData {
  totalViews: number;
  totalClicks: number;
  totalSaved: number;
  conversionRate: number;
  categoryData: CategoryAnalytics[];
  interactionData: {
    name: string;
    views: number;
    clicks: number;
    saves: number;
    shares: number;
  }[];
}

export interface AnalyticsData {
  overview: AnalyticsOverview;
  revenue: RevenueDataPoint[];
  workOrders: WorkOrderDataPoint[];
  customers: CustomerDataPoint[];
  performance: PerformanceMetric[] | null;
}