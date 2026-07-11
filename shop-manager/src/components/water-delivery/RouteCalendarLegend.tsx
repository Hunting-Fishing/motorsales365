import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Building2, Home, AlertTriangle, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RouteCalendarLegendProps {
  className?: string;
  collapsed?: boolean;
}

export function RouteCalendarLegend({ className, collapsed: initialCollapsed = false }: RouteCalendarLegendProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const priorityColors = [
    { label: 'Emergency', color: 'bg-red-500', icon: AlertTriangle, description: 'Urgent delivery required' },
    { label: 'High', color: 'bg-orange-500', icon: AlertCircle, description: 'Priority delivery' },
    { label: 'Normal', color: 'bg-cyan-500', icon: Clock, description: 'Standard delivery' },
    { label: 'Low', color: 'bg-gray-400', icon: CheckCircle, description: 'Flexible timing' },
  ];

  const customerTypes = [
    { label: 'Business', color: 'bg-blue-500', icon: Building2 },
    { label: 'Residential', color: 'bg-green-500', icon: Home },
  ];

  const statusColors = [
    { label: 'Planned', color: 'border-2 border-slate-400 bg-transparent' },
    { label: 'In Progress', color: 'bg-blue-500' },
    { label: 'Completed', color: 'bg-green-600' },
    { label: 'Cancelled', color: 'bg-red-600' },
  ];

  return (
    <Card className={cn('transition-all duration-200', className)}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Legend</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {!collapsed && (
        <CardContent className="pt-0 pb-4 px-4 space-y-4">
          {/* Priority Legend */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Priority</p>
            <div className="grid grid-cols-2 gap-2">
              {priorityColors.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={cn('h-3 w-3 rounded-full', item.color)} />
                  <span className="text-xs">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Type Legend */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Customer Type</p>
            <div className="flex gap-4">
              {customerTypes.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <item.icon className={cn('h-4 w-4', 
                    item.label === 'Business' ? 'text-blue-500' : 'text-green-500'
                  )} />
                  <span className="text-xs">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Legend */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Status</p>
            <div className="grid grid-cols-2 gap-2">
              {statusColors.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={cn('h-3 w-3 rounded-sm', item.color)} />
                  <span className="text-xs">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
