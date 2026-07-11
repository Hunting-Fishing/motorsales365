import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  Clock, 
  Beaker, 
  Package, 
  TrendingUp, 
  TrendingDown,
  Percent
} from 'lucide-react';
import { usePowerWashingCosting } from '@/hooks/power-washing/usePowerWashingCosting';
import { Skeleton } from '@/components/ui/skeleton';

interface JobCostingTabProps {
  jobId: string;
  quotedPrice?: number;
  finalPrice?: number;
}

export function JobCostingTab({ jobId, quotedPrice, finalPrice }: JobCostingTabProps) {
  const costing = usePowerWashingCosting(jobId, quotedPrice, finalPrice);

  if (costing.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  const isProfitable = costing.grossProfit >= 0;
  const marginColor = costing.profitMargin >= 30 
    ? 'text-green-600' 
    : costing.profitMargin >= 15 
      ? 'text-amber-600' 
      : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Profit Summary */}
      <Card className={isProfitable ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Gross Profit</p>
              <p className={`text-3xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                ${costing.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Profit Margin</p>
              <div className="flex items-center gap-2">
                {isProfitable ? (
                  <TrendingUp className={`h-5 w-5 ${marginColor}`} />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
                <span className={`text-2xl font-bold ${marginColor}`}>
                  {costing.profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          <Progress 
            value={Math.min(Math.max(costing.profitMargin, 0), 100)} 
            className="mt-4 h-2"
          />
        </CardContent>
      </Card>

      {/* Revenue vs Cost */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">${costing.revenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-xl font-bold">${costing.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Labor */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Labor</p>
                <p className="text-sm text-muted-foreground">
                  {costing.laborHours.toFixed(1)} hours
                </p>
              </div>
            </div>
            <p className="font-semibold">${costing.laborCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>

          {/* Chemicals */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Beaker className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium">Chemicals</p>
                <p className="text-sm text-muted-foreground">
                  {costing.chemicalUsage.length} item(s)
                </p>
              </div>
            </div>
            <p className="font-semibold">${costing.chemicalsCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>

          {/* Materials */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">Materials</p>
                <p className="text-sm text-muted-foreground">
                  {costing.materialUsage.length} item(s)
                </p>
              </div>
            </div>
            <p className="font-semibold">${costing.materialsCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>

          {/* Overhead */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Percent className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium">Overhead (15%)</p>
                <p className="text-sm text-muted-foreground">Applied to direct costs</p>
              </div>
            </div>
            <p className="font-semibold">${costing.overheadCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border-2 border-primary/20">
            <p className="font-bold">Total Cost</p>
            <p className="text-xl font-bold text-primary">${costing.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </CardContent>
      </Card>

      {/* Material Details */}
      {costing.materialUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Materials Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {costing.materialUsage.map((material) => (
                <div key={material.id} className="flex items-center justify-between text-sm">
                  <span>{material.item_name}</span>
                  <span className="text-muted-foreground">
                    {material.quantity_used} × ${material.unit_cost_at_use} = ${material.total_cost.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
