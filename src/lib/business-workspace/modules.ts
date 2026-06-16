// Module registry for the per-business workspace.
// Each business_kind (businesses.type_slug) maps to an ordered list of module ids
// that appear in the workspace sidebar.
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Radio,
  Truck,
  Users,
  Package,
  CalendarRange,
  ListChecks,
  BarChart3,
  Settings,
  Receipt,
  Wrench,
} from "lucide-react";

export type WorkspaceModuleId =
  | "overview"
  | "dispatch"
  | "fleet"
  | "staff"
  | "inventory"
  | "listings"
  | "bookings"
  | "analytics"
  | "billing"
  | "settings"
  | "rates";

export type WorkspaceModule = {
  id: WorkspaceModuleId;
  label: string;
  icon: LucideIcon;
  path: (businessId: string) => string;
  /** Roles allowed to see this module in the sidebar. Owner is always allowed. */
  roles?: Array<"owner" | "manager" | "dispatcher" | "driver" | "mechanic" | "clerk">;
};

export const MODULES: Record<WorkspaceModuleId, WorkspaceModule> = {
  overview: {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    path: (id) => `/dashboard/business/${id}`,
  },
  dispatch: {
    id: "dispatch",
    label: "Dispatch",
    icon: Radio,
    path: (id) => `/dashboard/business/${id}/dispatch`,
  },
  fleet: {
    id: "fleet",
    label: "Fleet & assets",
    icon: Truck,
    path: (id) => `/dashboard/business/${id}/fleet`,
  },
  staff: {
    id: "staff",
    label: "Employees",
    icon: Users,
    path: (id) => `/dashboard/business/${id}/staff`,
    roles: ["owner", "manager"],
  },
  inventory: {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    path: (id) => `/dashboard/business/${id}/inventory`,
  },
  listings: {
    id: "listings",
    label: "Listings",
    icon: ListChecks,
    path: (id) => `/dashboard/business/${id}/listings`,
  },
  bookings: {
    id: "bookings",
    label: "Bookings",
    icon: CalendarRange,
    path: (id) => `/dashboard/business/${id}/bookings`,
  },
  analytics: {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    path: (id) => `/dashboard/business/${id}/analytics`,
  },
  rates: {
    id: "rates",
    label: "Rates & coverage",
    icon: Wrench,
    path: (id) => `/dashboard/business/${id}/rates`,
  },
  billing: {
    id: "billing",
    label: "Billing",
    icon: Receipt,
    path: (id) => `/dashboard/business/${id}/billing`,
  },
  settings: {
    id: "settings",
    label: "Settings",
    icon: Settings,
    path: (id) => `/dashboard/business/${id}/settings`,
    roles: ["owner", "manager"],
  },
};

const COMMON_END: WorkspaceModuleId[] = ["settings"];

/** Map a business_kind (businesses.type_slug) to its ordered sidebar modules.
 *  Only modules with implemented routes are listed; more will appear as they ship. */
export function modulesForKind(kind: string | null | undefined): WorkspaceModule[] {
  const k = (kind || "other").toLowerCase();
  let ids: WorkspaceModuleId[];
  switch (k) {
    case "towing":
      ids = ["overview", "dispatch", "fleet", "staff", "inventory", ...COMMON_END];
      break;
    case "repair_shop":
    case "body_paint":
    case "tire_shop":
    case "battery_shop":
    case "carwash":
    case "audio_tint":
    case "inspection":
      ids = ["overview", "staff", "inventory", ...COMMON_END];
      break;
    case "parts_accessories":
    case "accessories":
      ids = ["overview", "inventory", "staff", ...COMMON_END];
      break;
    case "dealership":
    case "used_dealership":
    case "motorcycle_shop":
    case "rental":
      ids = ["overview", "fleet", "staff", ...COMMON_END];
      break;
    default:
      ids = ["overview", "staff", ...COMMON_END];
  }
  return ids.map((id) => MODULES[id]);
}

export const KIND_LANDING_BLURB: Record<string, string> = {
  towing:
    "Your tow & roadside command center: incoming jobs, dispatched trucks, drivers on shift, and fleet status.",
  repair_shop: "Bay schedule, customer bookings, staff, and parts inventory.",
  parts_accessories: "Inventory levels, top-selling SKUs, and online listings.",
  dealership: "Live inventory, leads, and team performance.",
};
