
import { useEffect, useState } from "react";
import { getRevenueData } from "@/services/dashboard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { MonthlyRevenueData } from "@/types/dashboard";
import { BaseChart } from "./shared/BaseChart";

export function RevenueChart() {
  const [data, setData] = useState<MonthlyRevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setLoading(true);
        const revenueData = await getRevenueData();
        setData(revenueData);
        setError(null);
      } catch (err) {
        console.error("Error fetching revenue data:", err);
        setError("Failed to load revenue data");
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueData();
  }, []);

  return (
    <BaseChart
      title="Revenue Trend"
      description="Daily revenue for the last 30 days"
      isLoading={loading}
      error={error}
    >
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 10,
          left: 10,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis 
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip 
          formatter={(value) => [`$${value.toLocaleString()}`, "Revenue"]}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </BaseChart>
  );
}
