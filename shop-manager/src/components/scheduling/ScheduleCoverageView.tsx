import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, AlertTriangle } from 'lucide-react';
import { useScheduleCoverage } from '@/hooks/useScheduleCoverage';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function ScheduleCoverageView() {
  const { coverage, loading } = useScheduleCoverage();

  const getCoverageForDayHour = (day: number, hour: number) => {
    return coverage.find(
      c => c.day_of_week === day && 
      new Date(`2000-01-01T${c.hour_block}`).getHours() === hour
    );
  };

  const getCoverageColor = (count: number) => {
    if (count === 0) return 'bg-destructive/10 text-destructive';
    if (count === 1) return 'bg-yellow-500/10 text-yellow-600';
    if (count === 2) return 'bg-primary/10 text-primary';
    return 'bg-green-500/10 text-green-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Coverage Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Weekly Coverage Overview
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Number of employees scheduled per hour, per day
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-destructive/10" />
              <span>No coverage</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-yellow-500/10" />
              <span>Low (1)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-primary/10" />
              <span>Good (2)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-500/10" />
              <span>High (3+)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border p-2 text-left sticky left-0 bg-background">Day</th>
                  {HOURS.map(hour => (
                    <th key={hour} className="border p-1 text-center min-w-[40px]">
                      {hour.toString().padStart(2, '0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, dayIndex) => (
                  <tr key={dayIndex}>
                    <td className="border p-2 font-medium sticky left-0 bg-background">
                      {day}
                    </td>
                    {HOURS.map(hour => {
                      const coverageData = getCoverageForDayHour(dayIndex, hour);
                      const count = coverageData?.employee_count || 0;
                      
                      return (
                        <td
                          key={hour}
                          className={`border p-1 text-center ${getCoverageColor(count)}`}
                          title={
                            coverageData?.employee_names?.length
                              ? coverageData.employee_names.join(', ')
                              : 'No coverage'
                          }
                        >
                          {count > 0 ? count : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Coverage Warnings */}
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              Coverage Gaps
            </h4>
            {DAYS.map((day, dayIndex) => {
              const gaps = HOURS.filter(hour => {
                const coverageData = getCoverageForDayHour(dayIndex, hour);
                return !coverageData || coverageData.employee_count === 0;
              });

              if (gaps.length === 0) return null;

              return (
                <div key={dayIndex} className="text-sm">
                  <span className="font-medium">{day}:</span>{' '}
                  <span className="text-muted-foreground">
                    {gaps.length} hours with no coverage
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
