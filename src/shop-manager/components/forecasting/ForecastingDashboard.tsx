import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, Target, AlertCircle, Activity } from 'lucide-react';
import { useScheduleForecasts } from '@/hooks/useScheduleForecasts';
import { useScheduleOptimization } from '@/hooks/useScheduleOptimization';
import { useOvertimeTracking } from '@/hooks/useOvertimeTracking';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function ForecastingDashboard() {
  const { loading: loadingForecasts, forecasts } = useScheduleForecasts();
  const { loading: loadingMetrics, metrics } = useScheduleOptimization();
  const { loading: loadingOvertime, overtimeData } = useOvertimeTracking();

  const loading = loadingForecasts || loadingMetrics || loadingOvertime;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  const latestMetric = metrics[0];
  const overtimeAlerts = overtimeData.filter(o => o.status !== 'normal');

  return (
    <div className="space-y-6">
      {/* Optimization Metrics */}
      {latestMetric && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coverage Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestMetric.coverage_score?.toFixed(1) || 'N/A'}%
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(latestMetric.metric_date), 'MMM d, yyyy')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Efficiency Score</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestMetric.efficiency_score?.toFixed(1) || 'N/A'}%
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(latestMetric.metric_date), 'MMM d, yyyy')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestMetric.cost_score?.toFixed(1) || 'N/A'}%
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(latestMetric.metric_date), 'MMM d, yyyy')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestMetric.employee_satisfaction_score?.toFixed(1) || 'N/A'}%
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(latestMetric.metric_date), 'MMM d, yyyy')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overtime Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Overtime Alerts
          </CardTitle>
          <CardDescription>
            Employees approaching or exceeding overtime limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {overtimeAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No overtime alerts
              </div>
            ) : (
              overtimeAlerts.map((ot) => (
                <div
                  key={ot.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium mb-1">
                        Week: {format(new Date(ot.week_start_date), 'MMM d')} - {format(new Date(ot.week_end_date), 'MMM d')}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Badge variant={ot.status === 'over_limit' ? 'destructive' : 'outline'}>
                          {ot.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-muted-foreground">
                          {ot.regular_hours.toFixed(1)}h regular
                        </span>
                        <span className="text-orange-600 font-medium">
                          {ot.overtime_hours.toFixed(1)}h OT
                        </span>
                      </div>
                      <div className="mt-2 text-sm">
                        Limit: {ot.weekly_limit}h/week
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Forecasts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Schedule Forecasts
          </CardTitle>
          <CardDescription>
            Predicted demand, labor costs, and coverage needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {forecasts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No forecasts available
              </div>
            ) : (
              forecasts.slice(0, 10).map((forecast) => (
                <div
                  key={forecast.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium mb-1">
                        {format(new Date(forecast.forecast_date), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Badge variant="outline">
                          {forecast.forecast_type.replace('_', ' ')}
                        </Badge>
                        <span className="font-semibold">
                          {forecast.predicted_value.toFixed(2)}
                        </span>
                        {forecast.confidence_level && (
                          <span className="text-muted-foreground">
                            {(forecast.confidence_level * 100).toFixed(0)}% confidence
                          </span>
                        )}
                      </div>
                      {forecast.actual_value && (
                        <div className="mt-2 text-sm">
                          Actual: {forecast.actual_value.toFixed(2)}
                          {forecast.variance && (
                            <span className={forecast.variance > 0 ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                              ({forecast.variance > 0 ? '+' : ''}{forecast.variance.toFixed(2)})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
