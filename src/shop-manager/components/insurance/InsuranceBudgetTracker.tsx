import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, TrendingUp, Calendar, Target, AlertTriangle 
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";

interface InsuranceBudgetTrackerProps {
  annualPremiumTotal: number;
  premiumForecast: { month: string; premium: number; count: number }[];
}

export function InsuranceBudgetTracker({ 
  annualPremiumTotal, 
  premiumForecast 
}: InsuranceBudgetTrackerProps) {
  // Fetch budget data that includes insurance
  const { data: budgets = [] } = useQuery({
    queryKey: ['maintenance-budgets-with-insurance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_budgets')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate total insurance budget and spent
  const totalInsuranceBudget = budgets.reduce((sum, b) => sum + Number(b.insurance_budget || 0), 0);
  const totalInsuranceSpent = budgets.reduce((sum, b) => sum + Number(b.insurance_spent || 0), 0);
  const utilizationPercent = totalInsuranceBudget > 0 
    ? Math.round((totalInsuranceSpent / totalInsuranceBudget) * 100)
    : 0;

  const remaining = totalInsuranceBudget - totalInsuranceSpent;
  const isOverBudget = remaining < 0;

  // Monthly average
  const monthlyAverage = annualPremiumTotal / 12;

  return (
    <div className="space-y-6">
      {/* Budget Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Annual Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(totalInsuranceBudget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Annual Premiums</p>
                <p className="text-2xl font-bold">{formatCurrency(annualPremiumTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Average</p>
                <p className="text-2xl font-bold">{formatCurrency(monthlyAverage)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isOverBudget ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                {isOverBudget ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isOverBudget ? 'Over Budget' : 'Remaining'}
                </p>
                <p className={`text-2xl font-bold ${isOverBudget ? 'text-destructive' : ''}`}>
                  {formatCurrency(Math.abs(remaining))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {formatCurrency(totalInsuranceSpent)} of {formatCurrency(totalInsuranceBudget)}
              </span>
              <span className={`font-semibold ${
                utilizationPercent > 100 ? 'text-destructive' : 
                utilizationPercent > 80 ? 'text-amber-500' : 'text-green-500'
              }`}>
                {utilizationPercent}%
              </span>
            </div>
            <Progress 
              value={Math.min(utilizationPercent, 100)} 
              className={utilizationPercent > 100 ? '[&>div]:bg-destructive' : ''}
            />
            {utilizationPercent > 80 && utilizationPercent <= 100 && (
              <p className="text-sm text-amber-500">
                Warning: Budget utilization is approaching limit
              </p>
            )}
            {utilizationPercent > 100 && (
              <p className="text-sm text-destructive">
                Alert: Budget has been exceeded by {formatCurrency(Math.abs(remaining))}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Premium Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            12-Month Premium Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={premiumForecast}>
                <defs>
                  <linearGradient id="premiumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Projected Premium']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="premium" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#premiumGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Budget Tips */}
      {totalInsuranceBudget === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Insurance Budget Set</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Create a maintenance budget with insurance allocation to track your insurance spending against planned budget.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
