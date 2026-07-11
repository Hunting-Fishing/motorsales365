import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useCompliance } from '@/hooks/useCompliance';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function ComplianceMonitor() {
  const { loading, violations } = useCompliance();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compliance Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const unresolvedViolations = violations.filter(v => !v.resolved);
  const resolvedViolations = violations.filter(v => v.resolved);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Compliance Monitor
        </CardTitle>
        <CardDescription>
          Track and resolve compliance violations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {unresolvedViolations.length === 0 && resolvedViolations.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-success mb-2" />
            <div className="text-muted-foreground">No compliance violations</div>
          </div>
        ) : (
          <div className="space-y-4">
            {unresolvedViolations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-destructive">
                  Active Violations ({unresolvedViolations.length})
                </h3>
                <div className="space-y-2">
                  {unresolvedViolations.map((violation) => (
                    <div
                      key={violation.id}
                      className="p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="font-medium">{violation.violation_type}</div>
                        <Badge variant={getSeverityColor(violation.severity)}>
                          {violation.severity}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-1">
                        {violation.description}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(violation.violation_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resolvedViolations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-success">
                  Resolved ({resolvedViolations.length})
                </h3>
                <div className="space-y-2">
                  {resolvedViolations.slice(0, 3).map((violation) => (
                    <div
                      key={violation.id}
                      className="p-3 rounded-lg bg-muted/30 border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{violation.violation_type}</div>
                          <div className="text-xs text-muted-foreground">
                            Resolved {format(new Date(violation.resolved_at!), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
