import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { useLaborAnalytics } from "@/hooks/useLaborAnalytics";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface LaborBudgetTrackerProps {
  laborBudget: number;
  laborSpent: number;
}

export function LaborBudgetTracker({ laborBudget, laborSpent }: LaborBudgetTrackerProps) {
  const { loading, analytics } = useLaborAnalytics();
  
  const utilizationPercent = laborBudget > 0 ? Math.round((laborSpent / laborBudget) * 100) : 0;
  const remaining = laborBudget - laborSpent;
  const isOverBudget = laborSpent > laborBudget;
  const isNearLimit = utilizationPercent >= 80 && utilizationPercent < 100;

  // Calculate weekly labor data from analytics (aggregate from analytics records)
  const weeklyLaborData = analytics.length > 0 
    ? analytics.slice(0, 4).map((a, i) => ({
        week: `Week ${i + 1}`,
        regular: Number(a.regular_hours || 0),
        overtime: Number(a.overtime_hours || 0),
        cost: Number(a.total_labor_cost || 0)
      }))
    : [{ week: 'Current', regular: Math.round(laborSpent * 0.9), overtime: Math.round(laborSpent * 0.1), cost: laborSpent }];

  // Employee cost data would need a separate query - using empty for now if no data
  const employeeCostData: { name: string; hours: number; cost: number }[] = [];

  return (
    <div className="space-y-6">
      {/* Labor Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Labor Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(laborBudget)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total allocated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Labor Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${isOverBudget ? 'text-destructive' : ''}`}>
              {formatCurrency(laborSpent)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{utilizationPercent}% of budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${remaining < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {formatCurrency(Math.abs(remaining))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {remaining < 0 ? 'Over budget' : 'Available'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg. Hourly Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">$42.50</p>
            <p className="text-xs text-muted-foreground mt-1">Blended rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Budget Utilization
            {isOverBudget && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Over Budget
              </Badge>
            )}
            {isNearLimit && (
              <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800">
                <AlertTriangle className="h-3 w-3" />
                Near Limit
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Labor Costs</span>
              <span>{utilizationPercent}%</span>
            </div>
            <Progress 
              value={Math.min(utilizationPercent, 100)} 
              className={`h-3 ${isOverBudget ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-amber-500' : ''}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Labor Hours Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weekly Labor Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyLaborData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="regular" name="Regular Hours" fill="hsl(var(--primary))" stackId="hours" />
                <Bar dataKey="overtime" name="Overtime" fill="hsl(var(--destructive))" stackId="hours" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Labor Cost Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Labor Cost Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyLaborData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  name="Labor Cost"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Employee Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Employee Labor Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={employeeCostData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tickFormatter={(v) => `$${v/1000}k`} className="text-xs" />
              <YAxis type="category" dataKey="name" width={60} className="text-xs" />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Overtime Alerts */}
      {utilizationPercent >= 75 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5" />
              Labor Budget Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700 dark:text-amber-300">
              Labor costs have reached {utilizationPercent}% of the allocated budget. 
              Consider reviewing overtime hours and scheduling to stay within budget limits.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
