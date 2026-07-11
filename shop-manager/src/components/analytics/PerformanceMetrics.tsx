import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { getPerformanceMetrics, PerformanceMetric } from '@/services/analytics/performanceService';

interface PerformanceMetricsProps {
  data?: any;
  isLoading?: boolean;
}

export function PerformanceMetrics({ data, isLoading: externalLoading }: PerformanceMetricsProps) {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (data) {
        setMetrics(data);
        setIsLoading(externalLoading || false);
      } else {
        setIsLoading(true);
        const result = await getPerformanceMetrics();
        setMetrics(result);
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [data, externalLoading]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-2 bg-muted rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!metrics || metrics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No performance data available. Complete work orders to see metrics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {metrics.map((metric: any, index: number) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{metric.label}</span>
            <span className="text-muted-foreground">
              {metric.value}% / {metric.target}%
            </span>
          </div>
          <Progress 
            value={metric.value} 
            className="h-2"
          />
          <div className="text-xs text-muted-foreground">
            Target: {metric.target}%
          </div>
        </div>
      ))}
    </div>
  );
}