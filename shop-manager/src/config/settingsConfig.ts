
import { lazy } from 'react';
import { 
  Building2, 
  Users, 
  Bell, 
  Palette, 
  Package, 
  Wrench,
  Hash,
  HandHeart,
  Target,
  Calculator,
  Ticket,
  Globe,
  FileText,
  Shield,
  Database,
  Calendar,
  Link,
  UserCheck,
  LayoutDashboard,
  Lock,
  UserCog,
  LayoutList,
  ClipboardCheck,
  User,
  Languages,
  Timer,
  Percent,
  MapPin,
  Mail,
  Clock,
  Download,
  CreditCard,
  Gift,
  History,
  ShieldCheck,
  HardHat,
  Puzzle,
  Fuel
} from 'lucide-react';
import { SettingsTabConfig, SettingsSection } from '@/types/settingsConfig';

// Lazy-load all settings tab components for code-splitting
const CompanyTab = lazy(() => import('@/components/settings/CompanyTab').then(m => ({ default: m.CompanyTab })));
const TeamTab = lazy(() => import('@/components/settings/TeamTab').then(m => ({ default: m.TeamTab })));
const NotificationsTab = lazy(() => import('@/components/settings/NotificationsTab').then(m => ({ default: m.NotificationsTab })));
const BrandingTab = lazy(() => import('@/components/settings/BrandingTab').then(m => ({ default: m.BrandingTab })));
const InventorySettingsTab = lazy(() => import('@/components/settings/InventorySettingsTab').then(m => ({ default: m.InventorySettingsTab })));
const DIYBayRatesTab = lazy(() => import('@/components/settings/DIYBayRatesTab').then(m => ({ default: m.DIYBayRatesTab })));
const WorkOrderNumberingTab = lazy(() => import('@/components/settings/WorkOrderNumberingTab').then(m => ({ default: m.WorkOrderNumberingTab })));
const WorkOrderWorkflowTab = lazy(() => import('@/components/settings/WorkOrderWorkflowTab').then(m => ({ default: m.WorkOrderWorkflowTab })));
const WorkOrderTemplateTab = lazy(() => import('@/components/settings/WorkOrderTemplateTab').then(m => ({ default: m.WorkOrderTemplateTab })));
const WorkOrderStatusTab = lazy(() => import('@/components/settings/WorkOrderStatusTab').then(m => ({ default: m.WorkOrderStatusTab })));
const WorkOrderManagementTab = lazy(() => import('@/components/settings/WorkOrderManagementTab').then(m => ({ default: m.WorkOrderManagementTab })));
const EnhancedWorkOrdersDashboard = lazy(() => import('@/components/settings/EnhancedWorkOrdersDashboard').then(m => ({ default: m.EnhancedWorkOrdersDashboard })));
const NonProfitTab = lazy(() => import('@/components/settings/NonProfitTab').then(m => ({ default: m.NonProfitTab })));
const ProgramManagementTab = lazy(() => import('@/components/settings/ProgramManagementTab').then(m => ({ default: m.ProgramManagementTab })));
const FinancialManagementTab = lazy(() => import('@/components/settings/FinancialManagementTab').then(m => ({ default: m.FinancialManagementTab })));
const RaffleManagementTab = lazy(() => import('@/components/settings/RaffleManagementTab').then(m => ({ default: m.RaffleManagementTab })));
const PublicPortalTab = lazy(() => import('@/components/settings/PublicPortalTab').then(m => ({ default: m.PublicPortalTab })));
const GrantManagementTab = lazy(() => import('@/components/settings/GrantManagementTab').then(m => ({ default: m.GrantManagementTab })));
const ImpactMeasurementTab = lazy(() => import('@/components/settings/ImpactMeasurementTab').then(m => ({ default: m.ImpactMeasurementTab })));
const BoardMeetingTab = lazy(() => import('@/components/settings/BoardMeetingTab').then(m => ({ default: m.BoardMeetingTab })));
const ComplianceTab = lazy(() => import('@/components/settings/ComplianceTab').then(m => ({ default: m.ComplianceTab })));
const SecurityTab = lazy(() => import('@/components/settings/SecurityTab').then(m => ({ default: m.SecurityTab })));
const AssetTrackingTab = lazy(() => import('@/components/settings/AssetTrackingTab').then(m => ({ default: m.AssetTrackingTab })));
const BudgetManagementTab = lazy(() => import('@/components/settings/BudgetManagementTab').then(m => ({ default: m.BudgetManagementTab })));
const IntegrationsTab = lazy(() => import('@/components/settings/IntegrationsTab').then(m => ({ default: m.IntegrationsTab })));
const VolunteerManagementTab = lazy(() => import('@/components/settings/VolunteerManagementTab').then(m => ({ default: m.VolunteerManagementTab })));
const DashboardSettingsTab = lazy(() => import('@/components/settings/DashboardSettingsTab').then(m => ({ default: m.DashboardSettingsTab })));
const RolePermissionsSettingsTab = lazy(() => import('@/components/settings/RolePermissionsSettingsTab').then(m => ({ default: m.RolePermissionsSettingsTab })));
const UserPermissionsSettingsTab = lazy(() => import('@/components/settings/UserPermissionsSettingsTab').then(m => ({ default: m.UserPermissionsSettingsTab })));
const NavigationSettingsTab = lazy(() => import('@/components/settings/NavigationSettingsTab').then(m => ({ default: m.NavigationSettingsTab })));
const FuelProductsTab = lazy(() => import('@/components/settings/FuelProductsTab').then(m => ({ default: m.FuelProductsTab })));

