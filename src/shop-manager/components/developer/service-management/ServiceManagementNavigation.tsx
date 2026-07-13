
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, TreePine, Table, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    path: '/developer/service-management/overview',
    label: 'Live Overview',
    icon: BarChart3
  },
  {
    path: '/developer/service-management/tree',
    label: 'Live Tree View',
    icon: TreePine
  },
  {
    path: '/developer/service-management/excel',
    label: 'Live Excel View',
    icon: Table
  },
  {
    path: '/developer/service-management/import',
    label: 'Import to Live DB',
    icon: Upload
  }
];

export function ServiceManagementNavigation() {
  const location = useLocation();
  
  return (
    <nav className="flex space-x-1 bg-muted p-1 rounded-lg">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
