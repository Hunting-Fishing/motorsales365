import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSafetyTraining } from '@/hooks/useSafetyTraining';

export function TrainingComplianceWidget() {
  const navigate = useNavigate();
  const { assignments, loading } = useSafetyTraining();

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

  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(a => a.status === 'completed').length;
  const overdueAssignments = assignments.filter(a => 
    a.status !== 'completed' && 
    a.due_date && 
    new Date(a.due_date) < new Date()
  ).length;

  const complianceRate = totalAssignments > 0 
    ? Math.round((completedAssignments / totalAssignments) * 100) 
    : 100;

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-500" />
            Training Compliance
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/safety/training')}
          >
            Manage
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Compliance Rate</span>
            <span className={`text-2xl font-bold ${complianceRate >= 90 ? 'text-green-600' : complianceRate >= 70 ? 'text-yellow-600' : 'text-destructive'}`}>
              {complianceRate}%
            </span>
          </div>
          
          <Progress 
            value={complianceRate} 
            className="h-2"
          />

          <div className="grid grid-cols-2 gap-4 text-center pt-2">
            <div className="space-y-1">
              <div className="text-lg font-semibold text-green-600">{completedAssignments}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                {overdueAssignments > 0 && <AlertCircle className="h-4 w-4 text-destructive" />}
                <span className={`text-lg font-semibold ${overdueAssignments > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {overdueAssignments}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
