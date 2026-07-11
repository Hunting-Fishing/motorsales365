import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { MaintenanceBudget } from "@/hooks/useBudgetFilters";

interface BudgetAnalyticsChartsProps {
  budgets: MaintenanceBudget[];
  stats: {
    partsBudget: number;
    partsSpent: number;
    laborBudget: number;
    laborSpent: number;
    safetyBudget: number;
    safetySpent: number;
    toolsBudget: number;
    toolsSpent: number;
    fuelBudget: number;
    fuelSpent: number;
    ppeBudget: number;
    ppeSpent: number;
  };
}

const COLORS = ['#3b82f6', '#8b5cf6', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
};

export function BudgetAnalyticsCharts({ budgets, stats }: BudgetAnalyticsChartsProps) {
  // Pie chart data - Budget allocation by category
  const allocationData = [
    { name: 'Parts', value: stats.partsBudget, color: '#8b5cf6' },
    { name: 'Labor', value: stats.laborBudget, color: '#6366f1' },
    { name: 'Safety', value: stats.safetyBudget, color: '#10b981' },
    { name: 'Tools', value: stats.toolsBudget, color: '#f59e0b' },
    { name: 'Fuel', value: stats.fuelBudget, color: '#ef4444' },
    { name: 'PPE', value: stats.ppeBudget, color: '#06b6d4' },
  ].filter(item => item.value > 0);

  // Bar chart data - Budget vs Actual per category
  const comparisonData = [
    { category: 'Parts', budget: stats.partsBudget, spent: stats.partsSpent },
    { category: 'Labor', budget: stats.laborBudget, spent: stats.laborSpent },
    { category: 'Safety', budget: stats.safetyBudget, spent: stats.safetySpent },
    { category: 'Tools', budget: stats.toolsBudget, spent: stats.toolsSpent },
    { category: 'Fuel', budget: stats.fuelBudget, spent: stats.fuelSpent },
    { category: 'PPE', budget: stats.ppeBudget, spent: stats.ppeSpent },
  ];

  // Line chart data - Monthly spending trend (mock data based on budgets)
  const monthlyTrend = budgets.slice(0, 6).map((budget, index) => ({
    month: new Date(budget.start_date).toLocaleDateString('en-US', { month: 'short' }),
    budget: Number(budget.total_budget || 0),
    spent: Number(budget.total_spent || 0),
  }));

  // If no data, show placeholder
  if (budgets.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Create budgets to see analytics charts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Budget Allocation Pie Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Budget Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Budget vs Actual Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Budget vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={formatCurrency} fontSize={12} />
                <YAxis type="category" dataKey="category" width={50} fontSize={12} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="spent" name="Spent" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trend Line Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Spending Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend.length > 0 ? monthlyTrend : [{ month: 'No Data', budget: 0, spent: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis tickFormatter={formatCurrency} fontSize={12} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="budget"
                  name="Budget"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
                <Line
                  type="monotone"
                  dataKey="spent"
                  name="Spent"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
