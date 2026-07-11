// Maritime role permission presets for vessel operations

export type ModulePermissions = {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
};

export type MaritimeRolePermissions = {
  work_orders: ModulePermissions;
  inventory: ModulePermissions;
  equipment_tracking: ModulePermissions;
  customers: ModulePermissions;
  accounting: ModulePermissions;
  team: ModulePermissions;
  reports: ModulePermissions;
};

export const maritimePermissionPresets: Record<string, MaritimeRolePermissions> = {
  deckhand: {
    work_orders: { view: true, create: false, edit: false, delete: false },
    inventory: { view: true, create: false, edit: false, delete: false }, // Only their assigned vessel
    equipment_tracking: { view: true, create: true, edit: false, delete: false }, // Can log hours/inspections
    customers: { view: false, create: false, edit: false, delete: false },
    accounting: { view: false, create: false, edit: false, delete: false },
    team: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
  },
  captain: {
    work_orders: { view: true, create: true, edit: true, delete: false },
    inventory: { view: true, create: true, edit: true, delete: false }, // Only their assigned vessel
    equipment_tracking: { view: true, create: true, edit: true, delete: false },
    customers: { view: true, create: false, edit: false, delete: false },
    accounting: { view: false, create: false, edit: false, delete: false }, // No access to company accounting
    team: { view: true, create: false, edit: false, delete: false }, // Can view crew
    reports: { view: true, create: false, edit: false, delete: false }, // View vessel reports
  },
  mate: {
    work_orders: { view: true, create: true, edit: true, delete: false },
    inventory: { view: true, create: false, edit: false, delete: false }, // Only their assigned vessel
    equipment_tracking: { view: true, create: true, edit: true, delete: false },
    customers: { view: true, create: false, edit: false, delete: false },
    accounting: { view: false, create: false, edit: false, delete: false },
    team: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
  },
  chief_engineer: {
    work_orders: { view: true, create: true, edit: true, delete: false },
    inventory: { view: true, create: true, edit: true, delete: false },
    equipment_tracking: { view: true, create: true, edit: true, delete: false },
    customers: { view: false, create: false, edit: false, delete: false },
    accounting: { view: false, create: false, edit: false, delete: false },
    team: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, create: true, edit: false, delete: false }, // Can generate maintenance reports
  },
  marine_engineer: {
    work_orders: { view: true, create: true, edit: true, delete: false },
    inventory: { view: true, create: true, edit: false, delete: false },
    equipment_tracking: { view: true, create: true, edit: true, delete: false },
    customers: { view: false, create: false, edit: false, delete: false },
    accounting: { view: false, create: false, edit: false, delete: false },
    team: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
  },
  fishing_master: {
    work_orders: { view: true, create: true, edit: true, delete: false },
    inventory: { view: true, create: true, edit: true, delete: false },
    equipment_tracking: { view: true, create: true, edit: true, delete: false },
    customers: { view: true, create: false, edit: false, delete: false },
    accounting: { view: false, create: false, edit: false, delete: false },
    team: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, create: true, edit: false, delete: false },
  },
};
