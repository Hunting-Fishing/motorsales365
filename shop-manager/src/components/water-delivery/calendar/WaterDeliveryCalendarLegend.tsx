import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, Route, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WaterDeliveryCalendarLegendProps {
  collapsed?: boolean;
}

const legendItems = [
  {
    section: 'Event Types',
    items: [
      { icon: Route, label: 'Route', color: 'bg-emerald-500' },
      { icon: Droplets, label: 'Order', color: 'bg-blue-500' },
    ],
  },
  {
    section: 'Priority',
    items: [
      { icon: AlertTriangle, label: 'Emergency', color: 'bg-red-500' },
      { icon: null, label: 'High', color: 'bg-orange-500' },
      { icon: null, label: 'Normal', color: 'bg-cyan-500' },
      { icon: null, label: 'Low', color: 'bg-gray-400' },
    ],
  },
  {
    section: 'Status',
    items: [
      { icon: Clock, label: 'Pending', color: 'bg-amber-500' },
      { icon: null, label: 'Scheduled', color: 'bg-slate-500' },
      { icon: null, label: 'In Progress', color: 'bg-blue-500' },
      { icon: CheckCircle2, label: 'Completed', color: 'bg-green-500' },
      { icon: XCircle, label: 'Cancelled', color: 'bg-red-500' },
    ],
  },
];

export function WaterDeliveryCalendarLegend({ collapsed = false }: WaterDeliveryCalendarLegendProps) {
  if (collapsed) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-3">
            {legendItems.flatMap(section =>
              section.items.slice(0, 2).map((item, i) => (
                <div key={`${section.section}-${i}`} className="flex items-center gap-1.5 text-xs">
                  <div className={cn('w-2.5 h-2.5 rounded', item.color)} />
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">Legend</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-4">
        {legendItems.map(section => (
          <div key={section.section}>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">{section.section}</h4>
            <div className="space-y-1.5">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className={cn('w-3 h-3 rounded', item.color)} />
                  {item.icon && <item.icon className="h-3 w-3 text-muted-foreground" />}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
