import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CategoryBudgetSummary } from '@/hooks/useBudgetData';

interface BudgetAlertsPanelProps {
  categorySummaries: CategoryBudgetSummary[];
}

export function BudgetAlertsPanel({ categorySummaries }: BudgetAlertsPanelProps) {
  const overBudget = categorySummaries.filter(c => c.utilizationPercent > 100);
  const nearLimit = categorySummaries.filter(c => c.utilizationPercent >= 80 && c.utilizationPercent <= 100);
  const onTrack = categorySummaries.filter(c => c.utilizationPercent < 80);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Over Budget */}
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Over Budget</CardTitle>
          </div>
          <CardDescription>Categories that have exceeded their budget</CardDescription>
        </CardHeader>
        <CardContent>
          {overBudget.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No categories over budget
            </p>
          ) : (
            <div className="space-y-4">
              {overBudget.map((cat) => (
                <div key={cat.categoryId} className="p-4 rounded-lg bg-destructive/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{cat.categoryName}</span>
                    <Badge variant="destructive">
                      {cat.utilizationPercent.toFixed(0)}% used
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Spent: {formatCurrency(cat.actual)}
                    </span>
                    <span className="text-destructive font-medium">
                      Over by {formatCurrency(Math.abs(cat.variance))}
                    </span>
                  </div>
                  <Progress value={100} className="bg-destructive/20" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Near Limit */}
      <Card className="border-yellow-500/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-yellow-600">Approaching Limit</CardTitle>
          </div>
          <CardDescription>Categories at 80% or more of budget</CardDescription>
        </CardHeader>
        <CardContent>
          {nearLimit.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No categories approaching limit
            </p>
          ) : (
            <div className="space-y-4">
              {nearLimit.map((cat) => (
                <div key={cat.categoryId} className="p-4 rounded-lg bg-yellow-500/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{cat.categoryName}</span>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                      {cat.utilizationPercent.toFixed(0)}% used
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Spent: {formatCurrency(cat.actual)} / {formatCurrency(cat.planned)}
                    </span>
                    <span className="text-yellow-600 font-medium">
                      {formatCurrency(cat.variance)} remaining
                    </span>
                  </div>
                  <Progress value={cat.utilizationPercent} className="bg-yellow-100" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* On Track */}
      <Card className="border-green-500/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <CardTitle className="text-green-600">On Track</CardTitle>
          </div>
          <CardDescription>Categories under 80% of budget</CardDescription>
        </CardHeader>
        <CardContent>
          {onTrack.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No categories on track
            </p>
          ) : (
            <div className="space-y-4">
              {onTrack.map((cat) => (
                <div key={cat.categoryId} className="p-4 rounded-lg bg-green-500/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{cat.categoryName}</span>
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      {cat.utilizationPercent.toFixed(0)}% used
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Spent: {formatCurrency(cat.actual)} / {formatCurrency(cat.planned)}
                    </span>
                    <span className="text-green-600 font-medium">
                      {formatCurrency(cat.variance)} remaining
                    </span>
                  </div>
                  <Progress value={cat.utilizationPercent} className="bg-green-100" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
