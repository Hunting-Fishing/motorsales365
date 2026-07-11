
import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface CategoryCounts {
  [key: string]: number;
}

interface NotificationsTabNavigationProps {
  activeTab: string;
  notificationsCount: number;
  unreadCount: number;
  categoryCounts: CategoryCounts;
}

export function NotificationsTabNavigation({
  activeTab,
  notificationsCount,
  unreadCount,
  categoryCounts
}: NotificationsTabNavigationProps) {
  return (
    <div className="px-4 py-2 border-b border-slate-100">
      <TabsList className="grid grid-cols-4 h-8">
        <TabsTrigger value="all" className="text-xs h-7">
          All
          {notificationsCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1 py-0 h-4 min-w-4">{notificationsCount}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="unread" className="text-xs h-7">
          Unread
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1 py-0 h-4 min-w-4">{unreadCount}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="workOrder" className="text-xs h-7">
          Work Orders
          {categoryCounts.workOrder && (
            <Badge variant="secondary" className="ml-1 px-1 py-0 h-4 min-w-4">{categoryCounts.workOrder}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="inventory" className="text-xs h-7">
          Inventory
          {categoryCounts.inventory && (
            <Badge variant="secondary" className="ml-1 px-1 py-0 h-4 min-w-4">{categoryCounts.inventory}</Badge>
          )}
        </TabsTrigger>
      </TabsList>
    </div>
  );
}
