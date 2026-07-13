import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Fuel, TrendingUp, TrendingDown, AlertTriangle, Plus, Droplet } from "lucide-react";
import { useFuelEntries } from "@/hooks/useFuelEntries";
import { formatCurrency } from "@/lib/utils";
import { FuelEntryForm } from "./FuelEntryForm";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface FuelBudgetTrackerProps {
  fuelBudget: number;
  fuelSpent: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function FuelBudgetTracker({ fuelBudget, fuelSpent }: FuelBudgetTrackerProps) {
  const [showEntryForm, setShowEntryForm] = useState(false);
  const { loading, entries, stats, addEntry } = useFuelEntries();
  
  const utilizationPercent = fuelBudget > 0 ? Math.round((fuelSpent / fuelBudget) * 100) : 0;
  const remaining = fuelBudget - fuelSpent;
  const isOverBudget = fuelSpent > fuelBudget;

  // Transform monthly data for chart
  const monthlyData = stats.byMonth.map(item => ({
    month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
    gallons: item.gallons,
    cost: item.cost,
  }));

  // Mock fuel type distribution
  const fuelTypeData = [
    { name: 'Diesel', value: 4500, gallons: 1200 },
    { name: 'Gasoline', value: 2800, gallons: 850 },
    { name: 'Marine Fuel', value: 3200, gallons: 720 },
  ];

  const handleAddEntry = async (data: any) => {
    await addEntry(data);
    setShowEntryForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Fuel Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              Fuel Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(fuelBudget)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total allocated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Droplet className="h-4 w-4" />
              Fuel Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${isOverBudget ? 'text-destructive' : ''}`}>
              {formatCurrency(fuelSpent)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{utilizationPercent}% of budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Gallons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalGallons.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">This period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Avg. Cost/Gallon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.avgCostPerGallon)}</p>
            <p className="text-xs text-muted-foreground mt-1">Average rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Fuel Budget Utilization</CardTitle>
          <Button onClick={() => setShowEntryForm(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Log Fuel Entry
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Fuel Costs</span>
              <span className="flex items-center gap-2">
                {utilizationPercent}%
                {isOverBudget && (
                  <Badge variant="destructive" className="text-xs">Over Budget</Badge>
                )}
              </span>
            </div>
            <Progress 
              value={Math.min(utilizationPercent, 100)} 
              className={`h-3 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Remaining: {formatCurrency(Math.max(remaining, 0))}</span>
            <span>{entries.length} fuel entries logged</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consumption Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fuel Consumption Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'cost' ? formatCurrency(value) : `${value} gal`,
                    name === 'cost' ? 'Cost' : 'Gallons'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="gallons" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#fuelGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fuel Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fuel Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={fuelTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {fuelTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Fuel Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Fuel className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No fuel entries recorded yet</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowEntryForm(true)}>
                Log First Entry
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{entry.fuel_unit || 'Fuel'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(entry.entry_date).toLocaleDateString()} • {entry.fuel_amount} gallons
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(entry.cost)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fuel Entry Form Dialog */}
      <FuelEntryForm 
        open={showEntryForm} 
        onClose={() => setShowEntryForm(false)}
        onSubmit={handleAddEntry}
      />
    </div>
  );
}
