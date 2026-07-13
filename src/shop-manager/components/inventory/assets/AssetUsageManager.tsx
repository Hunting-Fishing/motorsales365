import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAssetUsage } from '@/hooks/inventory/useAssetUsage';
import { AssetUsageDialog } from './AssetUsageDialog';
import { UpdateReadingDialog } from './UpdateReadingDialog';
import { 
  Car, 
  Wrench, 
  Settings, 
  Trash2, 
  Plus,
  TrendingUp,
  Calendar,
  Gauge
} from 'lucide-react';
import { AssetUsageConfig, AssetType, UsageMetric } from '@/types/inventory/predictive';
import { format } from 'date-fns';

export function AssetUsageManager() {
  const { assets, isLoading, deleteAsset } = useAssetUsage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [readingDialogOpen, setReadingDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetUsageConfig | null>(null);

  const getAssetIcon = (type: AssetType) => {
    switch (type) {
      case 'vehicle':
        return <Car className="h-4 w-4" />;
      case 'equipment':
      case 'machinery':
        return <Settings className="h-4 w-4" />;
      case 'tool':
        return <Wrench className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getMetricLabel = (metric: UsageMetric): string => {
    const labels: Record<UsageMetric, string> = {
      engine_hours: 'Hours',
      mileage: 'km/mi',
      days: 'Days',
      weeks: 'Weeks',
      months: 'Months',
      years: 'Years'
    };
    return labels[metric] || metric;
  };

  const handleEdit = (asset: AssetUsageConfig) => {
    setSelectedAsset(asset);
    setDialogOpen(true);
  };

  const handleUpdateReading = (asset: AssetUsageConfig) => {
    setSelectedAsset(asset);
    setReadingDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      await deleteAsset(id);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedAsset(null);
  };

  const handleCloseReadingDialog = () => {
    setReadingDialogOpen(false);
    setSelectedAsset(null);
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
          <h2 className="text-2xl font-bold tracking-tight">Asset Usage Tracking</h2>
          <p className="text-muted-foreground">
            Track usage metrics for vehicles, equipment, and machinery
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Asset
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold">{assets.length}</p>
              </div>
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vehicles</p>
                <p className="text-2xl font-bold">
                  {assets.filter(a => a.asset_type === 'vehicle').length}
                </p>
              </div>
              <Car className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Equipment</p>
                <p className="text-2xl font-bold">
                  {assets.filter(a => a.asset_type === 'equipment' || a.asset_type === 'machinery').length}
                </p>
              </div>
              <Wrench className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {assets.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Assets Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first vehicle or equipment
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Asset
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Usage Metric</TableHead>
                  <TableHead>Current Reading</TableHead>
                  <TableHead>Avg. Usage/Day</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.asset_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {getAssetIcon(asset.asset_type as AssetType)}
                        {asset.asset_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {asset.usage_metric.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {asset.current_reading.toLocaleString()} {getMetricLabel(asset.usage_metric as UsageMetric)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {asset.average_usage_per_day ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          {asset.average_usage_per_day.toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {asset.last_reading_date 
                          ? format(new Date(asset.last_reading_date), 'MMM dd, yyyy')
                          : 'Never'
                        }
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateReading(asset)}
                        >
                          <Gauge className="h-4 w-4 mr-1" />
                          Update
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(asset)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(asset.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AssetUsageDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        asset={selectedAsset}
      />

      <UpdateReadingDialog
        open={readingDialogOpen}
        onClose={handleCloseReadingDialog}
        asset={selectedAsset}
      />
    </div>
  );
}
