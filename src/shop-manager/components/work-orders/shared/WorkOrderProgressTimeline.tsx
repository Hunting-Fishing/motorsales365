import React from 'react';
import { Check, Clock, AlertCircle, Wrench, FileText, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'completed' | 'current' | 'pending';
  description?: string;
}

interface WorkOrderProgressTimelineProps {
  currentStatus: string;
  className?: string;
}

const getTimelineSteps = (currentStatus: string): TimelineStep[] => {
  const statusOrder = ['draft', 'scheduled', 'in_progress', 'waiting_parts', 'completed', 'invoiced'];
  const currentIndex = statusOrder.indexOf(currentStatus);

  return [
    {
      id: 'draft',
      label: 'Created',
      icon: FileText,
      status: currentIndex >= 0 ? 'completed' : 'pending',
      description: 'Work order created'
    },
    {
      id: 'scheduled',
      label: 'Scheduled',
      icon: Clock,
      status: currentIndex >= 1 ? 'completed' : currentIndex === 0 ? 'current' : 'pending',
      description: 'Appointment scheduled'
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      icon: Wrench,
      status: currentIndex >= 2 ? 'completed' : currentIndex === 1 ? 'current' : 'pending',
      description: 'Work in progress'
    },
    {
      id: 'waiting_parts',
      label: 'Parts Check',
      icon: AlertCircle,
      status: currentStatus === 'waiting_parts' ? 'current' : currentIndex > 3 ? 'completed' : 'pending',
      description: 'Awaiting parts or ready'
    },
    {
      id: 'completed',
      label: 'Completed',
      icon: Check,
      status: currentIndex >= 4 ? 'completed' : currentIndex === 3 ? 'current' : 'pending',
      description: 'Work completed'
    },
    {
      id: 'invoiced',
      label: 'Invoiced',
      icon: DollarSign,
      status: currentIndex >= 5 ? 'completed' : currentIndex === 4 ? 'current' : 'pending',
      description: 'Invoice generated'
    }
  ];
};

export function WorkOrderProgressTimeline({ currentStatus, className }: WorkOrderProgressTimelineProps) {
  const steps = getTimelineSteps(currentStatus);
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progressPercentage = (completedSteps / (steps.length - 1)) * 100;

  return (
    <div className={cn("w-full fade-in", className)}>
      <div className="relative">
        {/* Progress Line Background */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-border/60"></div>
        
        {/* Animated Progress Line */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-primary via-primary/90 to-primary/80 transition-all duration-1000 ease-out shadow-sm"
          style={{ 
            width: `${progressPercentage}%`
          }}
        ></div>

        {/* Steps Container */}
        <div className="flex justify-between items-start relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            
            return (
              <div key={step.id} className="flex flex-col items-center text-center max-w-[120px] fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                {/* Icon Circle */}
                <div
                  className={cn(
                    "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-500 font-body",
                    {
                      "bg-success border-success text-success-foreground shadow-lg shadow-success/20": step.status === 'completed',
                      "bg-primary/15 border-primary text-primary animate-pulse shadow-md shadow-primary/10": step.status === 'current',
                      "bg-muted/60 border-muted-foreground/30 text-muted-foreground": step.status === 'pending'
                    }
                  )}
                >
                  {step.status === 'completed' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                {/* Label and Description */}
                <div className="mt-3 space-y-1">
                  <div
                    className={cn(
                      "font-medium text-sm transition-colors font-body",
                      {
                        "text-success": step.status === 'completed',
                        "text-primary font-semibold": step.status === 'current',
                        "text-muted-foreground": step.status === 'pending'
                      }
                    )}
                  >
                    {step.label}
                  </div>
                  
                  {step.description && (
                    <div
                      className={cn(
                        "text-xs leading-tight font-body",
                        {
                          "text-muted-foreground/80": step.status === 'completed',
                          "text-primary/70": step.status === 'current',
                          "text-muted-foreground/60": step.status === 'pending'
                        }
                      )}
                    >
                      {step.description}
                    </div>
                  )}
                </div>

                {/* Current Step Pulse Indicator */}
                {step.status === 'current' && (
                  <div className="absolute -bottom-2 w-2 h-2 bg-primary rounded-full animate-pulse shadow-sm"></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Enhanced Status Summary */}
        <div className="mt-6 p-4 modern-card gradient-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-foreground font-body">
                Current Status: <span className="text-primary font-semibold">{steps.find(s => s.status === 'current')?.label || 'Unknown'}</span>
              </span>
            </div>
            <div className="text-sm text-muted-foreground font-body">
              <span className="text-primary font-medium">{completedSteps}</span> of {steps.length} steps completed
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3 h-1.5 bg-muted/40 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}