import { 
  Car, 
  Droplets, 
  Target, 
  Anchor, 
  Fuel, 
  LucideIcon,
  ShoppingCart,
  User,
  Briefcase,
  Crosshair,
  Package,
  BarChart3,
  FileText,
  CreditCard,
  Calendar,
  Shield,
  ArrowRightLeft,
  ShoppingBag,
  Wrench,
  Truck,
  Users,
  Gauge,
  Receipt,
  Ship,
  MapPin,
  Droplet,
  Link,
  Beaker,
  DollarSign,
  Route,
  CloudSun,
  Camera,
  Star,
  UserPlus,
  Calculator,
  Repeat,
  ClipboardList,
  Bell,
  Globe,
  Activity,
  History,
  FileSearch,
  Compass,
  Snowflake,
  CircleDollarSign,
  Smartphone,
  Container,
  PackageCheck,
  UserCheck,
  FolderOpen,
  Tractor,
  Building,
  Scissors,
  Home,
  Leaf,
  Zap,
  Paintbrush,
  // Additional icons for upcoming modules
  Waves,
  Flame,
  ThermometerSun,
  Bug,
  TreeDeciduous,
  Hammer,
  Fence,
  Sparkles,
  Shirt,
  Dog,
  Heart,
  Baby,
  GraduationCap,
  Music,
  Dumbbell,
  UtensilsCrossed,
  Coffee,
  Beer,
  Wine,
  Cake,
  Pizza,
  IceCream,
  Flower2,
  Mountain,
  Tent,
  Bike,
  Plane,
  Bus,
  Train,
  Warehouse,
  Factory,
  HardHat,
  Drill,
  Axe,
  Shovel,
  Flashlight,
  Lock,
  Key,
  Video,
  Tv,
  Wifi,
  Server,
  Database,
  Code,
  Printer,
  ScanLine,
  Cog,
  Settings,
  Cpu,
  Monitor,
  Speaker,
  Headphones,
  Gamepad2,
  Watch,
  Glasses,
  Gem,
  Crown,
  Ribbon,
  Gift,
  PartyPopper,
  Palette,
  Frame,
  ImageIcon,
  Brush,
  PenTool,
  Type,
  BookOpen,
  Newspaper,
  FileSpreadsheet,
  FilePlus,
  FolderHeart,
  Archive,
  Box,
  Boxes,
  Armchair,
  Lamp,
  BedDouble,
  Bath,
  ShowerHead,
  Plug,
  Fan,
  AirVent,
  Wind,
  Sun,
  Moon,
  Umbrella,
  CloudRain,
  Footprints,
  Bone,
  Cat,
  Bird,
  Fish,
  Turtle,
  Stethoscope,
  Pill,
  Syringe,
  Microscope,
  TestTube,
  Atom,
  Rocket,
  Satellite,
  Radio,
  Antenna,
  Phone,
  PhoneCall,
  MessageSquare,
  Mail,
  Send,
  Inbox,
  Share2,
  Network,
  Workflow,
  GitBranch,
  Terminal,
  Binary,
  QrCode,
  Fingerprint,
  Eye,
  EyeOff,
  Search,
  Filter,
  SortAsc,
  List,
  Grid3X3,
  LayoutDashboard,
  Columns,
  Rows,
  Table,
  PieChart,
  TrendingUp,
  LineChart,
  Award,
  Trophy,
  Medal,
  BadgeCheck,
  BadgeAlert,
  AlertTriangle,
  Info,
  HelpCircle,
  XCircle,
  CheckCircle,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  RotateCcw,
  Undo,
  Redo,
  Copy,
  Clipboard,
  Trash2,
  Edit,
  PenLine,
  Highlighter,
  Eraser,
  Wand2,
  Sparkle,
  Lightbulb,
  Megaphone,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Circle,
  Triangle,
  Pentagon,
  Hexagon,
  Octagon,
  Heart as HeartIcon,
  Bookmark,
  Flag,
  Pin,
  Navigation,
  Move,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  Fullscreen,
  SplitSquareVertical,
  PanelLeft,
  PanelRight,
  PanelTop,
  PanelBottom,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  Heading1,
  Heading2,
  Heading3,
  ListOrdered,
  ListChecks,
  Quote,
  Code2,
  Braces,
  Terminal as TerminalIcon
} from 'lucide-react';

export interface ModuleSectionItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  group?: string;
  isExternal?: boolean;
}

export interface ModuleRouteConfig {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  dashboardRoute: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  sections?: ModuleSectionItem[];
}

