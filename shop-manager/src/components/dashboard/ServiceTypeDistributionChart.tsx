
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { getServiceTypeDistribution } from "@/services/dashboard"; // Updated import path
import { ServiceTypeData } from "@/types/dashboard";

export function ServiceTypeDistributionChart() {
  const [data, setData] = useState<ServiceTypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const serviceData = await getServiceTypeDistribution();
        setData(serviceData);
      } catch (err) {
        console.error("Error fetching service type data:", err);
        setError("Failed to load service type data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#6366F1", "#EC4899", "#8B5CF6"];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Type Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Type Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <div className="flex justify-center items-center h-full text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Type Distribution</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        {data.length === 0 ? (
          <div className="flex justify-center items-center h-full text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}`, "Count"]} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
