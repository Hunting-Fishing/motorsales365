
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Legend,
  LineChart,
  Line
} from 'recharts';

interface RevenueReportTabProps {
  reportData: any;
}

export const RevenueReportTab: React.FC<RevenueReportTabProps> = ({ reportData }) => {
  // Make sure we have data to display
  const hasRevenueData = reportData?.revenueByPeriod && reportData.revenueByPeriod.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${reportData?.totalRevenue?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${reportData?.averageOrderValue?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData?.totalOrders || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            {hasRevenueData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.revenueByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis 
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No revenue data available for the selected time period.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Target</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            {hasRevenueData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData.revenueByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis 
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value.toLocaleString()}`]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Actual Revenue" stroke="#3B82F6" strokeWidth={2} />
                  <Line type="monotone" dataKey="target" name="Target Revenue" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No revenue data available for the selected time period.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
