import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useSafetyReports } from '@/hooks/useSafetyReports';

export function ComplianceScoreWidget() {
  const { complianceScore, loading } = useSafetyReports();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const score = complianceScore?.overall || 0;
  const trend = 0; // Trend calculation would require historical data

  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-600';
    if (s >= 70) return 'text-yellow-600';
    return 'text-destructive';
  };

  const getProgressColor = (s: number) => {
    if (s >= 90) return 'bg-green-600';
    if (s >= 70) return 'bg-yellow-600';
    return 'bg-destructive';
  };

  return (
    <Card className="border-t-4 border-t-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Overall Compliance Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
              {score}%
            </div>
            <div className="flex items-center justify-center gap-1 mt-2 text-sm">
              {trend > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">+{trend.toFixed(1)}%</span>
                </>
              ) : trend < 0 ? (
                <>
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">{trend.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">No change</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs last period</span>
            </div>
          </div>

          <div className="w-full space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Inspections</span>
                <span className="font-medium">{complianceScore?.inspections || 0}%</span>
              </div>
              <Progress value={complianceScore?.inspections || 0} className="h-2" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Certifications</span>
                <span className="font-medium">{complianceScore?.certifications || 0}%</span>
              </div>
              <Progress value={complianceScore?.certifications || 0} className="h-2" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Training</span>
                <span className="font-medium">{complianceScore?.training || 0}%</span>
              </div>
              <Progress value={complianceScore?.training || 0} className="h-2" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Incidents</span>
                <span className="font-medium">{complianceScore?.incidents || 0}%</span>
              </div>
              <Progress value={complianceScore?.incidents || 0} className="h-2" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
