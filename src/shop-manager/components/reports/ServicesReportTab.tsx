
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface ServicesReportTabProps {
  reportData: any;
}

export const ServicesReportTab: React.FC<ServicesReportTabProps> = ({ reportData }) => {
  // Ensure we have data
  const serviceData = reportData?.revenueByService || [];
  
  // If no data, show a message
  if (serviceData.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-gray-500">No service data available for the selected time period.</p>
      </div>
    );
  }

  const colors = [
    "#3B82F6", "#10B981", "#6366F1", "#F59E0B", "#EF4444",
    "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#06B6D4"
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Revenue by Service Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis 
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(value) => [`$${value.toLocaleString()}`, "Revenue"]}
                  labelFormatter={(label) => `Service: ${label}`}
                />
                <Bar dataKey="revenue" name="Revenue">
                  {serviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {serviceData.slice(0, 5).map((service, index) => (
            <div key={index} className="flex justify-between items-center">
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-2" 
                  style={{ backgroundColor: colors[index % colors.length] }}
                ></div>
                <span className="font-medium">{service.name}</span>
              </div>
              <span className="font-semibold">${service.revenue?.toLocaleString() || 0}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
