import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, AlertTriangle, Clock } from 'lucide-react';
import { useSystemStatusSummary, useSystemStatus, useSystemIncidents } from '@/hooks/useSystemStatus';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'operational':
      return 'bg-green-500';
    case 'degraded':
      return 'bg-yellow-500';
    case 'partial_outage':
      return 'bg-orange-500';
    case 'major_outage':
      return 'bg-red-500';
    case 'maintenance':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'operational':
      return 'All Systems Operational';
    case 'degraded':
      return 'Degraded Performance';
    case 'partial_outage':
      return 'Partial Outage';
    case 'major_outage':
      return 'Major Outage';
    case 'maintenance':
      return 'Maintenance';
    default:
      return 'Unknown Status';
  }
};

const formatUptime = (uptime: number) => {
  return `${uptime.toFixed(1)}%`;
};

const formatResponseTime = (time: number) => {
  return `${Math.round(time)}ms`;
};

const getTimeAgo = (timestamp: string) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
  return `${Math.floor(diffInMinutes / 1440)} days ago`;
};

export const SystemStatusWidget: React.FC = () => {
  const { data: summary, isLoading: summaryLoading } = useSystemStatusSummary();
  const { data: services, isLoading: servicesLoading } = useSystemStatus();
  const { data: incidents, isLoading: incidentsLoading } = useSystemIncidents();

  if (summaryLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>Loading system status...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall Status */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${getStatusColor(summary?.overallStatus || 'operational')}`} />
              <span className="text-sm">{getStatusText(summary?.overallStatus || 'operational')}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Uptime: </span>
              <span className="font-medium">{formatUptime(summary?.averageUptime || 99.9)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Response Time: </span>
              <span className="font-medium">{formatResponseTime(summary?.averageResponseTime || 120)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Last Update: </span>
              <span className="font-medium">{getTimeAgo(summary?.lastUpdate || new Date().toISOString())}</span>
            </div>
          </div>

          {/* Active Incidents */}
          {(summary?.activeIncidents || 0) > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Active Incidents</span>
                <Badge variant="outline">{summary?.activeIncidents}</Badge>
              </div>
              
              {!incidentsLoading && (incidents || []).slice(0, 3).map((incident) => (
                <div key={incident.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={incident.severity === 'critical' ? 'destructive' : 'outline'}>
                      {incident.severity}
                    </Badge>
                    <span>{incident.title}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{getTimeAgo(incident.startedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Service Details */}
          {!servicesLoading && (services || []).length > 0 && (
            <div className="border-t pt-4">
              <div className="text-sm font-medium mb-2">Service Status</div>
              <div className="grid gap-2">
                {services?.slice(0, 6).map((service) => (
                  <div key={service.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(service.status)}`} />
                      <span>{service.serviceName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{formatUptime(service.uptimePercentage)}</span>
                      <span>{formatResponseTime(service.responseTimeMs)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};