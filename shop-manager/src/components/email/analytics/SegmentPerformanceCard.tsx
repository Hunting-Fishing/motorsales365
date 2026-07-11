
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

interface SegmentPerformanceCardProps {
  segment: any;
}

export const SegmentPerformanceCard = ({ segment }: SegmentPerformanceCardProps) => {
  const segmentName = segment.marketing_segments?.name || 'Unknown Segment';
  const metricsData = [
    { name: 'Opens', value: segment.opens_count || 0 },
    { name: 'Clicks', value: segment.clicks_count || 0 },
    { name: 'Conversions', value: segment.conversions_count || 0 }
  ];
  
  const openRate = segment.recipients_count > 0 
    ? ((segment.opens_count / segment.recipients_count) * 100).toFixed(1) 
    : '0';
    
  const clickRate = segment.recipients_count > 0 
    ? ((segment.clicks_count / segment.recipients_count) * 100).toFixed(1) 
    : '0';
    
  const conversionRate = segment.recipients_count > 0 
    ? ((segment.conversions_count / segment.recipients_count) * 100).toFixed(1) 
    : '0';
    
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{segmentName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Open Rate</p>
            <p className="font-medium">{openRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Click Rate</p>
            <p className="font-medium">{clickRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
            <p className="font-medium">{conversionRate}%</p>
          </div>
        </div>
        
        <div className="mt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recipients</span>
            <span>{segment.recipients_count || 0}</span>
          </div>
          {segment.revenue !== null && (
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Revenue</span>
              <span>${segment.revenue?.toFixed(2) || '0.00'}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
