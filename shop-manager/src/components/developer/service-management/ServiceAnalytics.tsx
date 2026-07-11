
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceMainCategory } from '@/types/service';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface ServiceAnalyticsProps {
  categories: ServiceMainCategory[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC0CB', '#A569BD', '#F39C12'];

const ServiceAnalytics: React.FC<ServiceAnalyticsProps> = ({ categories }) => {
  const categoryData = useMemo(() => {
    return categories.map(category => ({
      name: category.name,
      value: category.subcategories.reduce((total, sub) => total + sub.jobs.length, 0),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
  }, [categories]);

  const totalServices = useMemo(() => {
    return categories.reduce(
      (total, category) => total + category.subcategories.reduce(
        (subTotal, sub) => subTotal + sub.jobs.length, 0
      ), 0
    );
  }, [categories]);

  const averagePrice = useMemo(() => {
    let totalPrice = 0;
    let totalItems = 0;

    categories.forEach(category => {
      category.subcategories.forEach(sub => {
        sub.jobs.forEach(job => {
          if (job.price) {
            totalPrice += job.price;
            totalItems++;
          }
        });
      });
    });

    return totalItems > 0 ? totalPrice / totalItems : 0;
  }, [categories]);

  if (categories.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Service Analytics</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">No service data available for analysis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Service Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-600 mb-1">Total Categories</p>
            <p className="text-2xl font-bold">{categories.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <p className="text-sm text-green-600 mb-1">Total Services</p>
            <p className="text-2xl font-bold">{totalServices}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <p className="text-sm text-purple-600 mb-1">Average Price</p>
            <p className="text-2xl font-bold">${averagePrice.toFixed(2)}</p>
          </div>
        </div>

        {categoryData.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value} services`, 'Count']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceAnalytics;
