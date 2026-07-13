import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { MaintenanceBudget } from "@/hooks/useBudgetFilters";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface BudgetForecastProps {
  budgets: MaintenanceBudget[];
  stats: {
    totalBudget: number;
    totalSpent: number;
    remaining: number;
    utilizationPercent: number;
    partsBudget?: number;
    partsSpent?: number;
    laborBudget?: number;
    laborSpent?: number;
    safetyBudget?: number;
    safetySpent?: number;
    fuelBudget?: number;
    fuelSpent?: number;
    toolsBudget?: number;
    toolsSpent?: number;
    ppeBudget?: number;
    ppeSpent?: number;
  };
}

export function BudgetForecast({ budgets, stats }: BudgetForecastProps) {
  // Calculate forecast based on spending velocity
  const calculateForecast = () => {
    if (budgets.length === 0) return null;

    // Get the earliest and latest budget dates
    const activeBudgets = budgets.filter(b => b.status === 'active');
    if (activeBudgets.length === 0) return null;

    // Calculate average daily spend rate
    const now = new Date();
    let totalDays = 0;
    let totalSpent = 0;
    let totalBudget = 0;
    let totalRemainingDays = 0;

    activeBudgets.forEach(budget => {
      const startDate = new Date(budget.start_date);
      const endDate = new Date(budget.end_date);
      const daysElapsed = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daysRemaining = Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      totalDays += daysElapsed;
      totalSpent += budget.total_spent;
      totalBudget += budget.total_budget;
      totalRemainingDays += daysRemaining;
    });

    const avgDailySpend = totalDays > 0 ? totalSpent / totalDays : 0;
    const avgRemainingDays = activeBudgets.length > 0 ? totalRemainingDays / activeBudgets.length : 0;
    const projectedTotal = totalSpent + (avgDailySpend * avgRemainingDays);
    const projectedVariance = projectedTotal - totalBudget;
    const projectedVariancePercent = totalBudget > 0 ? (projectedVariance / totalBudget) * 100 : 0;

    return {
      dailySpendRate: avgDailySpend,
      daysRemaining: Math.round(avgRemainingDays),
      projectedTotal,
      projectedVariance,
      projectedVariancePercent,
      willExceedBudget: projectedTotal > totalBudget,
    };
  };

  const forecast = calculateForecast();

  // Generate forecast chart data
  const generateForecastData = () => {
    if (!forecast) return [];
    
    const data = [];
    const startSpent = stats.totalSpent;
    const dailyRate = forecast.dailySpendRate;
    
    // Past 30 days (approximate)
    for (let i = -30; i <= forecast.daysRemaining; i += 5) {
      const spent = i < 0 
        ? Math.max(0, startSpent + (dailyRate * i))
        : startSpent + (dailyRate * i);
      
      data.push({
        day: i,
        label: i === 0 ? 'Today' : i < 0 ? `${Math.abs(i)}d ago` : `+${i}d`,
        actual: i <= 0 ? spent : null,
        projected: i >= 0 ? spent : null,
        budget: stats.totalBudget,
      });
    }
    
    return data;
  };

  const forecastData = generateForecastData();

  // Category forecasts
  const categoryForecasts = [
    { name: 'Parts', budget: stats.partsBudget || 0, spent: stats.partsSpent || 0 },
    { name: 'Labor', budget: stats.laborBudget || 0, spent: stats.laborSpent || 0 },
    { name: 'Safety', budget: stats.safetyBudget || 0, spent: stats.safetySpent || 0 },
    { name: 'Fuel', budget: stats.fuelBudget || 0, spent: stats.fuelSpent || 0 },
    { name: 'Tools', budget: stats.toolsBudget || 0, spent: stats.toolsSpent || 0 },
    { name: 'PPE', budget: stats.ppeBudget || 0, spent: stats.ppeSpent || 0 },
  ].filter(c => c.budget > 0);

  return (
    <div className="space-y-6">
      {/* Forecast Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Daily Spend Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {forecast ? formatCurrency(forecast.dailySpendRate) : '$0'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Average per day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Days Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{forecast?.daysRemaining || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">In budget period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Projected Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${forecast?.willExceedBudget ? 'text-destructive' : 'text-emerald-600'}`}>
              {forecast ? formatCurrency(forecast.projectedTotal) : '$0'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">End of period estimate</p>
          </CardContent>
        </Card>

        <Card className={forecast?.willExceedBudget ? 'border-destructive' : 'border-emerald-500'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {forecast?.willExceedBudget ? (
                <TrendingUp className="h-4 w-4 text-destructive" />
              ) : (
                <TrendingDown className="h-4 w-4 text-emerald-500" />
              )}
              Projected Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${forecast?.willExceedBudget ? 'text-destructive' : 'text-emerald-600'}`}>
              {forecast ? (
                forecast.projectedVariance >= 0 
                  ? `+${formatCurrency(forecast.projectedVariance)}`
                  : formatCurrency(forecast.projectedVariance)
              ) : '$0'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {forecast?.willExceedBudget ? 'Over budget projection' : 'Under budget projection'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Status */}
      {forecast && (
        <Card className={forecast.willExceedBudget ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20' : 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {forecast.willExceedBudget ? (
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              ) : (
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              )}
              <div>
                <p className={`font-semibold ${forecast.willExceedBudget ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {forecast.willExceedBudget 
                    ? 'Budget May Be Exceeded'
                    : 'On Track to Stay Within Budget'
                  }
                </p>
                <p className={`text-sm ${forecast.willExceedBudget ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {forecast.willExceedBudget 
                    ? `At current spending rate, you may exceed the budget by ${Math.abs(Math.round(forecast.projectedVariancePercent))}%`
                    : `Current projections show finishing ${Math.abs(Math.round(forecast.projectedVariancePercent))}% under budget`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Spending Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" className="text-xs" />
              <YAxis tickFormatter={(v) => `$${v/1000}k`} className="text-xs" />
              <Tooltip 
                formatter={(value: number) => value ? formatCurrency(value) : 'N/A'}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <ReferenceLine 
                y={stats.totalBudget} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="5 5"
                label={{ value: 'Budget', position: 'right', fill: 'hsl(var(--destructive))' }}
              />
              <Area 
                type="monotone" 
                dataKey="actual" 
                name="Actual"
                stroke="hsl(var(--primary))" 
                fill="url(#actualGradient)"
                strokeWidth={2}
                connectNulls={false}
              />
              <Area 
                type="monotone" 
                dataKey="projected" 
                name="Projected"
                stroke="#f59e0b" 
                fill="url(#projectedGradient)"
                strokeWidth={2}
                strokeDasharray="5 5"
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Forecasts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category Budget Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryForecasts.map((category) => {
              const utilization = category.budget > 0 
                ? Math.round((category.spent / category.budget) * 100) 
                : 0;
              const isOverBudget = category.spent > category.budget;
              const isNearLimit = utilization >= 80;

              return (
                <div key={category.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{category.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(category.spent)} / {formatCurrency(category.budget)}
                      </span>
                      <Badge 
                        variant={isOverBudget ? 'destructive' : isNearLimit ? 'secondary' : 'outline'}
                        className={isNearLimit && !isOverBudget ? 'bg-amber-100 text-amber-800' : ''}
                      >
                        {utilization}%
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={Math.min(utilization, 100)} 
                    className={`h-2 ${
                      isOverBudget 
                        ? '[&>div]:bg-destructive' 
                        : isNearLimit 
                          ? '[&>div]:bg-amber-500' 
                          : ''
                    }`}
                  />
                </div>
              );
            })}
            {categoryForecasts.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No category budgets configured
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
