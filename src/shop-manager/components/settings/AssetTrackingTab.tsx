import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, Wrench, AlertTriangle, TrendingUp, Plus, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const AssetTrackingTab = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_tracking')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      toast({
        title: "Error loading assets",
        description: "Failed to load asset tracking data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading asset data...</div>;
  }

  const totalValue = assets.reduce((sum, asset) => sum + (asset.current_value || asset.purchase_price || 0), 0);
  const needMaintenance = assets.filter(asset => 
    asset.condition_status === 'poor' || asset.condition_status === 'needs_maintenance'
  ).length;
  const needsAttention = assets.filter(asset => 
    asset.condition_status === 'poor' || !asset.purchase_date
  ).length;

  const assetsByType = assets.reduce((acc, asset) => {
    acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1;
    return acc;
  }, {});

  const highValueAssets = assets
    .filter(asset => (asset.current_value || asset.purchase_price || 0) > 10000)
    .sort((a, b) => (b.current_value || b.purchase_price || 0) - (a.current_value || a.purchase_price || 0))
    .slice(0, 5);

  const grantFundedAssets = assets.filter(asset => asset.grant_funded);

  const originalCost = assets.reduce((sum, asset) => sum + (asset.purchase_price || 0), 0);
  const currentValue = assets.reduce((sum, asset) => sum + (asset.current_value || asset.purchase_price || 0), 0);
  const accumulatedDepreciation = originalCost - currentValue;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Asset Tracking</h2>
          <p className="text-muted-foreground">Track and manage organizational assets, equipment, and vehicles</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter Assets
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Asset Search
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Asset Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold text-foreground">{assets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-foreground">${(totalValue / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Wrench className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Need Maintenance</p>
                <p className="text-2xl font-bold text-foreground">{needMaintenance}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
                <p className="text-2xl font-bold text-foreground">{needsAttention}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Categories</CardTitle>
          <CardDescription>
            View assets organized by category and type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(assetsByType).length === 0 ? (
              <p className="text-muted-foreground text-center py-8 col-span-full">No assets found</p>
            ) : (
              Object.entries(assetsByType).map(([type, count]) => (
                <div key={type} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground capitalize">{String(type).replace('_', ' ')}</h4>
                      <p className="text-sm text-muted-foreground">{String(count)} items</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* High-Value Assets */}
      <Card>
        <CardHeader>
          <CardTitle>High-Value Assets</CardTitle>
          <CardDescription>
            Monitor your most valuable assets and their condition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {highValueAssets.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No high-value assets found</p>
            ) : (
              highValueAssets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{asset.asset_name}</h4>
                      <p className="text-sm text-muted-foreground">Tag: {asset.asset_tag || 'N/A'} • Purchase Date: {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : 'N/A'}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground">Location: {asset.location || 'Not specified'}</span>
                        <span className="text-xs text-muted-foreground">Value: ${(asset.current_value || asset.purchase_price || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={
                      asset.condition_status === 'excellent' ? "bg-green-500/10 text-green-700 hover:bg-green-500/20" :
                      asset.condition_status === 'good' ? "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20" :
                      asset.condition_status === 'fair' ? "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20" :
                      "bg-red-500/10 text-red-700 hover:bg-red-500/20"
                    }>
                      {asset.condition_status || 'Unknown'}
                    </Badge>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Depreciation & Lifecycle */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Lifecycle & Depreciation</CardTitle>
          <CardDescription>
            Track asset depreciation and replacement planning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Depreciation Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Original Cost</span>
                  <span className="font-medium">${originalCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Accumulated Depreciation</span>
                  <span className="font-medium text-red-600">-${accumulatedDepreciation.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Current Book Value</span>
                  <span className="font-bold text-green-600">${currentValue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Replacement Planning</h4>
              <div className="space-y-3">
                {assets.filter(a => a.useful_life_years && a.purchase_date).slice(0, 3).map((asset) => {
                  const purchaseYear = new Date(asset.purchase_date).getFullYear();
                  const replacementYear = purchaseYear + (asset.useful_life_years || 5);
                  return (
                    <div key={asset.id} className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{asset.asset_name}</span>
                        <span className="text-xs text-muted-foreground">{replacementYear}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Expected replacement cost: ${(asset.current_value || asset.purchase_price || 0).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grant-Funded Assets */}
      {grantFundedAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Grant-Funded Assets</CardTitle>
            <CardDescription>
              Assets purchased with grant funding and their compliance requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {grantFundedAssets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-4 border border-green-200 bg-green-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-foreground">{asset.asset_name}</h4>
                    <p className="text-sm text-muted-foreground">Purchase Date: {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : 'N/A'}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground">Value: ${(asset.purchase_price || 0).toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">Grant-funded asset</span>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20">Grant Funded</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};