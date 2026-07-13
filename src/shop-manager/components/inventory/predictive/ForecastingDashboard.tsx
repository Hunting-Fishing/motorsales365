import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, AlertTriangle, Package, Calendar } from 'lucide-react';
import { InventoryForecast } from '@/types/inventory/predictive';
import { getInventoryForecasts } from '@/services/inventory/predictiveService';
import { getInventoryItems } from '@/services/inventory/crudService';
import { InventoryItemExtended } from '@/types/inventory';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

export function ForecastingDashboard() {
  const [forecasts, setForecasts] = useState<InventoryForecast[]>([]);
  const [items, setItems] = useState<Record<string, InventoryItemExtended>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [forecastData, itemsData] = await Promise.all([
        getInventoryForecasts(),
        getInventoryItems(),
      ]);

      setForecasts(forecastData);
      
      const itemsMap: Record<string, InventoryItemExtended> = {};
      itemsData.forEach((item) => {
        itemsMap[item.id] = item;
      });
      setItems(itemsMap);
    } catch (error) {
      console.error('Error loading forecast data:', error);
    } finally {
      setLoading(false);
    }
  };

  const criticalForecasts = forecasts.filter((f) => {
    if (!f.predicted_runout_date) return false;
    const daysUntilRunout = Math.ceil(
      (new Date(f.predicted_runout_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilRunout <= 30;
  });

  const getUrgencyBadge = (forecast: InventoryForecast) => {
    if (!forecast.predicted_runout_date) return null;
    
    const daysUntilRunout = Math.ceil(
      (new Date(forecast.predicted_runout_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilRunout <= 7) {
      return <Badge variant="destructive">Critical - {daysUntilRunout}d</Badge>;
    } else if (daysUntilRunout <= 14) {
      return <Badge className="bg-orange-500">Urgent - {daysUntilRunout}d</Badge>;
    } else if (daysUntilRunout <= 30) {
      return <Badge className="bg-yellow-500">Warning - {daysUntilRunout}d</Badge>;
    }
    return <Badge variant="outline">{daysUntilRunout}d</Badge>;
  };

  if (loading) {
    return <div className="p-6">Loading forecasts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Forecasts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{forecasts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active predictions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {criticalForecasts.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Running out soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forecasts.length > 0
                ? Math.round(
                    forecasts.reduce((sum, f) => sum + (f.confidence_level || 0), 0) /
                      forecasts.length
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">Prediction accuracy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reorder Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {forecasts.filter((f) => {
                if (!f.recommended_reorder_date) return false;
                const daysUntil = Math.ceil(
                  (new Date(f.recommended_reorder_date).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                );
                return daysUntil <= 14;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Within 2 weeks</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecasts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage-Based Forecasts
          </CardTitle>
          <CardDescription>
            Predicted stock runout dates based on consumption patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {forecasts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No forecasts available yet</p>
              <p className="text-sm">Forecasts will appear as usage data is collected</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Consumption Rate</TableHead>
                  <TableHead>Predicted Runout</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Reorder By</TableHead>
                  <TableHead>Reorder Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecasts.map((forecast) => {
                  const item = items[forecast.inventory_item_id];
                  return (
                    <TableRow key={forecast.id}>
                      <TableCell className="font-medium">
                        {item?.name || 'Unknown Item'}
                        <div className="text-xs text-muted-foreground">{item?.sku}</div>
                      </TableCell>
                      <TableCell>{forecast.current_stock.toFixed(2)}</TableCell>
                      <TableCell>
                        {forecast.average_consumption_rate.toFixed(4)}/day
                      </TableCell>
                      <TableCell>
                        {forecast.predicted_runout_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(forecast.predicted_runout_date), 'MMM dd, yyyy')}
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>{getUrgencyBadge(forecast)}</TableCell>
                      <TableCell>
                        {forecast.recommended_reorder_date
                          ? format(new Date(forecast.recommended_reorder_date), 'MMM dd')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {forecast.recommended_reorder_quantity?.toFixed(0) || 'N/A'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
