
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ComparisonReportCard } from '@/components/reports/ComparisonReportCard';
import { ReportDataPoint, ComparisonReportData } from "@/types/reports";
import { Skeleton } from "@/components/ui/skeleton";

interface SummaryTabContentProps {
  showComparison: boolean;
  comparisonRevenueData: ComparisonReportData[];
  comparisonServiceData: ComparisonReportData[];
  salesData: any[];
  workOrderStatusData: ReportDataPoint[];
  topSellingItems: any[];
  isLoading?: boolean;
}

export function SummaryTabContent({
  showComparison,
  comparisonRevenueData,
  comparisonServiceData,
  salesData,
  workOrderStatusData,
  topSellingItems,
  isLoading = false
}: SummaryTabContentProps) {
  // Loading states for skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showComparison ? (
        <div className="grid md:grid-cols-2 gap-6">
          <ComparisonReportCard
            title="Revenue Comparison"
            description="Revenue metrics compared to previous period"
            data={comparisonRevenueData}
            currentPeriod="Current Period"
            previousPeriod="Previous Period"
          />
          
          <ComparisonReportCard
            title="Service Performance"
            description="Service metrics compared to previous period"
            data={comparisonServiceData}
            currentPeriod="Current Period"
            previousPeriod="Previous Period"
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Expenses</CardTitle>
              <CardDescription>Monthly financial comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
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
                  <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" />
                  <Bar dataKey="expenses" fill="#f97316" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Work Order Status</CardTitle>
              <CardDescription>Current work order distribution</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={workOrderStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {workOrderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Top Selling Services/Products</CardTitle>
          <CardDescription>Highest revenue generating items</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-right">Quantity Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topSellingItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">${item.revenue.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