export interface UpcomingModuleConfig {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
  expectedDate?: string;
  category?: string;
}
export const UPCOMING_MODULES: UpcomingModuleConfig[] = [];


export const MODULE_ROUTES: Record<string, ModuleRouteConfig> = {
  automotive: {
    slug: 'automotive',
    name: 'Automotive Repair',
    description: 'Full-service auto repair shop management',
    icon: Car,
    dashboardRoute: '/automotive',
    color: 'hsl(var(--primary))',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-blue-600',
    sections: [
      // Dashboard
      { title: 'Dashboard', href: '/automotive', icon: Gauge, description: 'Module overview and KPIs', group: 'Dashboard' },
      
      // Services
      { title: 'All Jobs', href: '/work-orders', icon: Briefcase, description: 'Work orders and repairs', group: 'Services' },
      { title: 'Quotes', href: '/quotes', icon: FileText, description: 'Estimates and quotes', group: 'Services' },
      { title: 'Invoices', href: '/invoices', icon: Receipt, description: 'Billing and invoices', group: 'Services' },
      { title: 'Payments', href: '/payments', icon: CreditCard, description: 'Payment processing', group: 'Services' },
      { title: 'Service Packages', href: '/service-packages', icon: Package, description: 'Service bundles', group: 'Services' },
      
      // Customers
      { title: 'Customers', href: '/customers', icon: Users, description: 'Customer management', group: 'Customers' },
      { title: 'Vehicle History', href: '/automotive/vehicle-history', icon: History, description: 'Complete service history', group: 'Customers' },
      
      // Inventory
      { title: 'Parts', href: '/inventory', icon: Package, description: 'Parts inventory', group: 'Inventory' },
      { title: 'Parts Tracking', href: '/parts-tracking', icon: Package, description: 'Track parts orders', group: 'Inventory' },
      { title: 'Suppliers', href: '/inventory-suppliers', icon: Users, description: 'Vendor management', group: 'Inventory' },
      
      // Scheduling
      { title: 'Appointments', href: '/booking-management', icon: Calendar, description: 'Booking management', group: 'Scheduling' },
      { title: 'Planner', href: '/planner', icon: Calendar, description: 'Job planner', group: 'Scheduling' },
      { title: 'Calendar', href: '/calendar', icon: Calendar, description: 'Service calendar', group: 'Scheduling' },
      
      // Communications
      { title: 'Customer Comms', href: '/customer-comms', icon: Bell, description: 'Customer messaging', group: 'Communications' },
      { title: 'Call Logger', href: '/call-logger', icon: Bell, description: 'Call tracking', group: 'Communications' },
      
      // Marketing
      { title: 'Email Campaigns', href: '/email-campaigns', icon: Globe, description: 'Email marketing', group: 'Marketing' },
      { title: 'SMS Management', href: '/sms-management', icon: Smartphone, description: 'Text messaging', group: 'Marketing' },
      
      // Operations
      { title: 'Daily Logs', href: '/daily-logs', icon: ClipboardList, description: 'Daily operations', group: 'Operations' },
      { title: 'Service Board', href: '/service-board', icon: Briefcase, description: 'Live job board', group: 'Operations' },
      
      // Equipment & Tools
      { title: 'Equipment', href: '/equipment', icon: Wrench, description: 'Shop equipment', group: 'Equipment & Tools' },
      { title: 'Maintenance', href: '/maintenance-requests', icon: Wrench, description: 'Equipment maintenance', group: 'Equipment & Tools' },
      
      // Fleet
      { title: 'Vehicles', href: '/vehicles', icon: Car, description: 'Customer vehicles', group: 'Fleet' },
      { title: 'Fleet Management', href: '/fleet-management', icon: Truck, description: 'Fleet tracking', group: 'Fleet' },
      { title: 'Fuel Management', href: '/fuel-management', icon: Fuel, description: 'Fuel tracking', group: 'Fleet' },
      { title: 'Tire Management', href: '/tire-management', icon: Car, description: 'Tire tracking', group: 'Fleet' },
      
      // Safety & Compliance
      { title: 'Safety Dashboard', href: '/safety', icon: Shield, description: 'Safety overview', group: 'Safety & Compliance' },
      { title: 'DVIR', href: '/safety/dvir', icon: ClipboardList, description: 'Vehicle inspections', group: 'Safety & Compliance' },
      { title: 'Inspections', href: '/safety/inspections', icon: Shield, description: 'Safety inspections', group: 'Safety & Compliance' },
      
      // Company
      { title: 'Company Profile', href: '/company-profile', icon: Users, description: 'Business info', group: 'Company' },
      { title: 'Team', href: '/team', icon: Users, description: 'Staff management', group: 'Company' },
      { title: 'Settings', href: '/settings', icon: Wrench, description: 'Module settings', group: 'Company' },
      
      // Automotive-Specific
      { title: 'Diagnostics', href: '/automotive/diagnostics', icon: Activity, description: 'Diagnostic tools', group: 'Automotive' },
      { title: 'Labor Rates', href: '/automotive/labor-rates', icon: DollarSign, description: 'Rate management', group: 'Automotive' },
      { title: 'TSB & Recalls', href: '/automotive/recalls', icon: FileSearch, description: 'Technical bulletins', group: 'Automotive' },
      // Resources
      { title: 'Recommended Gear', href: '/automotive/store', icon: ShoppingBag, description: 'Shop recommended equipment', group: 'Resources' },
      // Quick Links
      { title: 'Shop on Amazon', href: 'https://amzn.to/4b7nheJ', icon: ShoppingCart, description: 'Find more equipment on Amazon', group: 'Quick Links', isExternal: true },
    ],
  },
  marine: {
    slug: 'marine',
    name: 'Marine Services',
    description: 'Boat and watercraft maintenance',
    icon: Anchor,
    dashboardRoute: '/marine-services',
    color: 'hsl(var(--chart-3))',
    gradientFrom: 'from-teal-500',
    gradientTo: 'to-teal-600',
    sections: [
      // Core Operations
      { title: 'Dashboard', href: '/marine-services', icon: Gauge, description: 'Module overview and KPIs' },
      { title: 'All Jobs', href: '/marine-services/jobs', icon: Briefcase, description: 'Work orders' },
      { title: 'Vessels', href: '/marine-services/vessels', icon: Ship, description: 'Vessel registry' },
      { title: 'Parts', href: '/marine-services/parts', icon: Package, description: 'Parts inventory' },
      { title: 'Quotes', href: '/marine-services/quotes', icon: FileText, description: 'Estimates and quotes' },
      { title: 'Invoices', href: '/marine-services/invoices', icon: Receipt, description: 'Billing and invoices' },
      { title: 'Payments', href: '/marine-services/payments', icon: CreditCard, description: 'Payment processing' },
      { title: 'Dock Schedule', href: '/marine-services/schedule', icon: Calendar, description: 'Dock scheduling' },
      // Marine-Specific Features
      { title: 'Sea Trials', href: '/marine-services/sea-trials', icon: Compass, description: 'Sea trial scheduling and logs' },
      { title: 'Haul-Outs', href: '/marine-services/haul-outs', icon: Anchor, description: 'Haul-out scheduling' },
      { title: 'Winterization', href: '/marine-services/winterization', icon: Snowflake, description: 'Winterization tracking' },
      { title: 'Compliance', href: '/marine-services/compliance', icon: Shield, description: 'Coast Guard compliance' },
      // Resources
      { title: 'Recommended Gear', href: '/marine-services/store', icon: ShoppingBag, description: 'Shop recommended equipment', group: 'Resources' },
      // Quick Links
      { title: 'Shop on Amazon', href: 'https://amzn.to/4b7nheJ', icon: ShoppingCart, description: 'Find more equipment on Amazon', group: 'Quick Links', isExternal: true },
    ],
  },
  fuel_delivery: {
    slug: 'fuel_delivery',
    name: 'Fuel Delivery',
    description: 'Fuel delivery and tank management',
    icon: Fuel,
    dashboardRoute: '/fuel-delivery',
    color: 'hsl(var(--chart-5))',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-orange-600',
    sections: [
      // Core Operations
      { title: 'Dashboard', href: '/fuel-delivery', icon: Gauge, description: 'Module overview and KPIs' },
      { title: 'Orders', href: '/fuel-delivery/orders', icon: ClipboardList, description: 'Delivery orders' },
      { title: 'Customers', href: '/fuel-delivery/customers', icon: Users, description: 'Customer management' },
      { title: 'Quotes', href: '/fuel-delivery/quotes', icon: FileText, description: 'Estimates and quotes' },
      { title: 'Invoices', href: '/fuel-delivery/invoices', icon: Receipt, description: 'Billing and invoices' },
      // Tank Management
      { title: 'Tanks', href: '/fuel-delivery/tanks', icon: Container, description: 'Tank registry' },
      { title: 'Tidy Tanks', href: '/fuel-delivery/tidy-tanks', icon: PackageCheck, description: 'Tank maintenance' },
      { title: 'Tank Fills', href: '/fuel-delivery/tank-fills', icon: Droplet, description: 'Fill history' },
      { title: 'Locations', href: '/fuel-delivery/locations', icon: MapPin, description: 'Delivery locations' },
      // Fleet & Delivery
      { title: 'Routes', href: '/fuel-delivery/routes', icon: Route, description: 'Route optimization' },
      { title: 'Trucks', href: '/fuel-delivery/trucks', icon: Truck, description: 'Delivery trucks' },
      { title: 'Drivers', href: '/fuel-delivery/drivers', icon: UserCheck, description: 'Driver management' },
      { title: 'Equipment', href: '/fuel-delivery/equipment', icon: Wrench, description: 'Equipment tracking' },
      { title: 'Completions', href: '/fuel-delivery/completions', icon: FolderOpen, description: 'Completed deliveries' },
      // Products & Pricing
      { title: 'Products', href: '/fuel-delivery/products', icon: Fuel, description: 'Fuel products' },
      { title: 'Pricing', href: '/fuel-delivery/pricing', icon: CircleDollarSign, description: 'Price management' },
      { title: 'Inventory', href: '/fuel-delivery/inventory', icon: BarChart3, description: 'Fuel inventory' },
      // Mobile
      { title: 'Driver App', href: '/fuel-delivery/driver-app', icon: Smartphone, description: 'Mobile driver app' },
      // Resources
      { title: 'Recommended Gear', href: '/fuel-delivery/store', icon: ShoppingBag, description: 'Shop recommended equipment', group: 'Resources' },
      // Quick Links
      { title: 'Shop on Amazon', href: 'https://amzn.to/4b7nheJ', icon: ShoppingCart, description: 'Find more equipment on Amazon', group: 'Quick Links', isExternal: true },
    ],
  },
  welding: {
    slug: 'welding',
    name: 'Welding & Fabrication',
    description: 'Complete welding and fabrication business management',
    icon: Flame,
    dashboardRoute: '/welding',
    color: 'hsl(var(--chart-4))',
    gradientFrom: 'from-orange-600',
    gradientTo: 'to-red-700',
    sections: [
      { title: 'Dashboard', href: '/welding', icon: BarChart3, description: 'Module overview', group: 'Dashboard' },
      { title: 'Gallery', href: '/welding/gallery', icon: ImageIcon, description: 'Portfolio gallery', group: 'Services' },
      { title: 'Quotes', href: '/welding/quotes', icon: FileText, description: 'Quote management', group: 'Services' },
      { title: 'Invoices', href: '/welding/invoices', icon: Receipt, description: 'Invoice management', group: 'Billing' },
      { title: 'Payments Due', href: '/welding/payments-due', icon: DollarSign, description: 'Outstanding payments', group: 'Billing' },
      { title: 'Accounts Payable', href: '/welding/accounts-payable', icon: CreditCard, description: 'Bills & AP', group: 'Billing' },
      { title: 'Inventory', href: '/welding/inventory', icon: Package, description: 'Materials stock', group: 'Inventory' },
      { title: 'Purchase Orders', href: '/welding/purchase-orders', icon: ShoppingCart, description: 'PO tracking', group: 'Inventory' },
      { title: 'Customers', href: '/welding/customers', icon: Users, description: 'Customer CRM', group: 'Customers' },
      { title: 'Messages', href: '/welding/messages', icon: MessageSquare, description: 'Contact messages', group: 'Customers' },
      { title: 'Calendar', href: '/welding/calendar', icon: Calendar, description: 'Scheduling', group: 'Resources' },
      { title: 'Sales', href: '/welding/sales', icon: TrendingUp, description: 'Sales pipeline', group: 'Resources' },
      { title: 'Links', href: '/welding/links', icon: Link, description: 'External links', group: 'Resources' },
      { title: 'Settings', href: '/welding/settings', icon: Settings, description: 'Module settings' },
    ],
  },
};

export const getModuleRoute = (slug: string): ModuleRouteConfig | undefined => {
  return getAllModuleRoutes().find((module) => module.slug === slug);
};

export const getAllModuleRoutes = (): ModuleRouteConfig[] => {
  // This clone intentionally exposes only vehicle and fabrication businesses.
  // Filtering here also protects the UI if legacy module records remain in DB.
  const supported = new Set(['automotive', 'marine', 'fuel_delivery', 'welding']);
  return Object.values(MODULE_ROUTES).filter((module) => supported.has(module.slug));
};

export const getModuleSections = (slug: string): ModuleSectionItem[] => {
  return getModuleRoute(slug)?.sections || [];
};
