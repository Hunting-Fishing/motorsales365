
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface ServiceQualityData {
  totalServices: number;
  duplicateGroups: number;
  duplicatePercentage: number;
  categoriesWithDuplicates: number;
  averageDuplicatesPerGroup: number;
  qualityScore: number;
  trends: {
    duplicateChange: number;
    qualityScoreChange: number;
  };
}

export interface ServiceQualityMetricsProps {
  data: ServiceQualityData;
}

export const ServiceQualityMetrics: React.FC<ServiceQualityMetricsProps> = ({ data }) => {
  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalServices.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Duplicate Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{data.duplicateGroups}</div>
            <div className={`flex items-center gap-1 ${getTrendColor(data.trends.duplicateChange)}`}>
              {getTrendIcon(data.trends.duplicateChange)}
              <span className="text-sm">{Math.abs(data.trends.duplicateChange)}%</span>
            </div>
          </div>
          <Badge variant="secondary" className="mt-2">
            {data.duplicatePercentage.toFixed(1)}% of services
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Affected Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.categoriesWithDuplicates}</div>
          <div className="text-sm text-gray-600 mt-1">
            Avg {data.averageDuplicatesPerGroup.toFixed(1)} duplicates/group
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Quality Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <div className={`text-2xl font-bold ${getQualityScoreColor(data.qualityScore)}`}>
              {data.qualityScore}%
            </div>
            <div className={`flex items-center gap-1 ${getTrendColor(data.trends.qualityScoreChange)}`}>
              {getTrendIcon(data.trends.qualityScoreChange)}
              <span className="text-sm">{Math.abs(data.trends.qualityScoreChange)}%</span>
            </div>
          </div>
          <Progress value={data.qualityScore} className="h-2" />
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceQualityMetrics;
