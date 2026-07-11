import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConsumptionTracking } from '@/hooks/inventory/useConsumptionTracking';
import { RecordConsumptionDialog } from './RecordConsumptionDialog';
import { 
  PackageMinus,
  TrendingDown,
  Calendar,
  Plus,
  Trash2,
  Package,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

export function ConsumptionTracker() {
  const { consumptionHistory, consumptionRates, isLoading, deleteConsumption } = useConsumptionTracking();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'rates'>('history');

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this consumption record?')) {
      await deleteConsumption(id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Consumption Tracking</h2>
          <p className="text-muted-foreground">
            Log parts usage and track consumption patterns
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Record Consumption
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{consumptionHistory.length}</p>
              </div>
              <PackageMinus className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tracked Items</p>
                <p className="text-2xl font-bold">{consumptionRates.length}</p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  {consumptionHistory.filter(h => {
                    const date = new Date(h.consumed_at);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('history')}
        >
          Consumption History
        </Button>
        <Button
          variant={activeTab === 'rates' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('rates')}
        >
          Consumption Rates
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'history' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageMinus className="h-5 w-5" />
              Consumption History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {consumptionHistory.length === 0 ? (
              <div className="text-center py-12">
                <PackageMinus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Consumption Records</h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking parts usage by recording your first consumption
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Record First Consumption
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Service Package</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumptionHistory.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(record.consumed_at), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {record.inventory_items?.name || 'Unknown Item'}
                        <div className="text-xs text-muted-foreground">
                          {record.inventory_items?.sku}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-red-600">
                          -{record.quantity_consumed}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {record.usage_value} {record.usage_metric.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.service_packages?.name || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {record.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Consumption Rates
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {consumptionRates.length === 0 ? (
              <div className="text-center py-12">
                <TrendingDown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Consumption Rates</h3>
                <p className="text-muted-foreground mb-4">
                  Consumption rates are calculated automatically as you log usage
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Usage Metric</TableHead>
                    <TableHead>Consumption Per Unit</TableHead>
                    <TableHead>Average Consumption</TableHead>
                    <TableHead>Last Calculated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumptionRates.map((rate: any) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">
                        {rate.inventory_items?.name || 'Unknown Item'}
                        <div className="text-xs text-muted-foreground">
                          Stock: {rate.inventory_items?.quantity || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {rate.usage_metric.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {rate.consumption_per_unit.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {rate.average_consumption ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <TrendingDown className="h-4 w-4" />
                            {rate.average_consumption.toFixed(2)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rate.last_calculated_at 
                          ? format(new Date(rate.last_calculated_at), 'MMM dd, yyyy')
                          : 'Never'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <RecordConsumptionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
