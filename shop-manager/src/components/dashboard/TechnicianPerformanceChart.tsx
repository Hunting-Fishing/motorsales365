
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getTechnicianPerformance } from "@/services/dashboard"; // Updated import
import { TechnicianPerformanceData } from "@/types/dashboard";

export function TechnicianPerformanceChart() {
  const [performance, setPerformance] = useState<TechnicianPerformanceData>({ chartData: [], technicians: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setLoading(true);
        const data = await getTechnicianPerformance();
        setPerformance(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching technician performance data:", err);
        setError("Failed to load technician performance data");
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, []);

  if (loading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Technician Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-esm-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Technician Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64 text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Technician Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={performance.chartData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            {performance.technicians.map((tech, index) => {
              // Create safe key for data field
              const techKey = tech.toLowerCase().replace(/\s+/g, '_');
              const colors = ["#3B82F6", "#10B981", "#EC4899", "#F59E0B", "#6366F1"];
              return (
                <Bar 
                  key={tech} 
                  dataKey={techKey} 
                  name={tech} 
                  fill={colors[index % colors.length]} 
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