// Placeholder component for lazy-loaded pages
const PlaceholderTab = () => null;

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'account',
    title: 'Account & Profile',
    description: 'Personal account settings and preferences',
    tabs: [
      {
        id: 'account',
        label: 'Account',
        icon: User,
        component: PlaceholderTab,
        path: '/settings/account',
        description: 'Manage your account settings'
      },
      {
        id: 'appearance',
        label: 'Appearance',
        icon: Palette,
        component: PlaceholderTab,
        path: '/settings/appearance',
        description: 'Theme and display preferences'
      },
      {
        id: 'language',
        label: 'Language',
        icon: Languages,
        component: PlaceholderTab,
        path: '/settings/language',
        description: 'Language and regional settings'
      }
    ]
  },
  {
    id: 'basic',
    title: 'Basic Settings',
    description: 'Core business and team configuration',
    tabs: [
      {
        id: 'company',
        label: 'Company',
        icon: Building2,
        component: CompanyTab,
        path: '/settings/company',
        description: 'Manage company information and business hours'
      },
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        component: DashboardSettingsTab,
        path: '/settings/dashboard',
        description: 'Customize dashboard layout and widgets'
      },
      {
        id: 'team',
        label: 'Team',
        icon: Users,
        component: TeamTab,
        path: '/settings/team',
        description: 'Manage team members and permissions'
      },
      {
        id: 'branding',
        label: 'Branding',
        icon: Palette,
        component: BrandingTab,
        path: '/settings/branding',
        description: 'Customize your brand appearance'
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
        component: NotificationsTab,
        path: '/settings/notifications',
        description: 'Configure notification preferences'
      },
      {
        id: 'security',
        label: 'Security',
        icon: Shield,
        component: SecurityTab,
        path: '/settings/security',
        description: 'Password and authentication settings'
      },
      {
        id: 'navigation',
        label: 'Navigation',
        icon: LayoutList,
        component: NavigationSettingsTab,
        path: '/settings/navigation',
        description: 'Configure sidebar visibility and role access',
        requiredRoles: ['owner', 'manager']
      },
      {
        id: 'business-modules',
        label: 'Business Modules',
        icon: Puzzle,
        component: PlaceholderTab,
        path: '/settings/business-modules',
        description: 'Enable or disable business features and industry-specific modules',
        requiredRoles: ['owner']
      }
    ]
  },
  {
    id: 'operations',
    title: 'Operations',
    description: 'Day-to-day business operations and workflows',
    tabs: [
      {
        id: 'work-orders',
        label: 'Work Orders',
        icon: Hash,
        component: WorkOrderManagementTab,
        path: '/settings/work-orders',
        description: 'Comprehensive work order settings, workflows, and automation'
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: Package,
        component: InventorySettingsTab,
        path: '/settings/inventory',
        description: 'Manage inventory settings and preferences'
      },
      {
        id: 'diy-bays',
        label: 'DIY Bay Rates',
        icon: Wrench,
        component: DIYBayRatesTab,
        path: '/settings/diy-bays',
        description: 'Set rates for DIY bay rentals'
      },
      {
        id: 'labour',
        label: 'Labour',
        icon: Timer,
        component: PlaceholderTab,
        path: '/settings/labour',
        description: 'Labour rates and time tracking settings'
      },
      {
        id: 'markup',
        label: 'Markup',
        icon: Percent,
        component: PlaceholderTab,
        path: '/settings/markup',
        description: 'Configure pricing markup rules'
      },
      {
        id: 'locations',
        label: 'Locations',
        icon: MapPin,
        component: PlaceholderTab,
        path: '/settings/locations',
        description: 'Manage business locations'
      },
      {
        id: 'inspection-templates',
        label: 'Inspection Templates',
        icon: ClipboardCheck,
        component: PlaceholderTab,
        path: '/settings/inspection-templates',
        description: 'Create and manage pre-trip inspection form templates'
      },
      {
        id: 'fuel-products',
        label: 'Fuel Products',
        icon: Fuel,
        component: FuelProductsTab,
        path: '/settings/fuel-products',
        description: 'Manage fuel types, octane ratings, and pricing'
      }
    ]
  },
  {
    id: 'communications',
    title: 'Communications',
    description: 'Email and notification configuration',
    tabs: [
      {
        id: 'email',
        label: 'Email Settings',
        icon: Mail,
        component: PlaceholderTab,
        path: '/settings/email',
        description: 'Configure email server and templates'
      },
      {
        id: 'email-scheduling',
        label: 'Email Scheduling',
        icon: Clock,
        component: PlaceholderTab,
        path: '/settings/email-scheduling',
        description: 'Schedule automated email campaigns'
      }
    ]
  },
  {
    id: 'nonprofit',
    title: 'Non-Profit Management',
    description: 'Tools and features specifically for non-profit organizations',
    tabs: [
      {
        id: 'nonprofit',
        label: 'Non-Profit Settings',
        icon: HandHeart,
        component: NonProfitTab,
        path: '/settings/nonprofit',
        description: 'Manage non-profit specific features and settings'
      },
      {
        id: 'programs',
        label: 'Program Management',
        icon: Target,
        component: ProgramManagementTab,
        path: '/settings/programs',
        description: 'Manage programs, volunteers, grants, and impact measurement'
      },
      {
        id: 'volunteers',
        label: 'Volunteer Management',
        icon: UserCheck,
        component: VolunteerManagementTab,
        path: '/settings/volunteers',
        description: 'Manage volunteers, skills tracking, and assignment workflows'
      },
      {
        id: 'training',
        label: 'Training',
        icon: HardHat,
        component: PlaceholderTab,
        path: '/settings/training',
        description: 'Training programs and certification tracking'
      },
      {
        id: 'grants',
        label: 'Grant Management',
        icon: FileText,
        component: GrantManagementTab,
        path: '/settings/grants',
        description: 'Track grant applications, deadlines, and reporting requirements'
      },
      {
        id: 'asset-tracking',
        label: 'Asset Tracking',
        icon: Database,
        component: AssetTrackingTab,
        path: '/settings/asset-tracking',
        description: 'Track and manage organizational assets and equipment'
      },
      {
        id: 'board-meetings',
        label: 'Board Meetings',
        icon: Calendar,
        component: BoardMeetingTab,
        path: '/settings/board-meetings',
        description: 'Manage board meetings, agendas, and minutes'
      },
      {
        id: 'compliance',
        label: 'Compliance',
        icon: Shield,
        component: ComplianceTab,
        path: '/settings/compliance',
        description: 'Track regulatory compliance requirements and deadlines'
      },
      {
        id: 'impact',
        label: 'Impact Measurement',
        icon: Target,
        component: ImpactMeasurementTab,
        path: '/settings/impact',
        description: 'Track and measure your nonprofit\'s community impact'
      },
      {
        id: 'raffles',
        label: 'Raffle Management',
        icon: Ticket,
        component: RaffleManagementTab,
        path: '/settings/raffles',
        description: 'Create and manage vehicle raffles and ticket sales'
      }
    ]
  },
  {
    id: 'finance',
    title: 'Finance & Billing',
    description: 'Financial settings, budgets, and payments',
    tabs: [
      {
        id: 'financial',
        label: 'Financial Management',
        icon: Calculator,
        component: FinancialManagementTab,
        path: '/settings/financial',
        description: 'Budget tracking, financial reporting, and compliance management'
      },
      {
        id: 'budget-management',
        label: 'Budget Management',
        icon: Calculator,
        component: BudgetManagementTab,
        path: '/settings/budget-management',
        description: 'Track budgets, expenses, and financial performance'
      },
      {
        id: 'billing',
        label: 'Billing',
        icon: CreditCard,
        component: PlaceholderTab,
        path: '/settings/billing',
        description: 'Manage billing and subscription settings'
      },
      {
        id: 'loyalty',
        label: 'Loyalty Program',
        icon: Gift,
        component: PlaceholderTab,
        path: '/settings/loyalty',
        description: 'Configure customer loyalty rewards'
      }
    ]
  },
  {
    id: 'integrations',
    title: 'Data & Integrations',
    description: 'External connections and data management',
    tabs: [
      {
        id: 'integrations',
        label: 'Integrations',
        icon: Link,
        component: IntegrationsTab,
        path: '/settings/integrations',
        description: 'Connect external services and manage API integrations'
      },
      {
        id: 'data-export',
        label: 'Data Export',
        icon: Download,
        component: PlaceholderTab,
        path: '/settings/data-export',
        description: 'Export your data in various formats'
      }
    ]
  },
  {
    id: 'access-control',
    title: 'Access Control',
    description: 'Manage user roles, permissions, and access rights',
    tabs: [
      {
        id: 'role-permissions',
        label: 'Role Permissions',
        icon: Shield,
        component: RolePermissionsSettingsTab,
        path: '/settings/role-permissions',
        description: 'Configure default permissions for each role'
      },
      {
        id: 'user-permissions',
        label: 'User Permissions',
        icon: UserCog,
        component: UserPermissionsSettingsTab,
        path: '/settings/user-permissions',
        description: 'Override permissions for individual users'
      },
      {
        id: 'employee-permissions',
        label: 'Employee Permissions',
        icon: Users,
        component: PlaceholderTab,
        path: '/settings/employee-permissions',
        description: 'Manage employee access levels'
      },
      {
        id: 'security-advanced',
        label: 'Advanced Security',
        icon: ShieldCheck,
        component: PlaceholderTab,
        path: '/settings/security-advanced',
        description: 'Advanced security and audit settings'
      },
      {
        id: 'team-history',
        label: 'Team History',
        icon: History,
        component: PlaceholderTab,
        path: '/settings/team-history',
        description: 'View team activity and change history'
      }
    ]
  },
  {
    id: 'public',
    title: 'Public Interface',
    description: 'Customer-facing features and portals',
    tabs: [
      {
        id: 'public-portal',
        label: 'Public Portal',
        icon: Globe,
        component: PublicPortalTab,
        path: '/settings/public-portal',
        description: 'Manage public-facing portal and application forms'
      },
      {
        id: 'scheduling',
        label: 'Scheduling',
        icon: Calendar,
        component: PlaceholderTab,
        path: '/settings/scheduling',
        description: 'Customer appointment scheduling settings'
      }
    ]
  }
];

// Flatten sections into a single array for compatibility
export const SETTINGS_TABS: SettingsTabConfig[] = SETTINGS_SECTIONS.flatMap(section => section.tabs);

export const DEFAULT_SETTINGS_TAB = 'company';
