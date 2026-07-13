
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { ArrowDown, ArrowUp } from "lucide-react";

interface ComparisonData {
  name: string;
  current: number;
  previous: number;
  change: number;
}

interface ComparisonReportCardProps {
  title: string;
  description: string;
  data: ComparisonData[];
  currentPeriod: string;
  previousPeriod: string;
}

export function ComparisonReportCard({
  title,
  description,
  data,
  currentPeriod,
  previousPeriod,
}: ComparisonReportCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="flex justify-between text-sm text-muted-foreground mt-2">
          <span>{currentPeriod} vs {previousPeriod}</span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => {
                return [
                  `$${Number(value).toLocaleString()}`, 
                  name === "current" ? currentPeriod : previousPeriod
                ];
              }}
            />
            <Legend 
              payload={[
                { value: currentPeriod, type: 'square', color: '#8b5cf6' },
                { value: previousPeriod, type: 'square', color: '#d1d5db' }
              ]}
            />
            <Bar dataKey="previous" fill="#d1d5db" name={previousPeriod} />
            <Bar dataKey="current" fill="#8b5cf6" name={currentPeriod} />
          </BarChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-2 gap-4 mt-6">
          {data.map((item) => (
            <div key={item.name} className="border rounded-md p-2">
              <div className="text-sm font-medium">{item.name}</div>
              <div className="flex justify-between items-center mt-1">
                <div className="text-2xl font-bold">${item.current.toLocaleString()}</div>
                <div className={`flex items-center ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.change >= 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
                  <span>{Math.abs(item.change)}%</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                vs ${item.previous.toLocaleString()} ({previousPeriod})
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
