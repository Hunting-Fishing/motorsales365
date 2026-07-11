/**
 * Centralized permission module definitions
 * This file defines all modules that can have permissions assigned
 */

export interface PermissionModule {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'operations' | 'marketing' | 'tools' | 'admin';
}

/**
 * Complete list of all permission modules in the system
 * Each module corresponds to a major feature area that requires access control
 */
export const PERMISSION_MODULES: PermissionModule[] = [
  // Core Operations
  {
    id: 'work_orders',
    name: 'Work Orders',
    description: 'Create, view, edit, and delete work orders',
    category: 'core'
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Manage inventory, stock levels, and parts',
    category: 'core'
  },
  {
    id: 'customers',
    name: 'Customers',
    description: 'Manage customer database and information',
    category: 'core'
  },
  
  // Equipment & Assets
  {
    id: 'equipment_tracking',
    name: 'Equipment Management',
    description: 'Track and manage equipment, tools, and assets',
    category: 'operations'
  },
  {
    id: 'fleet_management',
    name: 'Fleet Management',
    description: 'Manage company vehicles and fleet operations',
    category: 'operations'
  },
  {
    id: 'insurance',
    name: 'Insurance',
    description: 'Fleet and equipment insurance management',
    category: 'operations'
  },
  {
    id: 'maintenance_requests',
    name: 'Maintenance Requests',
    description: 'View and manage maintenance requests',
    category: 'operations'
  },
  
  // Safety & Compliance
  {
    id: 'safety',
    name: 'Safety & Compliance',
    description: 'Safety inspections, incidents, certifications, and compliance',
    category: 'operations'
  },
  
  // Financial Operations
  {
    id: 'quotes',
    name: 'Quotes',
    description: 'Create and manage customer quotes',
    category: 'operations'
  },
  {
    id: 'invoices',
    name: 'Invoices',
    description: 'Create, send, and manage invoices',
    category: 'operations'
  },
  {
    id: 'payments',
    name: 'Payments',
    description: 'Process and manage payments',
    category: 'operations'
  },
  {
    id: 'accounting',
    name: 'Accounting',
    description: 'Access accounting features and financial reports',
    category: 'operations'
  },
  
  // Scheduling & Planning
  {
    id: 'calendar',
    name: 'Calendar & Scheduling',
    description: 'Schedule appointments and manage calendar',
    category: 'operations'
  },
  {
    id: 'service_reminders',
    name: 'Service Reminders',
    description: 'Manage automated service reminders',
    category: 'operations'
  },
  
  // Marketing & Communications
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Email campaigns, sequences, and marketing tools',
    category: 'marketing'
  },
  {
    id: 'email_campaigns',
    name: 'Email Campaigns',
    description: 'Create and manage email marketing campaigns',
    category: 'marketing'
  },
  {
    id: 'sms_management',
    name: 'SMS Management',
    description: 'Send SMS messages and manage templates',
    category: 'marketing'
  },
  {
    id: 'customer_communications',
    name: 'Customer Communications',
    description: 'Customer messaging and communication tools',
    category: 'marketing'
  },
  
  // Internal Tools
  {
    id: 'team_chat',
    name: 'Team Chat',
    description: 'Internal team messaging and collaboration',
    category: 'tools'
  },
  {
    id: 'call_logger',
    name: 'Call Logger',
    description: 'Log and track customer calls',
    category: 'tools'
  },
  {
    id: 'documents',
    name: 'Documents',
    description: 'Document management and file storage',
    category: 'tools'
  },
  
  // Analytics & Reporting
  {
    id: 'reports',
    name: 'Reports',
    description: 'Generate and view business reports',
    category: 'tools'
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Access analytics dashboards and insights',
    category: 'tools'
  },
  
  // Administration
  {
    id: 'team',
    name: 'Team Management',
    description: 'Manage team members, roles, and permissions',
    category: 'admin'
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Access system settings and configuration',
    category: 'admin'
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Security settings and access control',
    category: 'admin'
  },
  {
    id: 'developer_tools',
    name: 'Developer Tools',
    description: 'API access and developer features',
    category: 'admin'
  },
  
  // Service Management
  {
    id: 'service_catalog',
    name: 'Service Catalog',
    description: 'Manage service offerings and catalog',
    category: 'operations'
  },
  {
    id: 'service_packages',
    name: 'Service Packages',
    description: 'Create and manage service packages',
    category: 'operations'
  },
  
  // E-commerce
  {
    id: 'shopping',
    name: 'Shopping/Store',
    description: 'Access online store and shopping features',
    category: 'operations'
  },
  {
    id: 'orders',
    name: 'Order Management',
    description: 'Manage customer orders',
    category: 'operations'
  },
  
  // Septic Services
  {
    id: 'septic',
    name: 'Septic Services',
    description: 'Septic pumping, inspections, tank management, and compliance',
    category: 'operations'
  },
  
  // Export Company
  {
    id: 'export_company',
    name: 'Export Company',
    description: 'Vehicle export operations, logistics, customs, and compliance',
    category: 'operations'
  }
];

/**
 * Get modules by category
 */
export function getModulesByCategory(category: PermissionModule['category']): PermissionModule[] {
  return PERMISSION_MODULES.filter(module => module.category === category);
}

/**
 * Get module by ID
 */
export function getModuleById(id: string): PermissionModule | undefined {
  return PERMISSION_MODULES.find(module => module.id === id);
}

/**
 * Module categories with labels
 */
export const MODULE_CATEGORIES = [
  { id: 'core', label: 'Core Operations', description: 'Essential business operations' },
  { id: 'operations', label: 'Operations', description: 'Day-to-day operational features' },
  { id: 'marketing', label: 'Marketing & Communications', description: 'Marketing and customer outreach' },
  { id: 'tools', label: 'Tools & Analytics', description: 'Supporting tools and analytics' },
  { id: 'admin', label: 'Administration', description: 'Administrative and security features' }
] as const;
