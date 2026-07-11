
import { useUserRoles } from '@/hooks/useUserRoles';

export interface RoutePermission {
  path: string;
  allowedRoles?: string[];
  requireOwner?: boolean;
  requireAdmin?: boolean;
}

export const routePermissions: RoutePermission[] = [
  // Admin/Developer only routes
  { path: '/developer', requireAdmin: true },
  { path: '/security', requireAdmin: true },
  
  // Manager/Admin routes
  { path: '/team', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/company-profile', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/settings', allowedRoles: ['admin', 'manager', 'owner'] },
  { path: '/settings/role-permissions', requireAdmin: true },
  { path: '/settings/user-permissions', requireAdmin: true },
  { path: '/settings/navigation', allowedRoles: ['owner', 'manager'] },
  { path: '/reports', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/forms', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/ai-hub', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/training-overview', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  
  // Marketing and Communications
  { path: '/email-campaigns', allowedRoles: ['admin', 'manager', 'service_advisor', 'owner'] },
  { path: '/email-sequences', allowedRoles: ['admin', 'manager', 'service_advisor', 'owner'] },
  { path: '/email-templates', allowedRoles: ['admin', 'manager', 'service_advisor', 'owner'] },
  { path: '/sms-management', allowedRoles: ['admin', 'manager', 'service_advisor', 'owner'] },
  { path: '/sms-templates', allowedRoles: ['admin', 'manager', 'service_advisor', 'owner'] },
  { path: '/customer-comms', allowedRoles: ['admin', 'manager', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'owner'] },
  
  // Technician Portal
  { path: '/technician-portal', allowedRoles: ['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner'] },
  
  // Staff accessible routes
  { path: '/work-orders', allowedRoles: ['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/daily-logs', allowedRoles: ['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/customers', allowedRoles: ['admin', 'manager', 'technician', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/calendar', allowedRoles: ['admin', 'manager', 'technician', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/analytics', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/chat', allowedRoles: ['admin', 'manager', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/insurance', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  
  // Inventory Management
  { path: '/inventory', allowedRoles: ['admin', 'manager', 'technician', 'inventory_manager', 'parts_manager', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/inventory/manager', allowedRoles: ['admin', 'manager', 'inventory_manager', 'parts_manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/inventory/add', allowedRoles: ['admin', 'manager', 'technician', 'inventory_manager', 'parts_manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/inventory/categories', allowedRoles: ['admin', 'manager', 'inventory_manager', 'parts_manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/inventory/suppliers', allowedRoles: ['admin', 'manager', 'inventory_manager', 'parts_manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/inventory/locations', allowedRoles: ['admin', 'manager', 'inventory_manager', 'parts_manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/inventory/orders', allowedRoles: ['admin', 'manager', 'inventory_manager', 'parts_manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/inventory/item', allowedRoles: ['admin', 'manager', 'technician', 'inventory_manager', 'parts_manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/inventory-analytics', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/inventory-manager', allowedRoles: ['admin', 'manager', 'inventory_manager', 'parts_manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/mobile-inventory', allowedRoles: ['admin', 'manager', 'technician', 'inventory_manager', 'parts_manager', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/consumption-tracking', allowedRoles: ['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/asset-usage', allowedRoles: ['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  
  // Operations
  { path: '/quotes', allowedRoles: ['admin', 'manager', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/invoices', allowedRoles: ['admin', 'manager', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/payments', allowedRoles: ['admin', 'manager', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/service-board', allowedRoles: ['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  
  // Equipment Management
  { path: '/equipment-management', allowedRoles: ['admin', 'manager', 'technician', 'deckhand', 'captain', 'mate', 'chief_engineer', 'marine_engineer', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/equipment', allowedRoles: ['admin', 'manager', 'technician', 'deckhand', 'captain', 'mate', 'chief_engineer', 'marine_engineer', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/equipment-tracking', allowedRoles: ['admin', 'manager', 'technician', 'deckhand', 'captain', 'mate', 'chief_engineer', 'marine_engineer', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/fleet-management', allowedRoles: ['admin', 'manager', 'captain', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/maintenance-requests', allowedRoles: ['admin', 'manager', 'technician', 'deckhand', 'captain', 'mate', 'chief_engineer', 'marine_engineer', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/maintenance-planning', allowedRoles: ['admin', 'manager', 'captain', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/service-packages', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/vehicles', allowedRoles: ['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner'] },
  
  // Services
  { path: '/services', allowedRoles: ['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/service-editor', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/repair-plans', allowedRoles: ['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner'] },
  
  // Documents
  { path: '/documents', allowedRoles: ['admin', 'manager', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'owner'] },
  
  // Safety & Compliance
  { path: '/safety/certifications', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/safety/schedules', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/safety/documents', allowedRoles: ['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/safety/incidents', allowedRoles: ['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/safety/inspections', allowedRoles: ['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/safety/dvir', allowedRoles: ['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/safety/equipment', allowedRoles: ['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/safety/reports', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/safety/corrective-actions', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/safety/near-miss', allowedRoles: ['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/safety/training', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/safety/meetings', allowedRoles: ['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/safety/jsa', allowedRoles: ['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/safety/ppe', allowedRoles: ['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  { path: '/safety', allowedRoles: ['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'owner'] },
  
  // Feedback
  { path: '/feedback', allowedRoles: ['admin', 'manager', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner'] },
  
  // Scheduling
  { path: '/scheduling', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  
  // Planning
  { path: '/planner', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  { path: '/projects', allowedRoles: ['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'] },
  
  // Call Logger
  { path: '/call-logger', allowedRoles: ['admin', 'manager', 'service_advisor', 'reception', 'owner'] },
  
  // Public staff routes (all authenticated users)
  { path: '/dashboard', allowedRoles: [] }, // No specific roles required
  { path: '/help', allowedRoles: [] },
  { path: '/service-reminders', allowedRoles: [] },
  { path: '/profile', allowedRoles: [] },
  { path: '/notifications', allowedRoles: [] },
  { path: '/timesheet', allowedRoles: [] },
  { path: '/shopping', allowedRoles: [] },
  { path: '/wishlist', allowedRoles: [] },
  { path: '/orders', allowedRoles: [] },
  { path: '/customer-portal', allowedRoles: [] },
  { path: '/feature-requests', allowedRoles: [] },
  
  // Septic Services Module
  { path: '/septic', allowedRoles: ['admin', 'manager', 'technician', 'service_advisor', 'owner'] },
  
  // Export Company Module
  { path: '/export', allowedRoles: ['admin', 'manager', 'technician', 'service_advisor', 'owner'] },
  
  // Personal Trainer Module
  { path: '/personal-trainer', allowedRoles: ['admin', 'manager', 'technician', 'service_advisor', 'owner'] },
  
  // Game Development Module
  { path: '/game-development', allowedRoles: ['admin', 'manager', 'technician', 'service_advisor', 'owner'] },
];

export function hasRoutePermission(path: string, userRoles: string[]): boolean {
  const permission = routePermissions.find(p => path.startsWith(p.path));
  
  if (!permission) {
    return true; // No specific permission required
  }
  
  // Check if user has required roles
  if (permission.allowedRoles && permission.allowedRoles.length > 0) {
    return permission.allowedRoles.some(role => userRoles.includes(role));
  }
  
  // Check owner/admin requirements
  if (permission.requireOwner) {
    return userRoles.includes('owner');
  }
  
  if (permission.requireAdmin) {
    return userRoles.includes('admin') || userRoles.includes('owner');
  }
  
  return true;
}

export function useRoutePermission(path: string) {
  const { data: userRoles = [] } = useUserRoles();
  return hasRoutePermission(path, userRoles);
}
