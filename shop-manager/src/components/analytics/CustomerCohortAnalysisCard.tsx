import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, TrendingUp } from 'lucide-react';

interface CohortData {
  cohort: string;
  initialSize: number;
  retentionRates: number[];
  revenueGrowth: number;
}

interface CustomerCohortAnalysisCardProps {
  cohorts: CohortData[];
  isLoading?: boolean;
}

export function CustomerCohortAnalysisCard({ cohorts, isLoading = false }: CustomerCohortAnalysisCardProps) {
  const months = ['Month 1', 'Month 3', 'Month 6', 'Month 12'];

  const getRetentionColor = (rate: number) => {
    if (rate >= 80) return 'bg-emerald-500';
    if (rate >= 60) return 'bg-yellow-500';
    if (rate >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Cohort Analysis
          </CardTitle>
          <CardDescription>Retention patterns by customer acquisition period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Customer Cohort Analysis
        </CardTitle>
        <CardDescription>
          Retention patterns by customer acquisition period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Header */}
          <div className="grid grid-cols-6 gap-2 text-sm font-medium text-muted-foreground">
            <div>Cohort</div>
            <div>Size</div>
            {months.map(month => (
              <div key={month} className="text-center">{month}</div>
            ))}
          </div>

          {/* Cohort Data */}
          {cohorts.map((cohort) => (
            <div key={cohort.cohort} className="grid grid-cols-6 gap-2 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{cohort.cohort}</span>
              </div>
              <div className="text-sm">{cohort.initialSize}</div>
              {cohort.retentionRates.map((rate, index) => (
                <div key={index} className="text-center">
                  <div className={`inline-flex items-center justify-center w-12 h-8 rounded text-white text-xs font-medium ${getRetentionColor(rate)}`}>
                    {rate}%
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Revenue Growth Insights */}
        <div className="mt-6 space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Revenue Growth by Cohort
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {cohorts.slice(0, 4).map((cohort) => (
              <div key={cohort.cohort} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">{cohort.cohort}</span>
                <span className={`text-sm font-bold ${
                  cohort.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {cohort.revenueGrowth >= 0 ? '+' : ''}{cohort.revenueGrowth}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium mb-2">Cohort Insights</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Track retention patterns across different acquisition periods</li>
            <li>• Identify successful onboarding strategies from high-retention cohorts</li>
            <li>• Optimize marketing spend based on cohort performance</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}