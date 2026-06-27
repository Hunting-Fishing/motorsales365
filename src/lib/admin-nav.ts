import {
  Settings,
  ListChecks,
  Users,
  CreditCard,
  ShieldCheck,
  Gauge,
  BarChart3,
  UserCog,
  Megaphone,
  QrCode,
  FlaskConical,
  Store,
  Sparkles,
  Inbox,
  Shield,
  GraduationCap,
  AlertTriangle,
  MapPin,
  Truck,
  Globe,
  type LucideIcon,
} from "lucide-react";

export type AdminNavRole = "admin" | "sales" | "moderator" | "support" | "advertising";

export type AdminNavItem = {
  to: string;
  label: string;
  Icon: LucideIcon;
  exact?: boolean;
  roles: AdminNavRole[];
  /** Optional permission key for runtime, no-redeploy gating. Falls back to `roles` when absent. */
  permissionKey?: string;
  info: string;
  section?: string;
  external?: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  {
    to: "/admin",
    label: "Overview",
    Icon: Settings,
    exact: true,
    roles: ["admin", "sales", "moderator", "support", "advertising"],
    info: "Snapshot of platform health, KPIs and quick links.",
  },

  // SALES & ADVERTISING
  { to: "/admin/sales", label: "Sales Hub", Icon: BarChart3, exact: true, roles: ["admin", "sales", "advertising", "support"], info: "Consolidated sales workspace: overview, accounts, ads, promotions, referrals and QR ads.", section: "Sales & Advertising" },
  { to: "/admin/accounts", label: "Accounts", Icon: UserCog, roles: ["admin", "sales", "support"], info: "Manage customer & business subscriptions: plans, discounts, pause/ban, lifetime spend.", section: "Sales & Advertising" },
  { to: "/admin/analytics", label: "Analytics", Icon: BarChart3, roles: ["admin", "sales", "support"], info: "Traffic, listings, conversions and other platform analytics.", section: "Sales & Advertising" },
  { to: "/admin/advertisements", label: "Advertisements", Icon: Megaphone, roles: ["admin", "advertising", "sales"], info: "Ad inquiries, sponsored campaigns, promotions, QR ads and history — tabbed workspace.", section: "Sales & Advertising" },
  { to: "/admin/shop", label: "Affiliate Shop", Icon: Store, roles: ["admin", "advertising", "sales"], info: "Manage affiliate products, networks and click analytics.", section: "Sales & Advertising" },
  { to: "/admin/referrals", label: "Referrals", Icon: QrCode, roles: ["admin", "sales"], info: "Staff QR codes and redemption history.", section: "Sales & Advertising" },
  { to: "/admin/advertisements/qr-ads", label: "QR Advertisements", Icon: QrCode, roles: ["admin", "sales", "advertising", "support", "moderator"], info: "Your personal QR applied to printable templates (arm band, shirt, banners).", section: "Sales & Advertising" },
  { to: "/admin/qr-leads", label: "QR Leads", Icon: Inbox, roles: ["admin", "sales", "support"], info: "Leads submitted from the QR scan landing page form.", section: "Sales & Advertising" },
  { to: "/admin/lead-offers", label: "Lead Marketplace", Icon: Inbox, roles: ["admin"], info: "Post qualified buyer leads. Featured/Premium businesses pay per unlock.", section: "Sales & Advertising" },
  { to: "/admin/sales-reps", label: "Sales Reps", Icon: UserCog, roles: ["admin"], info: "Manage sales reps, territories and assignments.", section: "Sales & Advertising" },

  // BUSINESSES
  { to: "/admin/businesses", label: "Directory", Icon: Store, roles: ["admin", "moderator"], info: "Approve and moderate the Business directory.", section: "Businesses" },
  { to: "/admin/discover-businesses", label: "Discover", Icon: Store, roles: ["admin", "moderator"], info: "Find, verify and import businesses from Google & Facebook.", section: "Businesses" },
  { to: "/admin/claims", label: "Claims", Icon: ShieldCheck, roles: ["admin", "moderator"], info: "Review claim requests for seeded businesses.", section: "Businesses" },
  { to: "/admin/verifications", label: "Verifications", Icon: ShieldCheck, roles: ["admin", "moderator"], info: "Approve or reject business verification requests.", section: "Businesses" },
  { to: "/admin/type-suggestions", label: "Type suggestions", Icon: Sparkles, roles: ["admin"], info: "Review user-submitted new business types.", section: "Businesses" },
  { to: "/admin/service-suggestions", label: "Service suggestions", Icon: Sparkles, roles: ["admin"], info: "Approve user-submitted services into the shared catalog.", section: "Businesses" },
  { to: "/admin/service-suggestion-audit", label: "Service audit log", Icon: Sparkles, roles: ["admin"], info: "History of decisions on service suggestions.", section: "Businesses" },

  // LISTINGS & MODERATION
  { to: "/admin/listings", label: "Listings", Icon: ListChecks, roles: ["admin", "moderator", "support"], info: "Moderate vehicle/service listings.", section: "Listings & Moderation" },
  { to: "/admin/reports", label: "Activity & Reports", Icon: Inbox, roles: ["admin", "moderator", "support", "sales"], info: "Unified inbox: reports, inquiries, admin audit log.", section: "Listings & Moderation" },
  { to: "/admin/location-corrections", label: "Location fixes", Icon: MapPin, roles: ["admin", "moderator"], info: "User-submitted map pin corrections.", section: "Listings & Moderation" },

  // OPERATIONS
  { to: "/admin/parts", label: "Parts Fulfillment", Icon: Store, roles: ["admin"], info: "In-house parts: catalog, tire specs, buyer quotes, setup checklist.", section: "Operations" },
  { to: "/admin/parts/outreach", label: "Parts Outreach", Icon: Store, roles: ["admin", "sales"], info: "CRM-style call queue for onboarding parts suppliers.", section: "Operations" },
  { to: "/admin/parts/feeds", label: "Product Feeds", Icon: Store, roles: ["admin"], info: "Auto-pull Lazada/Shopee/AliExpress product catalogs (Involve Asia datafeed).", section: "Operations" },
  { to: "/admin/dispatch", label: "365 Dispatch", Icon: Truck, roles: ["admin", "support"], info: "Dispatch subscriptions, live tow-job queue, provider performance.", section: "Operations" },
  { to: "/admin/education", label: "Education", Icon: GraduationCap, roles: ["admin", "moderator"], info: "Courses, modules, lessons, quizzes and Partner Training schools.", section: "Operations" },
  { to: "/admin/flashcards", label: "Flashcards content", Icon: Sparkles, roles: ["admin", "moderator"], info: "Pull the latest 365 Flashcards decks from the upstream GitHub repo.", section: "Operations" },

  // PEOPLE
  { to: "/admin/users", label: "Users", Icon: Users, roles: ["admin"], info: "Create new users (staff or business) and assign roles.", section: "People" },
  { to: "/admin/staff-365", label: "365 Staff", Icon: Shield, roles: ["admin"], info: "Manage @365motorsales.com employees.", section: "People" },

  // PLATFORM
  { to: "/admin/pricing", label: "Pricing & plans", Icon: CreditCard, roles: ["admin"], info: "Subscription plans, listing fees and global pricing settings.", section: "Platform" },
  { to: "/admin/payments", label: "Payments Control", Icon: CreditCard, roles: ["admin"], info: "PH payment methods, manual payments, transaction audit.", section: "Platform" },
  { to: "/admin/currencies", label: "Currencies", Icon: Globe, roles: ["admin"], info: "Currency list, FX rates and auto-update settings.", section: "Platform" },
  { to: "/admin/performance", label: "Performance", Icon: Gauge, roles: ["admin"], info: "Performance flags and image/CDN tuning.", section: "Platform" },
  { to: "/admin/alerts", label: "Ops Alerts", Icon: AlertTriangle, roles: ["admin"], info: "Backend failures captured in-app.", section: "Platform" },
  { to: "/admin/feature-flags", label: "Payment & plan flags", Icon: Sparkles, roles: ["admin"], info: "Server-side toggles for payment rails, boost types and plans.", section: "Platform" },
  { to: "/admin/diagnostics", label: "Permission diagnostics", Icon: ShieldCheck, roles: ["admin"], info: "Inspect roles and permissions for any user.", section: "Platform" },
  { to: "/admin/permissions", label: "Role permissions", Icon: ShieldCheck, roles: ["admin"], info: "Toggle specific permissions per role without redeploying.", section: "Platform" },
  { to: "/admin/sandbox", label: "Sandbox", Icon: FlaskConical, roles: ["admin"], info: "Internal sandbox for testing flows.", section: "Platform" },
];
