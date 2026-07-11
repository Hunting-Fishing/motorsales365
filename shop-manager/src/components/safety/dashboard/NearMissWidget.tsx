import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNearMissReports } from '@/hooks/useNearMissReports';
import { subDays, isAfter } from 'date-fns';

export function NearMissWidget() {
  const navigate = useNavigate();
  const { reports, loading } = useNearMissReports();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const thirtyDaysAgo = subDays(new Date(), 30);
  const sixtyDaysAgo = subDays(new Date(), 60);

  const recentReports = reports.filter(r => isAfter(new Date(r.report_date), thirtyDaysAgo));
  const previousPeriod = reports.filter(r => 
    isAfter(new Date(r.report_date), sixtyDaysAgo) && 
    !isAfter(new Date(r.report_date), thirtyDaysAgo)
  );

  const pendingReview = reports.filter(r => r.status === 'reported').length;
  const actionRequired = reports.filter(r => r.status === 'action_required').length;

  const trend = recentReports.length - previousPeriod.length;

  return (
    <Card className="border-l-4 border-l-yellow-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Near Miss Reports
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/safety/near-miss')}
          >
            Report
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{recentReports.length}</div>
            <div className="text-xs text-muted-foreground">Last 30 Days</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-yellow-600">{pendingReview}</div>
            <div className="text-xs text-muted-foreground">Pending Review</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-orange-600">{actionRequired}</div>
            <div className="text-xs text-muted-foreground">Action Required</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          {trend > 0 ? (
            <>
              <TrendingUp className="h-4 w-4 text-destructive" />
              <span className="text-muted-foreground">
                <span className="text-destructive font-medium">+{trend}</span> vs previous 30 days
              </span>
            </>
          ) : trend < 0 ? (
            <>
              <TrendingDown className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">
                <span className="text-green-600 font-medium">{trend}</span> vs previous 30 days
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">No change vs previous period</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
