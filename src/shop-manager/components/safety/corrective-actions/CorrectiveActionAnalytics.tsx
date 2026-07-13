import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import type { CorrectiveAction } from '@/hooks/useCorrectiveActions';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from 'date-fns';

interface Props {
  actions: CorrectiveAction[];
}

const STATUS_COLORS: Record<string, string> = {
  open: 'hsl(var(--chart-1))',
  in_progress: 'hsl(var(--chart-2))',
  completed: 'hsl(var(--chart-3))',
  verified: 'hsl(var(--chart-4))',
  closed: 'hsl(var(--chart-5))'
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'hsl(var(--destructive))',
  high: 'hsl(var(--chart-3))',
  medium: 'hsl(var(--chart-2))',
  low: 'hsl(var(--chart-1))'
};

export function CorrectiveActionAnalytics({ actions }: Props) {
  // Status distribution
  const statusData = React.useMemo(() => {
    return ['open', 'in_progress', 'completed', 'verified', 'closed'].map(status => ({
      name: status.replace('_', ' '),
      value: actions.filter(a => a.status === status).length,
      fill: STATUS_COLORS[status]
    }));
  }, [actions]);

  // Monthly trend
  const monthlyData = React.useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      const created = actions.filter(a => 
        isWithinInterval(new Date(a.created_at), { start, end })
      ).length;
      
      const completed = actions.filter(a => 
        a.completed_date && isWithinInterval(new Date(a.completed_date), { start, end })
      ).length;
      
      months.push({
        month: format(date, 'MMM'),
        created,
        completed
      });
    }
    return months;
  }, [actions]);

  // Average resolution time
  const avgResolutionTime = React.useMemo(() => {
    const completed = actions.filter(a => a.completed_date);
    if (completed.length === 0) return 0;
    
    const totalDays = completed.reduce((sum, a) => {
      return sum + differenceInDays(new Date(a.completed_date!), new Date(a.created_at));
    }, 0);
    
    return Math.round(totalDays / completed.length);
  }, [actions]);

  // Priority distribution
  const priorityData = React.useMemo(() => {
    return ['critical', 'high', 'medium', 'low'].map(priority => ({
      name: priority,
      value: actions.filter(a => a.priority === priority).length,
      fill: PRIORITY_COLORS[priority]
    }));
  }, [actions]);

  // On-time completion rate
  const onTimeRate = React.useMemo(() => {
    const withDueDate = actions.filter(a => a.due_date && a.completed_date);
    if (withDueDate.length === 0) return 100;
    
    const onTime = withDueDate.filter(a => 
      new Date(a.completed_date!) <= new Date(a.due_date!)
    ).length;
    
    return Math.round((onTime / withDueDate.length) * 100);
  }, [actions]);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{avgResolutionTime}</div>
            <p className="text-xs text-muted-foreground">Avg. Days to Resolve</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{onTimeRate}%</div>
            <p className="text-xs text-muted-foreground">On-Time Completion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{actions.filter(a => a.action_type === 'corrective').length}</div>
            <p className="text-xs text-muted-foreground">Corrective Actions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{actions.filter(a => a.action_type === 'preventive').length}</div>
            <p className="text-xs text-muted-foreground">Preventive Actions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Monthly Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Created vs Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="created" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Created" />
                  <Line type="monotone" dataKey="completed" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Completed" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
