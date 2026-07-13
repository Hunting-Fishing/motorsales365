
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";

interface FinancialsTabContentProps {
  salesData: any[];
  isLoading?: boolean;
}

export function FinancialsTabContent({ salesData, isLoading = false }: FinancialsTabContentProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </CardHeader>
          <CardContent>
            <div className="h-[400px] flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          </CardContent>
        </Card>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[120px]" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-4 w-[60px]" />
                    </div>
                    <Skeleton className="h-2.5 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[120px]" />
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Annual Revenue Breakdown</CardTitle>
          <CardDescription>Revenue by month for current year</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={salesData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#8b5cf6" 
                activeDot={{ r: 8 }} 
                name="Revenue" 
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Invoices</CardTitle>
            <CardDescription>Total: $12,450</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Due within 30 days</span>
                <span className="text-sm">$8,200</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '65%' }}></div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm font-medium">30-60 days overdue</span>
                <span className="text-sm">$3,100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: '25%' }}></div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm font-medium">60+ days overdue</span>
                <span className="text-sm">$1,150</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-red-500 h-2.5 rounded-full" style={{ width: '10%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Profit Margin</CardTitle>
            <CardDescription>Average: 32%</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={[
                { month: 'Jan', margin: 28 },
                { month: 'Feb', margin: 30 },
                { month: 'Mar', margin: 25 },
                { month: 'Apr', margin: 32 },
                { month: 'May', margin: 35 },
                { month: 'Jun', margin: 38 },
                { month: 'Jul', margin: 34 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 50]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Profit Margin']} />
                <Line 
                  type="monotone" 
                  dataKey="margin" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dot={{ r: 4 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
