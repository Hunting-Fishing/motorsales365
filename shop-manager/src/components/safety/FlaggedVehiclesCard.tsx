import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, AlertTriangle, Wrench, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import type { DVIRReport } from '@/types/safety';

interface FlaggedVehiclesCardProps {
  dvirReports: DVIRReport[];
  loading?: boolean;
}

export function FlaggedVehiclesCard({ dvirReports, loading }: FlaggedVehiclesCardProps) {
  const navigate = useNavigate();
  
  // Get vehicles that are not safe or need mechanic review
  const flaggedReports = dvirReports.filter(d => 
    !d.vehicle_safe_to_operate || 
    (d.mechanic_review_required && !d.mechanic_reviewed_by)
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Flagged Vehicles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Flagged Vehicles
          {flaggedReports.length > 0 && (
            <Badge variant="destructive">{flaggedReports.length}</Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/safety/dvir')}>
          View All
        </Button>
      </CardHeader>
      <CardContent>
        {flaggedReports.length > 0 ? (
          <div className="space-y-3">
            {flaggedReports.slice(0, 5).map((report) => (
              <div
                key={report.id}
                className={`p-3 rounded-lg border ${
                  !report.vehicle_safe_to_operate 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200' 
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {!report.vehicle_safe_to_operate ? (
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    ) : (
                      <Wrench className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm">Vehicle ID: {report.vehicle_id.slice(0, 8)}...</p>
                      <p className="text-xs text-muted-foreground">
                        {report.inspection_type.replace('_', '-')} • {report.driver_name}
                      </p>
                      {report.defects_description && (
                        <p className="text-xs mt-1 text-red-600 dark:text-red-400 line-clamp-1">
                          {report.defects_description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge 
                      variant={!report.vehicle_safe_to_operate ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {!report.vehicle_safe_to_operate ? 'Out of Service' : 'Review Needed'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => navigate(`/safety/dvir/${report.id}`)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Truck className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium">All Vehicles Clear</p>
            <p className="text-xs text-muted-foreground">
              No flagged vehicles at this time
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
