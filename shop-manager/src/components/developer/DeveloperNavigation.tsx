import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Wrench, 
  BookOpen, 
  Code, 
  Users, 
  Settings, 
  Shield,
  BarChart3,
  ShoppingBag,
  TrendingUp
} from 'lucide-react';

const navigationItems = [
  {
    href: '/developer/service-management',
    label: 'Service Management',
    icon: Wrench,
    description: 'Manage service hierarchy and jobs'
  },
  {
    href: '/developer/api-docs',
    label: 'API Documentation',
    icon: BookOpen,
    description: 'Complete API reference'
  },
  {
    href: '/developer/api-tools',
    label: 'API Tools',
    icon: Code,
    description: 'Test endpoints and manage keys'
  },
  {
    href: '/developer/user-management',
    label: 'User Management',
    icon: Users,
    description: 'Manage users and permissions'
  },
  {
    href: '/developer/system-settings',
    label: 'System Settings',
    icon: Settings,
    description: 'Configure system preferences'
  },
  {
    href: '/developer/security',
    label: 'Security',
    icon: Shield,
    description: 'Security settings and logs'
  },
  {
    href: '/developer/analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'System analytics and insights'
  },
  {
    href: '/developer/shopping',
    label: 'Shopping Controls',
    icon: ShoppingBag,
    description: 'E-commerce configuration'
  },
  {
    href: '/developer/affiliate-analytics',
    label: 'Affiliate Analytics',
    icon: TrendingUp,
    description: 'Track Amazon affiliate link performance'
  }
];

export function DeveloperNavigation() {
  const location = useLocation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname.startsWith(item.href);
        
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "group relative p-6 border rounded-lg transition-all duration-200 hover:shadow-md",
              isActive 
                ? "border-primary bg-primary/5 shadow-sm" 
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="flex flex-col items-start space-y-3">
              <div className={cn(
                "p-2 rounded-md transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className={cn(
                  "font-semibold transition-colors",
                  isActive ? "text-primary" : "text-foreground group-hover:text-primary"
                )}>
                  {item.label}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}