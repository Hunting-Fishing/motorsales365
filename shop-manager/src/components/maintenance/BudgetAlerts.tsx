import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, CheckCircle, Bell, TrendingUp, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { MaintenanceBudget } from "@/hooks/useBudgetFilters";

interface BudgetAlertsProps {
  budgets: MaintenanceBudget[];
  stats: {
    totalBudget: number;
    totalSpent: number;
    remaining: number;
    utilizationPercent: number;
  };
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  budgetName?: string;
  value?: number;
  threshold?: number;
}

export function BudgetAlerts({ budgets, stats }: BudgetAlertsProps) {
  const alerts: Alert[] = [];

  // Check overall budget utilization
  if (stats.utilizationPercent >= 100) {
    alerts.push({
      id: 'overall-exceeded',
      type: 'critical',
      title: 'Overall Budget Exceeded',
      message: `Total spending has exceeded the allocated budget by ${formatCurrency(stats.totalSpent - stats.totalBudget)}`,
      value: stats.utilizationPercent,
      threshold: 100,
    });
  } else if (stats.utilizationPercent >= 90) {
    alerts.push({
      id: 'overall-critical',
      type: 'warning',
      title: 'Budget Near Limit',
      message: `Overall budget is at ${stats.utilizationPercent}%. Consider reviewing upcoming expenses.`,
      value: stats.utilizationPercent,
      threshold: 90,
    });
  } else if (stats.utilizationPercent >= 75) {
    alerts.push({
      id: 'overall-warning',
      type: 'info',
      title: 'Budget Checkpoint',
      message: `You've used ${stats.utilizationPercent}% of your total budget. On track for the period.`,
      value: stats.utilizationPercent,
      threshold: 75,
    });
  }

  // Check individual budgets
  budgets.forEach(budget => {
    const utilization = budget.total_budget > 0 
      ? (budget.total_spent / budget.total_budget) * 100 
      : 0;

    if (utilization >= 100) {
      alerts.push({
        id: `budget-exceeded-${budget.id}`,
        type: 'critical',
        title: 'Budget Exceeded',
        message: `"${budget.budget_name}" has exceeded its allocated budget`,
        budgetName: budget.budget_name,
        value: utilization,
        threshold: 100,
      });
    } else if (utilization >= 90) {
      alerts.push({
        id: `budget-critical-${budget.id}`,
        type: 'warning',
        title: 'Budget Critical',
        message: `"${budget.budget_name}" is at ${Math.round(utilization)}% utilization`,
        budgetName: budget.budget_name,
        value: utilization,
        threshold: 90,
      });
    }

    // Check category-specific alerts
    const categoryChecks = [
      { name: 'Labor', budget: budget.labor_budget, spent: budget.labor_spent },
      { name: 'Parts', budget: budget.parts_budget, spent: budget.parts_spent },
      { name: 'Safety', budget: budget.safety_budget, spent: budget.safety_spent },
      { name: 'Fuel', budget: budget.fuel_budget, spent: budget.fuel_spent },
      { name: 'Tools', budget: budget.tools_budget, spent: budget.tools_spent },
      { name: 'PPE', budget: budget.ppe_budget, spent: budget.ppe_spent },
    ];

    categoryChecks.forEach(cat => {
      if (cat.budget && cat.spent) {
        const catUtil = (cat.spent / cat.budget) * 100;
        if (catUtil >= 100) {
          alerts.push({
            id: `cat-exceeded-${budget.id}-${cat.name}`,
            type: 'warning',
            title: `${cat.name} Budget Exceeded`,
            message: `${cat.name} costs in "${budget.budget_name}" have exceeded allocation`,
            budgetName: budget.budget_name,
            value: catUtil,
            threshold: 100,
          });
        }
      }
    });
  });

  // Sort alerts by severity
  const sortedAlerts = alerts.sort((a, b) => {
    const priority = { critical: 0, warning: 1, info: 2 };
    return priority[a.type] - priority[b.type];
  });

  const criticalCount = alerts.filter(a => a.type === 'critical').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'info':
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return 'border-destructive/50 bg-destructive/5';
      case 'warning':
        return 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20';
      case 'info':
        return 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={criticalCount > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${criticalCount > 0 ? 'text-destructive' : ''}`}>
              {criticalCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card className={warningCount > 0 ? 'border-amber-500' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${warningCount > 0 ? 'text-amber-600' : ''}`}>
              {warningCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Review recommended</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Healthy Budgets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">
              {budgets.filter(b => (b.total_spent / b.total_budget) * 100 < 75).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Under 75% utilization</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Budget Alerts
            </span>
            <Badge variant="outline">{alerts.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
              <p className="text-lg font-medium">All Budgets Healthy</p>
              <p className="text-muted-foreground mt-1">No alerts at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAlerts.slice(0, 10).map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-4 rounded-lg border ${getAlertStyles(alert.type)}`}
                >
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{alert.title}</p>
                        {alert.value && (
                          <Badge 
                            variant={alert.type === 'critical' ? 'destructive' : 'secondary'}
                            className="ml-2"
                          >
                            {Math.round(alert.value)}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
