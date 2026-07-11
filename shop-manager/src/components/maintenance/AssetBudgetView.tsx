import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ship, Truck, Wrench, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface AssetBudgetViewProps {
  budgets: any[];
}

export function AssetBudgetView({ budgets }: AssetBudgetViewProps) {
  const [selectedAssetType, setSelectedAssetType] = useState<string>('all');
  const [selectedAsset, setSelectedAsset] = useState<string>('all');

  // Fetch equipment assets
  const { data: equipment = [], isLoading: loadingEquipment } = useQuery({
    queryKey: ['equipment-assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_assets')
        .select('id, name, status')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch vehicles
  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, make, model, year, vin')
        .order('make');
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate totals by asset
  const assetBudgetData = budgets.reduce((acc: any[], budget) => {
    const assetId = budget.equipment_id || budget.vehicle_id;
    if (!assetId) return acc;

    const existing = acc.find(a => a.assetId === assetId);
    if (existing) {
      existing.budget += budget.total_budget || 0;
      existing.spent += budget.total_spent || 0;
    } else {
      const equip = equipment.find(e => e.id === assetId);
      const vehicle = vehicles.find(v => v.id === assetId);
      acc.push({
        assetId,
        assetName: equip?.name || (vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown'),
        assetType: budget.equipment_id ? 'equipment' : 'vehicle',
        budget: budget.total_budget || 0,
        spent: budget.total_spent || 0,
      });
    }
    return acc;
  }, []);

  // Filter by asset type
  const filteredAssetData = assetBudgetData.filter(a => 
    selectedAssetType === 'all' || a.assetType === selectedAssetType
  );

  // Calculate comparison data for chart
  const comparisonData = filteredAssetData.slice(0, 8).map(asset => ({
    name: asset.assetName.length > 15 ? asset.assetName.slice(0, 15) + '...' : asset.assetName,
    budget: asset.budget,
    spent: asset.spent,
    utilization: asset.budget > 0 ? Math.round((asset.spent / asset.budget) * 100) : 0,
  }));

  // Summary stats
  const totalAssetBudget = filteredAssetData.reduce((sum, a) => sum + a.budget, 0);
  const totalAssetSpent = filteredAssetData.reduce((sum, a) => sum + a.spent, 0);
  const avgUtilization = totalAssetBudget > 0 
    ? Math.round((totalAssetSpent / totalAssetBudget) * 100) 
    : 0;

  const isLoading = loadingEquipment || loadingVehicles;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[200px]">
              <Select value={selectedAssetType} onValueChange={setSelectedAssetType}>
                <SelectTrigger>
                  <SelectValue placeholder="Asset Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assets</SelectItem>
                  <SelectItem value="equipment">Equipment Only</SelectItem>
                  <SelectItem value="vehicle">Vehicles Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ship className="h-4 w-4" />
              Equipment Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{equipment.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Tracked assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Vehicle Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{vehicles.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Fleet vehicles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Asset Budgets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalAssetBudget)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total allocated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg. Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgUtilization}%</p>
            <p className="text-xs text-muted-foreground mt-1">Budget used</p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Budget Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Asset Budget Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {comparisonData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No asset-specific budgets created yet</p>
              <p className="text-sm mt-2">Link budgets to specific equipment or vehicles to see data here</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={comparisonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(v) => `$${v/1000}k`} className="text-xs" />
                <YAxis type="category" dataKey="name" width={120} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="budget" name="Budget" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="spent" name="Spent" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Asset Budget List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Asset Budget Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAssetData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No asset-specific budgets found. Create budgets and link them to equipment or vehicles.
              </p>
            ) : (
              filteredAssetData.map((asset) => {
                const utilization = asset.budget > 0 
                  ? Math.round((asset.spent / asset.budget) * 100) 
                  : 0;
                const isOverBudget = asset.spent > asset.budget;
                
                return (
                  <div key={asset.assetId} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {asset.assetType === 'equipment' ? (
                          <Ship className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Truck className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{asset.assetName}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {asset.assetType === 'equipment' ? 'Equipment' : 'Vehicle'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(asset.spent)}</p>
                        <p className="text-sm text-muted-foreground">
                          of {formatCurrency(asset.budget)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Budget Utilization</span>
                        <span className={isOverBudget ? 'text-destructive' : ''}>
                          {utilization}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(utilization, 100)} 
                        className={`h-2 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
