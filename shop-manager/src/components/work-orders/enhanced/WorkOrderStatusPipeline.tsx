import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

interface StatusStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'completed' | 'current' | 'pending' | 'skipped';
}

interface WorkOrderStatusPipelineProps {
  currentStatus: string;
  workOrderId: string;
  onStatusChange: (status: string) => void;
  className?: string;
}

export function WorkOrderStatusPipeline({ 
  currentStatus, 
  workOrderId, 
  onStatusChange,
  className 
}: WorkOrderStatusPipelineProps) {
  const statusSteps: StatusStep[] = [
    { id: 'draft', label: 'Draft', icon: Circle, status: 'completed' },
    { id: 'pending', label: 'Pending', icon: Clock, status: 'completed' },
    { id: 'scheduled', label: 'Scheduled', icon: CheckCircle2, status: 'current' },
    { id: 'in_progress', label: 'In Progress', icon: Clock, status: 'pending' },
    { id: 'quality_check', label: 'Quality Check', icon: AlertCircle, status: 'pending' },
    { id: 'completed', label: 'Completed', icon: CheckCircle2, status: 'pending' }
  ];

  // Update status based on current status
  const updateStepStatuses = (steps: StatusStep[]) => {
    const currentIndex = steps.findIndex(step => step.id === currentStatus);
    return steps.map((step, index) => ({
      ...step,
      status: index < currentIndex ? 'completed' as const :
              index === currentIndex ? 'current' as const : 'pending' as const
    }));
  };

  const updatedSteps = updateStepStatuses(statusSteps);
  const currentIndex = updatedSteps.findIndex(step => step.status === 'current');
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / updatedSteps.length) * 100 : 0;

  const getStepIcon = (step: StatusStep) => {
    const IconComponent = step.icon;
    
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'current':
        return <Clock className="w-5 h-5 text-primary animate-pulse" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStepClasses = (step: StatusStep) => {
    switch (step.status) {
      case 'completed':
        return 'bg-success/10 border-success/20 text-success';
      case 'current':
        return 'bg-primary/10 border-primary/20 text-primary';
      default:
        return 'bg-muted/10 border-muted/20 text-muted-foreground';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Status Pipeline</CardTitle>
        <Progress value={progress} className="w-full" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {updatedSteps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${getStepClasses(step)}`}>
                {getStepIcon(step)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${step.status === 'current' ? 'text-primary' : step.status === 'completed' ? 'text-success' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                  
                  {step.status === 'pending' && index === currentIndex + 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onStatusChange(step.id)}
                      className="text-xs"
                    >
                      Move to {step.label}
                    </Button>
                  )}
                </div>
                
                {step.status === 'current' && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Current status - in progress
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}