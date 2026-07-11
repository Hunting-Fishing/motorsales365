import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, Droplets, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WaterDeliveryCalendarStatsProps {
  totalOrders: number;
  totalGallons: number;
  activeDrivers: number;
  unassigned: number;
}

export function WaterDeliveryCalendarStats({
  totalOrders,
  totalGallons,
  activeDrivers,
  unassigned,
}: WaterDeliveryCalendarStatsProps) {
  const stats = [
    {
      label: 'Total Orders',
      value: totalOrders,
      icon: ClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Total Gallons',
      value: totalGallons.toLocaleString(),
      icon: Droplets,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    },
    {
      label: 'Active Drivers',
      value: activeDrivers,
      icon: Users,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      label: 'Unassigned',
      value: unassigned,
      icon: AlertCircle,
      color: unassigned > 0 ? 'text-orange-600' : 'text-slate-500',
      bgColor: unassigned > 0 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-slate-100 dark:bg-slate-800',
      highlight: unassigned > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card 
          key={stat.label} 
          className={cn(
            'transition-all',
            stat.highlight && 'ring-2 ring-orange-400 ring-offset-2'
          )}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={cn('text-lg font-semibold', stat.color)}>{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
