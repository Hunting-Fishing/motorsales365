
import { PermissionSet } from "@/types/permissions";

// Default permissions structure
export const defaultPermissions: PermissionSet = {
  workOrders: {
    view: true,
    create: false,
    edit: false,
    delete: false,
    assign: false,
  },
  inventory: {
    view: true,
    create: false,
    edit: false,
    delete: false,
  },
  invoices: {
    view: true,
    create: false,
    edit: false,
    delete: false,
  },
  customers: {
    view: true,
    create: false,
    edit: false,
    delete: false,
  },
  team: {
    view: false,
    create: false,
    edit: false,
    delete: false,
  },
  reports: {
    view: false,
    generate: false,
  },
  settings: {
    view: false,
    edit: false,
  },
};

// Permission presets for different roles
export const permissionPresets: Record<string, PermissionSet> = {
  Owner: {
    ...defaultPermissions,
    workOrders: { view: true, create: true, edit: true, delete: true, assign: true },
    inventory: { view: true, create: true, edit: true, delete: true },
    invoices: { view: true, create: true, edit: true, delete: true },
    customers: { view: true, create: true, edit: true, delete: true },
    team: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, generate: true },
    settings: { view: true, edit: true },
  },
  Administrator: {
    ...defaultPermissions,
    workOrders: { view: true, create: true, edit: true, delete: true, assign: true },
    inventory: { view: true, create: true, edit: true, delete: false },
    invoices: { view: true, create: true, edit: true, delete: false },
    customers: { view: true, create: true, edit: true, delete: false },
    team: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, generate: true },
    settings: { view: true, edit: false },
  },
  Technician: {
    ...defaultPermissions,
    workOrders: { view: true, create: true, edit: true, delete: false, assign: false },
    inventory: { view: true, create: false, edit: false, delete: false },
    invoices: { view: true, create: true, edit: false, delete: false },
    customers: { view: true, create: false, edit: false, delete: false },
  },
  "Customer Service": {
    ...defaultPermissions,
    workOrders: { view: true, create: true, edit: true, delete: false, assign: false },
    customers: { view: true, create: true, edit: true, delete: false },
    invoices: { view: true, create: true, edit: false, delete: false },
  },
};
