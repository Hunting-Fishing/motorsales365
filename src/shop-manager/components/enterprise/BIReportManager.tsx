import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Play, Trash } from 'lucide-react';
import { useBIReports } from '@/hooks/useBIReports';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function BIReportManager() {
  const { loading, reports, executions, executeReport, deleteReport } = useBIReports();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>BI Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart className="h-5 w-5" />
          <CardTitle>BI Reports</CardTitle>
        </div>
        <CardDescription>
          Create and execute business intelligence reports
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reports configured
            </div>
          ) : (
            reports.map((report) => {
              const lastExecution = executions.find(e => e.report_id === report.id);
              
              return (
                <div
                  key={report.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold mb-1">{report.name}</div>
                      {report.description && (
                        <div className="text-sm text-muted-foreground mb-2">
                          {report.description}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {report.is_public && (
                          <Badge variant="secondary">Public</Badge>
                        )}
                        <span>Created {format(new Date(report.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      {lastExecution && (
                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">Last run: </span>
                          <Badge variant={
                            lastExecution.status === 'completed' ? 'default' :
                            lastExecution.status === 'failed' ? 'destructive' : 'secondary'
                          }>
                            {lastExecution.status}
                          </Badge>
                          <span className="text-muted-foreground ml-2">
                            {format(new Date(lastExecution.created_at), 'MMM d, HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeReport(report.id)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteReport(report.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
