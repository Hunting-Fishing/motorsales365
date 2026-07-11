
// Re-export all dashboard service functions from the individual modules
export * from './statsService';
export * from './workOrderService';
export * from './checklistService';
export * from './technicianService';
export * from './equipmentService';
export * from './revenueService';
export * from './calendarService';
export * from './alertsService';

// Export specific functions with their correct names
export { getPhaseProgress } from './workOrderService';
export { getRecentWorkOrders } from './workOrderService';
export { getTechnicianEfficiency, getTechnicianPerformance } from './technicianService';
export { getChecklistStats } from './checklistService';
export { getDashboardAlerts, getWorkOrdersByStatus, getServiceTypeDistribution, getMonthlyRevenue } from './alertsService';
