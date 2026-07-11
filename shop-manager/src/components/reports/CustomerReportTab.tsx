
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  PieChart, 
  Pie, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';

interface CustomerReportTabProps {
  reportData: any;
}

export const CustomerReportTab: React.FC<CustomerReportTabProps> = ({ reportData }) => {
  // Check if we have customer data
  const hasCustomerData = reportData?.customerRetention && reportData.customerRetention.length > 0;
  const hasSourceData = reportData?.customersBySource && reportData.customersBySource.length > 0;

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Customer Retention Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {hasCustomerData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportData.customerRetention}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis 
                      tickFormatter={(value) => `${value}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, "Retention Rate"]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      name="Retention Rate" 
                      stroke="#3B82F6" 
                      strokeWidth={2} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No customer retention data available.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customers by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {hasSourceData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.customersBySource}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="source"
                    >
                      {reportData.customersBySource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [value, props.payload.source]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No customer source data available.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Customers by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData?.topCustomers?.length > 0 ? (
              reportData.topCustomers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-600 font-medium">{index + 1}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.email}</p>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    ${customer.revenue.toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No customer revenue data available.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
