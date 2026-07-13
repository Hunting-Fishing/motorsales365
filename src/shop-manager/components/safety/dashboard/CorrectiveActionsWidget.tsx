import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, ArrowRight, AlertTriangle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCorrectiveActions } from '@/hooks/useCorrectiveActions';

export function CorrectiveActionsWidget() {
  const navigate = useNavigate();
  const { actions, loading, openCount, overdueCount } = useCorrectiveActions();

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

  const inProgressCount = actions.filter(a => a.status === 'in_progress').length;

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-orange-500" />
            Corrective Actions
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/safety/corrective-actions')}
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-orange-600">{openCount}</div>
            <div className="text-xs text-muted-foreground">Open</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              {overdueCount > 0 && <AlertTriangle className="h-4 w-4 text-destructive" />}
              <span className={`text-2xl font-bold ${overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {overdueCount}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
        </div>

        {overdueCount > 0 && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
            <div className="flex items-center gap-2 text-destructive text-sm font-medium">
              <Clock className="h-4 w-4" />
              {overdueCount} action{overdueCount !== 1 ? 's' : ''} past due date
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
