// Default permission templates for all roles
// These define what each role can do in plain English and map to actual permissions

export type PermissionCategory = 
  | 'operations' 
  | 'assets' 
  | 'financial' 
  | 'customers' 
  | 'admin';

export type AccessLevel = 'full' | 'standard' | 'limited' | 'view-only' | 'none';

export interface RolePermissionTemplate {
  role: string;
  displayName: string;
  description: string;
  category: 'management' | 'marine' | 'field' | 'office';
  accessLevel: AccessLevel;
  capabilities: string[];
  restrictions: string[];
  permissions: {
    operations: AccessLevel;
    assets: AccessLevel;
    financial: AccessLevel;
    customers: AccessLevel;
    admin: AccessLevel;
  };
}

export const rolePermissionDefaults: Record<string, RolePermissionTemplate> = {
  // Management Roles
  owner: {
    role: 'owner',
    displayName: 'Owner',
    description: 'Business owner with full system access',
    category: 'management',
    accessLevel: 'full',
    capabilities: [
      'Full access to all features',
      'Can manage billing and subscriptions',
      'Can modify system settings',
      'Can manage all team members',
      'Can view all financial reports',
      'Can delete any records'
    ],
    restrictions: [],
    permissions: {
      operations: 'full',
      assets: 'full',
      financial: 'full',
      customers: 'full',
      admin: 'full'
    }
  },
  
  admin: {
    role: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access with most permissions',
    category: 'management',
    accessLevel: 'full',
    capabilities: [
      'Can create and assign work orders',
      'Can manage inventory and equipment',
      'Can view and create invoices',
      'Can manage customer records',
      'Can view team members',
      'Can generate reports'
    ],
    restrictions: [
      'Cannot access billing settings',
      'Cannot delete team members',
      'Cannot modify system settings'
    ],
    permissions: {
      operations: 'full',
      assets: 'full',
      financial: 'standard',
      customers: 'full',
      admin: 'limited'
    }
  },

  manager: {
    role: 'manager',
    displayName: 'Manager',
    description: 'Operations manager with work order and team oversight',
    category: 'management',
    accessLevel: 'standard',
    capabilities: [
      'Can create and assign work orders',
      'Can view inventory levels',
      'Can view team performance',
      'Can generate operational reports',
      'Can manage customer appointments'
    ],
    restrictions: [
      'Cannot delete work orders',
      'Cannot modify inventory',
      'Cannot access financial settings',
      'Limited team management'
    ],
    permissions: {
      operations: 'full',
      assets: 'standard',
      financial: 'view-only',
      customers: 'standard',
      admin: 'limited'
    }
  },

  // Marine Roles
  captain: {
    role: 'captain',
    displayName: 'Captain',
    description: 'Licensed vessel commander',
    category: 'marine',
    accessLevel: 'standard',
    capabilities: [
      'Can create work orders for assigned vessels',
      'Can view and update vessel equipment status',
      'Can log crew time and activities',
      'Can view vessel maintenance history',
      'Can access safety and inspection records'
    ],
    restrictions: [
      'Limited to assigned vessel(s)',
      'Cannot access financial records',
      'Cannot manage other team members'
    ],
    permissions: {
      operations: 'standard',
      assets: 'standard',
      financial: 'none',
      customers: 'view-only',
      admin: 'none'
    }
  },

  mate: {
    role: 'mate',
    displayName: 'Mate (First/Second)',
    description: 'Licensed deck officer',
    category: 'marine',
    accessLevel: 'standard',
    capabilities: [
      'Can view and update vessel work orders',
      'Can log activities and time',
      'Can view equipment status',
      'Can access vessel documentation'
    ],
    restrictions: [
      'Cannot create new work orders',
      'Limited to assigned vessel(s)',
      'Cannot access financial records'
    ],
    permissions: {
      operations: 'limited',
      assets: 'limited',
      financial: 'none',
      customers: 'none',
      admin: 'none'
    }
  },

  chief_engineer: {
    role: 'chief_engineer',
    displayName: 'Chief Engineer',
    description: 'Lead engineering officer for vessel systems',
    category: 'marine',
    accessLevel: 'standard',
    capabilities: [
      'Full access to equipment maintenance',
      'Can create and manage work orders',
      'Can requisition parts and supplies',
      'Can view technical documentation',
      'Can schedule maintenance'
    ],
    restrictions: [
      'Limited to engineering operations',
      'Cannot access financial reports'
    ],
    permissions: {
      operations: 'full',
      assets: 'full',
      financial: 'none',
      customers: 'none',
      admin: 'none'
    }
  },

  marine_engineer: {
    role: 'marine_engineer',
    displayName: 'Marine Engineer',
    description: 'Engineering crew member',
    category: 'marine',
    accessLevel: 'limited',
    capabilities: [
      'Can update assigned work orders',
      'Can view equipment manuals',
      'Can log maintenance activities',
      'Can request parts'
    ],
    restrictions: [
      'Cannot create work orders',
      'Limited equipment access',
      'Cannot access financial data'
    ],
    permissions: {
      operations: 'limited',
      assets: 'limited',
      financial: 'none',
      customers: 'none',
      admin: 'none'
    }
  },

  boson: {
    role: 'boson',
    displayName: 'Bosun',
    description: 'Deck crew supervisor',
    category: 'marine',
    accessLevel: 'limited',
    capabilities: [
      'Can supervise deck crew',
      'Can view equipment status',
      'Can log crew activities',
      'Can update work order progress'
    ],
    restrictions: [
      'Cannot create work orders',
      'Limited to deck operations',
      'Cannot access administrative features'
    ],
    permissions: {
      operations: 'limited',
      assets: 'view-only',
      financial: 'none',
      customers: 'none',
      admin: 'none'
    }
  },

  deckhand: {
    role: 'deckhand',
    displayName: 'Deckhand',
    description: 'Entry level marine crew member',
    category: 'marine',
    accessLevel: 'view-only',
    capabilities: [
      'Can view assigned work orders',
      'Can log time on tasks',
      'Can view vessel schedules'
    ],
    restrictions: [
      'Cannot create or modify work orders',
      'View-only access to most features',
      'Cannot access equipment settings'
    ],
    permissions: {
      operations: 'view-only',
      assets: 'view-only',
      financial: 'none',
      customers: 'none',
      admin: 'none'
    }
  },

  // Field Service Roles
  technician: {
    role: 'technician',
    displayName: 'Technician',
    description: 'Service technician for repairs and maintenance',
    category: 'field',
    accessLevel: 'standard',
    capabilities: [
      'Can update assigned work orders',
      'Can view parts inventory',
      'Can log time and materials',
      'Can create service notes',
      'Can access technical documentation'
    ],
    restrictions: [
      'Cannot create work orders',
      'Cannot modify inventory',
      'Cannot access financial data'
    ],
    permissions: {
      operations: 'standard',
      assets: 'view-only',
      financial: 'none',
      customers: 'view-only',
      admin: 'none'
    }
  },

  service_advisor: {
    role: 'service_advisor',
    displayName: 'Service Advisor',
    description: 'Customer-facing service coordinator',
    category: 'office',
    accessLevel: 'standard',
    capabilities: [
      'Can create and manage work orders',
      'Can manage customer records',
      'Can schedule appointments',
      'Can create estimates and invoices',
      'Can communicate with customers'
    ],
    restrictions: [
      'Cannot delete work orders',
      'Cannot modify inventory',
      'Limited financial access'
    ],
    permissions: {
      operations: 'full',
      assets: 'view-only',
      financial: 'limited',
      customers: 'full',
      admin: 'none'
    }
  },

  // Office Roles
  reception: {
    role: 'reception',
    displayName: 'Reception',
    description: 'Front desk and customer check-in',
    category: 'office',
    accessLevel: 'limited',
    capabilities: [
      'Can check in customers',
      'Can schedule appointments',
      'Can view work order status',
      'Can update customer contact info'
    ],
    restrictions: [
      'Cannot create work orders',
      'View-only access to most features',
      'Cannot access financial data'
    ],
    permissions: {
      operations: 'view-only',
      assets: 'none',
      financial: 'none',
      customers: 'limited',
      admin: 'none'
    }
  },

  parts_manager: {
    role: 'parts_manager',
    displayName: 'Parts Manager',
    description: 'Inventory and parts management',
    category: 'office',
    accessLevel: 'standard',
    capabilities: [
      'Full access to inventory management',
      'Can create purchase orders',
      'Can manage suppliers',
      'Can view parts usage reports',
      'Can adjust inventory levels'
    ],
    restrictions: [
      'Limited work order access',
      'Cannot access payroll data'
    ],
    permissions: {
      operations: 'limited',
      assets: 'full',
      financial: 'limited',
      customers: 'view-only',
      admin: 'none'
    }
  },

  other_staff: {
    role: 'other_staff',
    displayName: 'Other Staff',
    description: 'General staff member with basic access',
    category: 'office',
    accessLevel: 'limited',
    capabilities: [
      'Can view assigned tasks',
      'Can log time',
      'Can view basic schedules'
    ],
    restrictions: [
      'Limited access to most features',
      'Cannot modify records',
      'View-only permissions'
    ],
    permissions: {
      operations: 'view-only',
      assets: 'view-only',
      financial: 'none',
      customers: 'view-only',
      admin: 'none'
    }
  }
};

// Helper to get permission badges for UI display
export function getPermissionBadges(role: string): Array<{ label: string; allowed: boolean }> {
  const template = rolePermissionDefaults[role];
  if (!template) return [];

  const { permissions } = template;
  
  return [
    { label: 'Work Orders', allowed: permissions.operations !== 'none' },
    { label: 'Equipment', allowed: permissions.assets !== 'none' },
    { label: 'Customers', allowed: permissions.customers !== 'none' },
    { label: 'Financial', allowed: permissions.financial !== 'none' },
    { label: 'Settings', allowed: permissions.admin !== 'none' }
  ];
}

// Helper to get role category display info
export const roleCategoryInfo = {
  management: {
    label: 'Management',
    description: 'Leadership and administrative roles',
    icon: '👔'
  },
  marine: {
    label: 'Marine Crew',
    description: 'Vessel operations and marine staff',
    icon: '⚓'
  },
  field: {
    label: 'Field Service',
    description: 'Technical and service staff',
    icon: '🔧'
  },
  office: {
    label: 'Office & Admin',
    description: 'Administrative and support staff',
    icon: '🏢'
  }
};
