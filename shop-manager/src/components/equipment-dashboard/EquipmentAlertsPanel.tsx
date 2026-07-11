import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, FileWarning, XCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';

interface Alert {
  id: string;
  type: 'overdue' | 'high_hours' | 'expired_doc' | 'out_of_service';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  equipmentId: string;
}

export function EquipmentAlertsPanel() {
  const navigate = useNavigate();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['equipment-alerts'],
    queryFn: async () => {
      const alertsList: Alert[] = [];
      const now = new Date();

      // Get overdue maintenance
      const { data: overdueEquipment } = await supabase
        .from('equipment_assets')
        .select('id, name, next_service_date')
        .not('next_service_date', 'is', null)
        .lt('next_service_date', now.toISOString().split('T')[0])
        .limit(10);

      overdueEquipment?.forEach(eq => {
        const daysOverdue = Math.abs(differenceInDays(parseISO(eq.next_service_date!), now));
        alertsList.push({
          id: `overdue-${eq.id}`,
          type: 'overdue',
          severity: daysOverdue > 7 ? 'critical' : 'warning',
          title: `${eq.name} - Maintenance Overdue`,
          description: `${daysOverdue} days overdue for scheduled maintenance`,
          equipmentId: eq.id
        });
      });

      // Get high hour equipment (>1000 hours since last service)
      const { data: highHourEquipment } = await supabase
        .from('equipment_assets')
        .select('id, name, current_hours')
        .gt('current_hours', 1000)
        .limit(5);

      highHourEquipment?.forEach(eq => {
        alertsList.push({
          id: `hours-${eq.id}`,
          type: 'high_hours',
          severity: eq.current_hours! > 2000 ? 'critical' : 'warning',
          title: `${eq.name} - High Hours`,
          description: `${eq.current_hours?.toLocaleString()} hours - consider maintenance check`,
          equipmentId: eq.id
        });
      });

      // Get out of service equipment
      const { data: outOfService } = await supabase
        .from('equipment_assets')
        .select('id, name, status')
        .in('status', ['down', 'retired'])
        .limit(5);

      outOfService?.forEach(eq => {
        alertsList.push({
          id: `oos-${eq.id}`,
          type: 'out_of_service',
          severity: 'critical',
          title: `${eq.name} - Out of Service`,
          description: 'Equipment is currently unavailable',
          equipmentId: eq.id
        });
      });

      // Get expiring documents (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data: expiringDocs } = await supabase
        .from('equipment_documents')
        .select('id, name, expiry_date, equipment_id')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .gte('expiry_date', now.toISOString().split('T')[0])
        .limit(5);

      expiringDocs?.forEach(doc => {
        const daysUntil = differenceInDays(parseISO(doc.expiry_date!), now);
        alertsList.push({
          id: `doc-${doc.id}`,
          type: 'expired_doc',
          severity: daysUntil <= 7 ? 'critical' : 'warning',
          title: `Document Expiring - ${doc.name}`,
          description: `Expires in ${daysUntil} days`,
          equipmentId: doc.equipment_id
        });
      });

      // Sort by severity
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return alertsList.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    }
  });

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'overdue': return Clock;
      case 'high_hours': return AlertTriangle;
      case 'expired_doc': return FileWarning;
      case 'out_of_service': return XCircle;
      default: return AlertTriangle;
    }
  };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Equipment Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Equipment Alerts
          {alerts && alerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>No active alerts</p>
            <p className="text-sm">All equipment is in good standing</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {alerts?.map((alert) => {
              const Icon = getAlertIcon(alert.type);
              return (
                <div 
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity ${getSeverityColor(alert.severity)}`}
                  onClick={() => navigate(`/equipment/${alert.equipmentId}`)}
                >
                  <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{alert.title}</p>
                    <p className="text-xs opacity-80">{alert.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {alert.severity}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
