
// Define permission types
export type ModuleAction = {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  assign?: boolean;
  generate?: boolean;
};

export type PermissionSet = {
  workOrders: ModuleAction & { assign: boolean };
  inventory: ModuleAction;
  invoices: ModuleAction;
  customers: ModuleAction;
  team: ModuleAction;
  reports: ModuleAction & { generate: boolean };
  settings: ModuleAction;
};

export type RolePreset = "Owner" | "Administrator" | "Technician" | "Customer Service";
