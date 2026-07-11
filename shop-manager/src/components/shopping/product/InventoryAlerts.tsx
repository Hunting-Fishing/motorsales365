// Inventory Alerts Dashboard Component
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Package, 
  CheckCircle, 
  XCircle, 
  Bell,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { InventoryAlert } from '@/types/advanced-product';
import { inventoryAlertService } from '@/services/advanced-product/inventoryAlertService';
import { toast } from 'sonner';

interface InventoryAlertsProps {
  productId?: string;
  variantId?: string;
  showActions?: boolean;
  compact?: boolean;
  limit?: number;
}

export default function InventoryAlerts({
  productId,
  variantId,
  showActions = true,
  compact = false,
  limit
}: InventoryAlertsProps) {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    total_active: number;
    by_type: Record<string, number>;
    critical_count: number;
    recent_count: number;
  } | null>(null);

  useEffect(() => {
    loadAlerts();
    if (!productId && !variantId) {
      loadStats();
    }
  }, [productId, variantId, limit]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      let alertData: InventoryAlert[];

      if (productId) {
        alertData = await inventoryAlertService.getProductAlerts(productId);
      } else if (variantId) {
        alertData = await inventoryAlertService.getVariantAlerts(variantId);
      } else {
        alertData = await inventoryAlertService.getActiveAlerts({ limit });
      }

      setAlerts(alertData);
    } catch (error) {
      console.error('Error loading inventory alerts:', error);
      toast.error('Failed to load inventory alerts');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await inventoryAlertService.getAlertStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading alert stats:', error);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await inventoryAlertService.acknowledgeAlert(alertId);
      toast.success('Alert acknowledged');
      loadAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await inventoryAlertService.resolveAlert(alertId);
      toast.success('Alert resolved');
      loadAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  const checkStockLevels = async () => {
    try {
      const newAlerts = await inventoryAlertService.checkStockLevels();
      if (newAlerts.length > 0) {
        toast.success(`Created ${newAlerts.length} new stock alerts`);
        loadAlerts();
      } else {
        toast.info('No new stock issues detected');
      }
    } catch (error) {
      console.error('Error checking stock levels:', error);
      toast.error('Failed to check stock levels');
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'out_of_stock':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'low_stock':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'overstocked':
        return <TrendingDown className="h-4 w-4 text-blue-600" />;
      case 'reorder_point':
        return <Bell className="h-4 w-4 text-orange-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAlertBadgeVariant = (alertType: string) => {
    switch (alertType) {
      case 'out_of_stock':
        return 'destructive';
      case 'low_stock':
        return 'secondary';
      case 'overstocked':
        return 'outline';
      case 'reorder_point':
        return 'default';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 bg-muted rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact && alerts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Inventory Alerts
              {alerts.length > 0 && (
                <Badge variant="secondary">{alerts.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Monitor stock levels and inventory issues
            </CardDescription>
          </div>
          {showActions && !productId && !variantId && (
            <Button
              variant="outline"
              size="sm"
              onClick={checkStockLevels}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Stock
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats Overview */}
        {stats && !productId && !variantId && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.critical_count}</div>
              <div className="text-xs text-muted-foreground">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total_active}</div>
              <div className="text-xs text-muted-foreground">Total Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.recent_count}</div>
              <div className="text-xs text-muted-foreground">Last 24h</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.by_type.low_stock || 0}
              </div>
              <div className="text-xs text-muted-foreground">Low Stock</div>
            </div>
          </div>
        )}

        {stats && <Separator />}

        {/* Alerts List */}
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
            <p className="text-muted-foreground">No active inventory alerts</p>
            <p className="text-sm text-muted-foreground">All stock levels look good!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Alert
                key={alert.id}
                className={
                  alert.alert_type === 'out_of_stock'
                    ? 'border-red-200 bg-red-50'
                    : alert.alert_type === 'low_stock'
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-blue-200 bg-blue-50'
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getAlertIcon(alert.alert_type)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getAlertBadgeVariant(alert.alert_type)}>
                          {alert.alert_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(alert.created_at)}
                        </span>
                      </div>
                      
                      <AlertDescription className="font-medium">
                        {alert.message ||
                          `${alert.product?.title || alert.variant?.variant_name} - ${alert.alert_type.replace('_', ' ')}`
                        }
                      </AlertDescription>
                      
                      <div className="text-xs text-muted-foreground">
                        Current: {alert.current_value} | Threshold: {alert.threshold_value}
                        {alert.variant && (
                          <span> | Variant: {alert.variant.variant_value}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {showActions && alert.status === 'active' && (
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAcknowledge(alert.id)}
                      >
                        Acknowledge
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolve(alert.id)}
                      >
                        Resolve
                      </Button>
                    </div>
                  )}
                </div>

                {alert.status !== 'active' && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Status: {alert.status}
                    {alert.acknowledged_at && (
                      <span> | Acknowledged: {formatDate(alert.acknowledged_at)}</span>
                    )}
                    {alert.resolved_at && (
                      <span> | Resolved: {formatDate(alert.resolved_at)}</span>
                    )}
                  </div>
                )}
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}