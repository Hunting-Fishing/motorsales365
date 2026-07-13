import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Plus, FileText, Wrench, Receipt, ClipboardList, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useUserRoles } from '@/hooks/useUserRoles';
import { hasRoutePermission } from '@/utils/routeGuards';

// Quick action items for creating new records
const quickActions = [
  { name: 'Create Work Order', href: '/work-orders/new', icon: Plus, requiredPath: '/work-orders' },
  { name: 'Create Quote', href: '/quotes/new', icon: FileText, requiredPath: '/quotes' },
  { name: 'Create Invoice', href: '/invoices/new', icon: Receipt, requiredPath: '/invoices' },
  { name: 'Schedule Appointment', href: '/calendar', icon: Calendar, requiredPath: '/calendar' },
];

// Main navigation organized by category
const navigationCategories = [
  {
    title: 'Dashboard',
    items: [
      { name: 'Dashboard', href: '/dashboard', requiredPath: '/dashboard' },
    ]
  },
  {
    title: 'Operations',
    items: [
      { name: 'Work Orders', href: '/work-orders', requiredPath: '/work-orders' },
      { name: 'Daily Logs', href: '/daily-logs', requiredPath: '/daily-logs' },
      { name: 'Service Board', href: '/service-board', requiredPath: '/service-board' },
      { name: 'Quotes', href: '/quotes', requiredPath: '/quotes' },
      { name: 'Invoices', href: '/invoices', requiredPath: '/invoices' },
      { name: 'Payments', href: '/payments', requiredPath: '/payments' },
    ]
  },
  {
    title: 'Scheduling',
    items: [
      { name: 'Calendar', href: '/calendar', requiredPath: '/calendar' },
      { name: 'Staff Scheduling', href: '/scheduling', requiredPath: '/scheduling' },
      { name: 'Service Reminders', href: '/service-reminders', requiredPath: '/service-reminders' },
    ]
  },
  {
    title: 'Customer Management',
    items: [
      { name: 'Customers', href: '/customers', requiredPath: '/customers' },
      { name: 'Vehicles', href: '/vehicles', requiredPath: '/vehicles' },
      { name: 'Customer Communications', href: '/customer-comms', requiredPath: '/customer-comms' },
      { name: 'Call Logger', href: '/call-logger', requiredPath: '/call-logger' },
    ]
  },
  {
    title: 'Inventory & Parts',
    items: [
      { name: 'Inventory', href: '/inventory', requiredPath: '/inventory' },
      { name: 'Inventory Manager', href: '/inventory/manager', requiredPath: '/inventory/manager' },
      { name: 'Purchase Orders', href: '/inventory/orders', requiredPath: '/inventory/orders' },
    ]
  },
  {
    title: 'Fleet & Assets',
    items: [
      { name: 'Fleet Management', href: '/fleet-management', requiredPath: '/fleet-management' },
      { name: 'Shop Equipment', href: '/equipment', requiredPath: '/equipment' },
      { name: 'Safety Equipment', href: '/safety-equipment', requiredPath: '/safety-equipment' },
      { name: 'Equipment Tracking', href: '/equipment-tracking', requiredPath: '/equipment-tracking' },
      { name: 'Maintenance Requests', href: '/maintenance-requests', requiredPath: '/maintenance-requests' },
      { name: 'Insurance', href: '/insurance', requiredPath: '/insurance' },
    ]
  },
  {
    title: 'Services',
    items: [
      { name: 'Service Library', href: '/services', requiredPath: '/services' },
      { name: 'Service Editor', href: '/service-editor', requiredPath: '/service-editor' },
      { name: 'Repair Plans', href: '/repair-plans', requiredPath: '/repair-plans' },
    ]
  },
  {
    title: 'Marketing',
    items: [
      { name: 'Email Campaigns', href: '/email-campaigns', requiredPath: '/email-campaigns' },
      { name: 'Email Sequences', href: '/email-sequences', requiredPath: '/email-sequences' },
      { name: 'Email Templates', href: '/email-templates', requiredPath: '/email-templates' },
      { name: 'SMS Management', href: '/sms-management', requiredPath: '/sms-management' },
      { name: 'SMS Templates', href: '/sms-templates', requiredPath: '/sms-templates' },
    ]
  },
  {
    title: 'Company',
    items: [
      { name: 'Team', href: '/team', requiredPath: '/team' },
      { name: 'Company Profile', href: '/company-profile', requiredPath: '/company-profile' },
      { name: 'Timesheet', href: '/timesheet', requiredPath: '/timesheet' },
      { name: 'Training', href: '/training-overview', requiredPath: '/training-overview' },
      { name: 'Documents', href: '/documents', requiredPath: '/documents' },
    ]
  },
  {
    title: 'Safety & Compliance',
    items: [
      { name: 'Safety Dashboard', href: '/safety', requiredPath: '/safety' },
      { name: 'Incidents', href: '/safety/incidents', requiredPath: '/safety/incidents' },
      { name: 'Daily Inspections', href: '/safety/inspections', requiredPath: '/safety/inspections' },
      { name: 'DVIR Reports', href: '/safety/dvir', requiredPath: '/safety/dvir' },
      { name: 'Vessel Inspections', href: '/safety/vessels', requiredPath: '/safety/vessels' },
      { name: 'Forklift Inspections', href: '/safety/equipment/forklift', requiredPath: '/safety/equipment/forklift' },
      { name: 'Lift Inspections', href: '/safety/equipment', requiredPath: '/safety/equipment' },
      { name: 'Certifications', href: '/safety/certifications', requiredPath: '/safety/certifications' },
      { name: 'Safety Documents', href: '/safety/documents', requiredPath: '/safety/documents' },
      { name: 'Schedules', href: '/safety/schedules', requiredPath: '/safety/schedules' },
      { name: 'Analytics', href: '/safety/analytics', requiredPath: '/safety/analytics' },
      { name: 'Reports', href: '/safety/reports', requiredPath: '/safety/reports' },
      { name: 'Corrective Actions', href: '/safety/corrective-actions', requiredPath: '/safety/corrective-actions' },
      { name: 'Near Miss', href: '/safety/near-miss', requiredPath: '/safety/near-miss' },
      { name: 'Training', href: '/safety/training', requiredPath: '/safety/training' },
      { name: 'Meetings', href: '/safety/meetings', requiredPath: '/safety/meetings' },
      { name: 'JSA', href: '/safety/jsa', requiredPath: '/safety/jsa' },
      { name: 'PPE Management', href: '/safety/ppe', requiredPath: '/safety/ppe' },
    ]
  },
  {
    title: 'Store',
    items: [
      { name: 'Shopping', href: '/shopping', requiredPath: '/shopping' },
      { name: 'Wishlist', href: '/wishlist', requiredPath: '/wishlist' },
      { name: 'My Orders', href: '/orders', requiredPath: '/orders' },
    ]
  },
  {
    title: 'Planning',
    items: [
      { name: 'Planner', href: '/planner', requiredPath: '/planner' },
      { name: 'Projects', href: '/projects', requiredPath: '/projects' },
    ]
  },
  {
    title: 'Tools',
    items: [
      { name: 'Technician Portal', href: '/technician-portal', requiredPath: '/technician-portal' },
      { name: 'Analytics', href: '/analytics', requiredPath: '/analytics' },
      { name: 'AI Hub', href: '/ai-hub', requiredPath: '/ai-hub' },
      { name: 'Forms', href: '/forms', requiredPath: '/forms' },
      { name: 'Feedback', href: '/feedback', requiredPath: '/feedback' },
    ]
  },
  {
    title: 'Personal Trainer',
    items: [
      { name: 'Dashboard', href: '/personal-trainer', requiredPath: '/personal-trainer' },
      { name: 'Clients', href: '/personal-trainer/clients', requiredPath: '/personal-trainer/clients' },
      { name: 'Programs', href: '/personal-trainer/programs', requiredPath: '/personal-trainer/programs' },
      { name: 'Sessions', href: '/personal-trainer/sessions', requiredPath: '/personal-trainer/sessions' },
      { name: 'Exercises', href: '/personal-trainer/exercises', requiredPath: '/personal-trainer/exercises' },
      { name: 'Body Metrics', href: '/personal-trainer/body-metrics', requiredPath: '/personal-trainer/body-metrics' },
    ]
  },
  {
    title: 'Welding',
    items: [
      { name: 'Dashboard', href: '/welding', requiredPath: '/welding' },
      { name: 'Quotes', href: '/welding/quotes', requiredPath: '/welding/quotes' },
      { name: 'Invoices', href: '/welding/invoices', requiredPath: '/welding/invoices' },
      { name: 'Inventory', href: '/welding/inventory', requiredPath: '/welding/inventory' },
      { name: 'Customers', href: '/welding/customers', requiredPath: '/welding/customers' },
      { name: 'Calendar', href: '/welding/calendar', requiredPath: '/welding/calendar' },
    ]
  },
  {
    title: 'Game Development',
    items: [
      { name: 'Dashboard', href: '/game-development', requiredPath: '/game-development' },
      { name: 'Projects', href: '/game-development/projects', requiredPath: '/game-development/projects' },
      { name: 'Canvas Planner', href: '/game-development/canvas', requiredPath: '/game-development/canvas' },
      { name: 'GDD Builder', href: '/game-development/gdd', requiredPath: '/game-development/gdd' },
      { name: 'Story Tracker', href: '/game-development/story', requiredPath: '/game-development/story' },
      { name: 'Characters', href: '/game-development/characters', requiredPath: '/game-development/characters' },
      { name: 'Items & Loot', href: '/game-development/items', requiredPath: '/game-development/items' },
      { name: 'Quests', href: '/game-development/quests', requiredPath: '/game-development/quests' },
      { name: 'Analytics', href: '/game-development/analytics', requiredPath: '/game-development/analytics' },
    ]
  },
  {
    title: 'Reports',
    items: [
      { name: 'Reports', href: '/reports', requiredPath: '/reports' },
    ]
  },
  {
    title: 'Support',
    items: [
      { name: 'Help', href: '/help', requiredPath: '/help' },
      { name: 'Feature Requests', href: '/feature-requests', requiredPath: '/feature-requests' },
    ]
  },
  {
    title: 'Administration',
    items: [
      { name: 'Developer', href: '/developer', requiredPath: '/developer' },
    ]
  },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { data: userRoles = [] } = useUserRoles();
  
  // Function to check if a navigation item is active based on the current URL path
  const isNavItemActive = (href: string) => {
    const currentPath = location.pathname;
    
    // Special case for root path
    if (href === '/') {
      return currentPath === '/';
    }
    
    // For other paths, we consider it active if:
    // 1. The current path exactly matches the href, or
    // 2. The current path starts with the href followed by a slash or nothing
    // This ensures that '/shopping/categories' will highlight the 'Shopping' nav item
    return currentPath === href || 
           currentPath.startsWith(`${href}/`);
  };
  
  // Get desktop navigation items (just show main categories)
  const desktopNavItems = [
    { name: 'Dashboard', href: '/dashboard', requiredPath: '/dashboard' },
    { name: 'Work Orders', href: '/work-orders', requiredPath: '/work-orders' },
    { name: 'Customers', href: '/customers', requiredPath: '/customers' },
    { name: 'Inventory', href: '/inventory', requiredPath: '/inventory' },
    { name: 'Reports', href: '/reports', requiredPath: '/reports' },
  ];
  
  return (
    <header className="bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 border-b border-slate-200">
      <nav className="mx-auto flex max-w-full items-center justify-between px-6 py-3 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link to="/dashboard" className="-m-1.5 p-1.5">
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              Service Manager
            </span>
          </Link>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-slate-700 dark:text-slate-300"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden lg:flex lg:gap-x-8">
          {desktopNavItems.map((item) => (
            hasRoutePermission(item.requiredPath, userRoles) && (
              <Link
                key={item.name}
                to={item.href}
                className={`text-sm font-medium ${
                  isNavItemActive(item.href) 
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400'
                }`}
              >
                {item.name}
              </Link>
            )
          ))}
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:block"
              asChild
            >
              <Link to="/settings">
                Settings
              </Link>
            </Button>
          </div>
        </div>
      </nav>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50" />
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white dark:bg-slate-800 px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <Link to="/dashboard" className="-m-1.5 p-1.5">
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  Service Manager
                </span>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-slate-700 dark:text-slate-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10 dark:divide-slate-600">
                {/* Quick Actions */}
                <div className="py-6">
                  <h3 className="px-3 mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Quick Actions
                  </h3>
                  <div className="space-y-1">
                    {quickActions.map((action) => (
                      hasRoutePermission(action.requiredPath, userRoles) && (
                        <Link
                          key={action.name}
                          to={action.href}
                          className="flex items-center gap-3 -mx-3 rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-700"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <action.icon className="h-5 w-5" />
                          {action.name}
                        </Link>
                      )
                    ))}
                  </div>
                </div>

                {/* Categorized Navigation */}
                {navigationCategories.map((category) => {
                  const visibleItems = category.items.filter(item => 
                    hasRoutePermission(item.requiredPath, userRoles)
                  );
                  
                  if (visibleItems.length === 0) return null;
                  
                  return (
                    <div key={category.title} className="py-6">
                      <h3 className="px-3 mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {category.title}
                      </h3>
                      <div className="space-y-1">
                        {visibleItems.map((item) => (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={`-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 ${
                              isNavItemActive(item.href) 
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-700'
                                : 'text-slate-700 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Settings */}
                <div className="py-6">
                  <Link
                    to="/settings"
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-slate-700 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-slate-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Settings
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
