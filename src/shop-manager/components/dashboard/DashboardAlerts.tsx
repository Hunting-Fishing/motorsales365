
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, User, Clock, Bell } from "lucide-react";
import { getDashboardAlerts, DashboardAlert } from "@/services/dashboard/alertsService";

export function DashboardAlerts() {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await getDashboardAlerts();
        setAlerts(data);
      } catch (error) {
        console.error("Error loading dashboard alerts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'inventory':
        return <Package className="h-4 w-4" />;
      case 'follow_up':
        return <User className="h-4 w-4" />;
      case 'maintenance':
        return <Clock className="h-4 w-4" />;
      case 'reminder':
        return <Bell className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No active alerts</p>
            <p className="text-sm">Your inventory levels and systems are all good!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className={`p-3 border rounded-lg ${getPriorityColor(alert.priority)}`}>
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-sm">{alert.message}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {alert.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
