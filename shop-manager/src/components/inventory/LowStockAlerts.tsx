import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, Bell } from 'lucide-react';
import { useLowStockAlerts } from '@/hooks/inventory/useLowStockAlerts';
import { useNavigate } from 'react-router-dom';

export function LowStockAlerts() {
  const { alerts, alertStats, isLoading, acknowledgeAlert } = useLowStockAlerts();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading alerts...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>
              Items requiring attention
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="destructive">
              {alertStats.critical} Critical
            </Badge>
            <Badge variant="secondary">
              {alertStats.warning} Warning
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">All stock levels are healthy</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <AlertTriangle
                    className={`h-5 w-5 ${
                      alert.current_quantity <= 0
                        ? 'text-destructive'
                        : 'text-yellow-600'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{alert.item_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Current: {alert.current_quantity} | Reorder at: {alert.reorder_point}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/inventory')}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Reorder
                  </Button>
                </div>
              </div>
            ))}
            {alerts.length > 5 && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/inventory')}
              >
                View All {alerts.length} Alerts
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
