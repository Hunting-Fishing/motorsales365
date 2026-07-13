import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Plus, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { DailyShopInspection } from '@/types/safety';
import { useNavigate } from 'react-router-dom';

interface TodayInspectionsCardProps {
  inspections: DailyShopInspection[];
  loading: boolean;
}

const statusIcons = {
  pass: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  pass_with_issues: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  fail: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' }
};

export function TodayInspectionsCard({ inspections, loading }: TodayInspectionsCardProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Today's Inspections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const shiftOrder = ['morning', 'afternoon', 'night'];
  const sortedInspections = [...inspections].sort(
    (a, b) => shiftOrder.indexOf(a.shift || '') - shiftOrder.indexOf(b.shift || '')
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Today's Inspections
        </CardTitle>
        <Button 
          size="sm"
          onClick={() => navigate('/safety/inspections/new')}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Inspection
        </Button>
      </CardHeader>
      <CardContent>
        {sortedInspections.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">No inspections completed today</p>
            <Button 
              variant="outline" 
              className="mt-3"
              onClick={() => navigate('/safety/inspections/new')}
            >
              <Plus className="h-4 w-4 mr-1" />
              Start Daily Inspection
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedInspections.map((inspection) => {
              const status = inspection.overall_status || 'pass';
              const StatusIcon = statusIcons[status]?.icon || CheckCircle;
              const iconColor = statusIcons[status]?.color || 'text-muted-foreground';
              const bgColor = statusIcons[status]?.bg || 'bg-muted';
              
              return (
                <div 
                  key={inspection.id} 
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/safety/inspections/${inspection.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${bgColor}`}>
                      <StatusIcon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div>
                      <p className="font-medium capitalize">
                        {inspection.shift || 'General'} Inspection
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(inspection.created_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {inspection.hazards_identified && inspection.hazards_identified.length > 0 && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
                        {inspection.hazards_identified.length} hazard(s)
                      </Badge>
                    )}
                    <Badge 
                      variant="outline" 
                      className={status === 'pass' ? 'bg-green-500/10 text-green-600' : 
                                 status === 'pass_with_issues' ? 'bg-amber-500/10 text-amber-600' : 
                                 'bg-destructive/10 text-destructive'}
                    >
                      {status === 'pass' ? 'Pass' : 
                       status === 'pass_with_issues' ? 'Issues' : 'Fail'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
