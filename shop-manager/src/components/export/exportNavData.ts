import {
  LayoutDashboard, ClipboardList, Users, Package, Truck, UserCheck, Route, Receipt, Ship, FileText,
  DollarSign, Home, Cog, Car, Warehouse, BarChart3, Globe, Boxes, Settings, Wrench, Shield,
  ClipboardCheck, Factory, Lock, MapPin, ArrowDownToLine, PackageCheck, ShieldCheck, Bell,
  RotateCcw, Landmark, CalendarDays, ShieldAlert, Anchor, Globe2, CreditCard, FileCheck, Hash,
  Navigation, Container, GitBranch, TrendingUp, FileStack, FileBadge, BellRing, Radar, Star,
  LineChart, BoxSelect, Layers, Clock, Calculator, MessageSquare, UserCheck as UserPortal, Cable,
  Map, Gauge, Package as PackageIcon,
} from 'lucide-react';
import React from 'react';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description?: string;
}

export interface NavSection {
  title: string;
  hubRoute: string;
  hubIcon: React.ComponentType<{ className?: string }>;
  hubColor: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: 'Overview',
    hubRoute: '/export/hub/overview',
    hubIcon: LayoutDashboard,
    hubColor: 'from-emerald-500 to-teal-600',
    items: [
      { title: 'Dashboard', href: '/export', icon: LayoutDashboard, color: 'from-emerald-500 to-teal-600', description: 'Module overview and key metrics' },
      { title: 'Alerts', href: '/export/notifications', icon: Bell, color: 'from-red-500 to-rose-600', description: 'System notifications and alerts' },
      { title: 'Trade Alerts', href: '/export/trade-alerts', icon: BellRing, color: 'from-orange-500 to-red-500', description: 'Trade-specific alerts and warnings' },
      { title: 'Reports', href: '/export/reports', icon: BarChart3, color: 'from-cyan-500 to-blue-600', description: 'Generate and view reports' },
      { title: 'Activity Log', href: '/export/activity', icon: ClipboardCheck, color: 'from-slate-500 to-zinc-600', description: 'Track all system activity' },
    ],
  },
  {
    title: 'Orders & Requests',
    hubRoute: '/export/hub/orders',
    hubIcon: ClipboardList,
    hubColor: 'from-blue-500 to-cyan-500',
    items: [
      { title: 'Orders', href: '/export/orders', icon: ClipboardList, color: 'from-blue-500 to-cyan-500', description: 'Manage export orders' },
      { title: 'Requests', href: '/export/requests', icon: ClipboardCheck, color: 'from-orange-500 to-amber-500', description: 'Handle customer requests' },
      { title: 'Shipments', href: '/export/shipments', icon: Ship, color: 'from-indigo-500 to-violet-600', description: 'Track shipments' },
      { title: 'Completions', href: '/export/completions', icon: BarChart3, color: 'from-green-500 to-emerald-600', description: 'View completed orders' },
      { title: 'Quotes', href: '/export/quotes', icon: FileText, color: 'from-pink-500 to-rose-500', description: 'Create and manage quotes' },
      { title: 'Contracts', href: '/export/contracts', icon: FileText, color: 'from-violet-500 to-purple-600', description: 'Contract management' },
      { title: 'Returns & Claims', href: '/export/returns', icon: RotateCcw, color: 'from-rose-500 to-red-600', description: 'Process returns and claims' },
      { title: 'Samples', href: '/export/samples', icon: PackageIcon, color: 'from-teal-500 to-cyan-600', description: 'Sample order management' },
    ],
  },
  {
    title: 'Customers & Products',
    hubRoute: '/export/hub/customers',
    hubIcon: Users,
    hubColor: 'from-sky-500 to-blue-600',
    items: [
      { title: 'Clients', href: '/export/customers', icon: Users, color: 'from-sky-500 to-blue-600', description: 'Client directory and CRM' },
      { title: 'Suppliers', href: '/export/suppliers', icon: Factory, color: 'from-orange-500 to-red-500', description: 'Supplier management' },
      { title: 'Agents', href: '/export/agents', icon: Users, color: 'from-violet-500 to-purple-600', description: 'Agent network' },
      { title: 'Products', href: '/export/products', icon: Package, color: 'from-amber-500 to-orange-600', description: 'Product catalog' },
      { title: 'Vehicles', href: '/export/vehicles', icon: Car, color: 'from-red-500 to-rose-600', description: 'Vehicle registry' },
      { title: 'Credit Mgmt', href: '/export/credit', icon: CreditCard, color: 'from-emerald-500 to-green-600', description: 'Customer credit management' },
    ],
  },
  {
    title: 'Fleet & Logistics',
    hubRoute: '/export/hub/logistics',
    hubIcon: Truck,
    hubColor: 'from-slate-500 to-zinc-600',
    items: [
      { title: 'Trucks', href: '/export/trucks', icon: Truck, color: 'from-slate-500 to-zinc-600', description: 'Fleet management' },
      { title: 'Drivers', href: '/export/drivers', icon: UserCheck, color: 'from-green-500 to-emerald-600', description: 'Driver management' },
      { title: 'Driver App', href: '/export/driver-app', icon: Globe, color: 'from-orange-500 to-amber-600', description: 'Mobile driver application' },
      { title: 'Routes', href: '/export/routes', icon: Route, color: 'from-emerald-500 to-teal-500', description: 'Route planning' },
      { title: 'Insurance', href: '/export/insurance', icon: ShieldCheck, color: 'from-cyan-500 to-blue-500', description: 'Shipping insurance' },
      { title: 'Forwarders', href: '/export/forwarders', icon: Truck, color: 'from-purple-500 to-indigo-600', description: 'Freight forwarder directory' },
      { title: 'Bookings', href: '/export/bookings', icon: Anchor, color: 'from-blue-500 to-indigo-600', description: 'Freight bookings' },
      { title: 'Ports', href: '/export/ports', icon: Navigation, color: 'from-sky-500 to-blue-600', description: 'Port information' },
      { title: 'Intermodal', href: '/export/intermodal', icon: GitBranch, color: 'from-violet-500 to-indigo-600', description: 'Intermodal transport' },
      { title: 'Quality Control', href: '/export/quality', icon: ClipboardCheck, color: 'from-teal-500 to-cyan-600', description: 'QC inspections' },
      { title: 'Shipment Tracker', href: '/export/shipment-tracker', icon: Radar, color: 'from-emerald-500 to-cyan-600', description: 'Real-time tracking' },
      { title: 'Container Planning', href: '/export/container-load-planning', icon: BoxSelect, color: 'from-orange-500 to-amber-600', description: 'Container load optimization' },
      { title: 'Vendor Scorecards', href: '/export/vendor-scorecards', icon: Star, color: 'from-yellow-500 to-amber-600', description: 'Vendor performance' },
    ],
  },
  {
    title: 'Inventory & Warehouses',
    hubRoute: '/export/hub/inventory',
    hubIcon: Boxes,
    hubColor: 'from-teal-500 to-cyan-600',
    items: [
      { title: 'Inventory', href: '/export/inventory', icon: Boxes, color: 'from-teal-500 to-cyan-600', description: 'Stock management' },
      { title: 'Reservations', href: '/export/reservations', icon: Lock, color: 'from-amber-500 to-yellow-600', description: 'Inventory reservations' },
      { title: 'Warehouses', href: '/export/warehouses', icon: Warehouse, color: 'from-violet-500 to-purple-600', description: 'Warehouse management' },
      { title: 'Packaging', href: '/export/packaging', icon: Package, color: 'from-lime-500 to-green-600', description: 'Packaging materials' },
      { title: 'Packing & Trace', href: '/export/packing', icon: MapPin, color: 'from-teal-500 to-emerald-600', description: 'Packing traceability' },
      { title: 'Bonded Storage', href: '/export/bonded-warehouses', icon: Container, color: 'from-indigo-500 to-purple-600', description: 'Bonded warehouse storage' },
      { title: 'Equipment', href: '/export/equipment', icon: Wrench, color: 'from-gray-500 to-slate-600', description: 'Equipment tracking' },
    ],
  },
  {
    title: 'Documents & Compliance',
    hubRoute: '/export/hub/documents',
    hubIcon: FileText,
    hubColor: 'from-fuchsia-500 to-pink-600',
    items: [
      { title: 'Documents', href: '/export/documents', icon: FileText, color: 'from-fuchsia-500 to-pink-600', description: 'Document management' },
      { title: 'Doc Templates', href: '/export/doc-templates', icon: FileStack, color: 'from-pink-500 to-fuchsia-600', description: 'Document templates' },
      { title: 'Customs', href: '/export/customs', icon: ShieldCheck, color: 'from-purple-500 to-violet-600', description: 'Customs compliance' },
      { title: 'Declarations', href: '/export/declarations', icon: FileBadge, color: 'from-violet-500 to-purple-600', description: 'Customs declarations' },
      { title: 'Certificates', href: '/export/certificates', icon: FileCheck, color: 'from-emerald-500 to-teal-600', description: 'Certificate management' },
      { title: 'HS Codes', href: '/export/hs-codes', icon: Hash, color: 'from-indigo-500 to-blue-600', description: 'Harmonized System codes' },
      { title: 'Country Reqs', href: '/export/country-requirements', icon: Globe2, color: 'from-sky-500 to-blue-600', description: 'Country requirements' },
      { title: 'Compliance Calendar', href: '/export/compliance-calendar', icon: CalendarDays, color: 'from-orange-500 to-red-600', description: 'Compliance deadlines' },
      { title: 'Sanctions', href: '/export/sanctions', icon: ShieldAlert, color: 'from-red-500 to-rose-600', description: 'Sanctions screening' },
    ],
  },
  {
    title: 'Billing & Finance',
    hubRoute: '/export/hub/finance',
    hubIcon: DollarSign,
    hubColor: 'from-emerald-500 to-green-600',
    items: [
      { title: 'Invoices', href: '/export/invoices', icon: Receipt, color: 'from-purple-500 to-indigo-600', description: 'Invoice management' },
      { title: 'Payments', href: '/export/payments', icon: DollarSign, color: 'from-emerald-500 to-green-600', description: 'Payment tracking' },
      { title: 'Pricing', href: '/export/pricing', icon: DollarSign, color: 'from-amber-500 to-orange-600', description: 'Pricing management' },
      { title: 'Currency', href: '/export/currency', icon: ArrowDownToLine, color: 'from-cyan-500 to-teal-600', description: 'Exchange rates' },
      { title: 'Letters of Credit', href: '/export/letters-of-credit', icon: Landmark, color: 'from-indigo-500 to-blue-600', description: 'LC management' },
      { title: 'Duty Drawbacks', href: '/export/duty-drawbacks', icon: Receipt, color: 'from-lime-500 to-emerald-600', description: 'Duty drawback claims' },
      { title: 'Bank Guarantees', href: '/export/bank-guarantees', icon: Shield, color: 'from-slate-500 to-zinc-600', description: 'Bank guarantee management' },
      { title: 'Trade Finance', href: '/export/trade-finance', icon: TrendingUp, color: 'from-cyan-500 to-emerald-600', description: 'Trade financing' },
      { title: 'Shipment P&L', href: '/export/shipment-pl', icon: TrendingUp, color: 'from-green-500 to-emerald-600', description: 'Per-shipment profitability' },
      { title: 'Consolidated P&L', href: '/export/consolidated-pl', icon: Layers, color: 'from-blue-500 to-indigo-600', description: 'Overall P&L reporting' },
      { title: 'AR/AP Aging', href: '/export/aging-reports', icon: Clock, color: 'from-amber-500 to-orange-600', description: 'Aging analysis' },
      { title: 'Landed Cost', href: '/export/landed-cost', icon: Calculator, color: 'from-teal-500 to-emerald-600', description: 'Landed cost calculator' },
    ],
  },
  {
    title: 'Analytics & Intelligence',
    hubRoute: '/export/hub/analytics',
    hubIcon: LineChart,
    hubColor: 'from-violet-500 to-purple-600',
    items: [
      { title: 'Trade Lanes', href: '/export/trade-lanes', icon: Map, color: 'from-sky-500 to-blue-600', description: 'Trade lane analysis' },
      { title: 'KPI Dashboard', href: '/export/kpi-dashboard', icon: Gauge, color: 'from-emerald-500 to-teal-600', description: 'Key performance indicators' },
      { title: 'Demand Forecast', href: '/export/demand-forecasting', icon: LineChart, color: 'from-violet-500 to-purple-600', description: 'Demand forecasting' },
    ],
  },
  {
    title: 'Communication',
    hubRoute: '/export/hub/communication',
    hubIcon: MessageSquare,
    hubColor: 'from-blue-500 to-cyan-600',
    items: [
      { title: 'Messaging', href: '/export/messaging-templates', icon: MessageSquare, color: 'from-blue-500 to-cyan-600', description: 'Message templates' },
      { title: 'Customer Portal', href: '/export/customer-portal', icon: UserPortal, color: 'from-indigo-500 to-violet-600', description: 'Customer self-service portal' },
      { title: 'EDI / API Hub', href: '/export/edi-hub', icon: Cable, color: 'from-slate-500 to-zinc-600', description: 'EDI and API integrations' },
    ],
  },
  {
    title: 'Import',
    hubRoute: '/export/hub/import',
    hubIcon: ArrowDownToLine,
    hubColor: 'from-blue-500 to-indigo-600',
    items: [
      { title: 'Purchase Orders', href: '/export/import-orders', icon: ArrowDownToLine, color: 'from-blue-500 to-indigo-600', description: 'Import purchase orders' },
      { title: 'Receiving', href: '/export/import-receiving', icon: PackageCheck, color: 'from-green-500 to-emerald-600', description: 'Goods receiving' },
      { title: 'Customs Clearance', href: '/export/import-customs', icon: ShieldCheck, color: 'from-purple-500 to-indigo-600', description: 'Import customs clearance' },
      { title: 'Invoices (AP)', href: '/export/import-invoices', icon: Receipt, color: 'from-blue-500 to-cyan-600', description: 'Accounts payable invoices' },
    ],
  },
  {
    title: 'Configuration',
    hubRoute: '/export/hub/config',
    hubIcon: Cog,
    hubColor: 'from-slate-500 to-gray-600',
    items: [
      { title: 'Staff', href: '/export/staff', icon: Users, color: 'from-cyan-500 to-blue-500', description: 'Staff management' },
      { title: 'Settings', href: '/export/settings', icon: Cog, color: 'from-slate-500 to-gray-600', description: 'Module settings' },
    ],
  },
];
