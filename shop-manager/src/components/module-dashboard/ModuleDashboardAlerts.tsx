import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface Alert {
  type: 'warning' | 'critical';
  message: string;
  action?: () => void;
}

interface ModuleDashboardAlertsProps {
  alerts: Alert[];
}

export function ModuleDashboardAlerts({ alerts }: ModuleDashboardAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
            alert.type === 'critical'
              ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15'
              : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'
          }`}
          onClick={alert.action}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle
              className={`h-5 w-5 ${alert.type === 'critical' ? 'text-red-500' : 'text-amber-500'}`}
            />
            <span className="text-foreground">{alert.message}</span>
          </div>
          <Badge
            variant="outline"
            className={
              alert.type === 'critical'
                ? 'text-red-500 border-red-500'
                : 'text-amber-500 border-amber-500'
            }
          >
            {alert.type === 'critical' ? 'Critical' : 'Action Required'}
          </Badge>
        </div>
      ))}
    </div>
  );
}
