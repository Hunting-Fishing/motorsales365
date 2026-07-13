import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, TrendingUp, TrendingDown, AlertCircle, Loader2 } from "lucide-react";
import { useRepairTrends } from "@/hooks/useRepairTrends";
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface RepairTrendsCardProps {
  partsBudget: number;
  partsSpent: number;
  externalServicesBudget: number;
  externalServicesSpent: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function RepairTrendsCard({ 
  partsBudget, 
  partsSpent, 
  externalServicesBudget, 
  externalServicesSpent 
}: RepairTrendsCardProps) {
  const { loading, stats } = useRepairTrends(12);

  const totalRepairBudget = partsBudget + externalServicesBudget;
  const totalRepairSpent = partsSpent + externalServicesSpent;
  const utilizationPercent = totalRepairBudget > 0 
    ? Math.round((totalRepairSpent / totalRepairBudget) * 100) 
    : 0;

  // Format data for pie chart
  const serviceTypeData = stats.byServiceType.slice(0, 6).map(item => ({
    name: item.serviceType,
    value: item.totalCost,
    count: item.count,
  }));

  // Format monthly trends
  const monthlyData = stats.monthlyTrends.map(item => ({
    month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
    repairs: item.count,
    cost: item.totalCost,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Repair Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Total Repairs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalRepairs}</p>
            <p className="text-xs text-muted-foreground mt-1">Last 12 months</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Repair Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed work orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Avg. Repair Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.avgRepairCost)}</p>
            <p className="text-xs text-muted-foreground mt-1">Per work order</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Budget Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${utilizationPercent > 100 ? 'text-destructive' : ''}`}>
              {utilizationPercent}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(totalRepairSpent)} of {formatCurrency(totalRepairBudget)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Repair Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Repair Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `$${v/1000}k`} className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'cost' ? formatCurrency(value) : value,
                    name === 'cost' ? 'Cost' : 'Repairs'
                  ]}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="repairs" 
                  name="Repairs"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="cost" 
                  name="Cost"
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Repair Cost by Service Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {serviceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [
                    formatCurrency(value),
                    props.payload.name
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Cost Drivers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Cost Drivers (Assets)</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topCostDrivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No repair data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.topCostDrivers.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(v) => `$${v/1000}k`} className="text-xs" />
                <YAxis type="category" dataKey="assetName" width={100} className="text-xs" />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'totalCost' ? formatCurrency(value) : value,
                    name === 'totalCost' ? 'Total Cost' : 'Repairs'
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="totalCost" name="Total Cost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Service Type Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Type Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.byServiceType.map((item, index) => (
              <div key={item.serviceType} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <p className="font-medium">{item.serviceType}</p>
                    <p className="text-sm text-muted-foreground">{item.count} repairs</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(item.totalCost)}</p>
                  <p className="text-sm text-muted-foreground">
                    Avg: {formatCurrency(item.avgCost)}
                  </p>
                </div>
              </div>
            ))}
            {stats.byServiceType.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No service data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
