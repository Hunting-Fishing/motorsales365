
import React from 'react';
import { WorkOrder } from '@/types/workOrder';
import { TimeEntry } from '@/types/workOrder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar, Timer, TrendingUp } from 'lucide-react';

interface WorkOrderTimeCardProps {
  timeEntries: TimeEntry[];
  workOrder: WorkOrder;
}

export function WorkOrderTimeCard({ timeEntries, workOrder }: WorkOrderTimeCardProps) {
  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
  const billableHours = timeEntries
    .filter(entry => entry.billable)
    .reduce((sum, entry) => sum + entry.duration, 0);

  const formatHours = (hours: number) => {
    return (hours / 60).toFixed(1); // Assuming duration is in minutes
  };

  const billablePercentage = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

  return (
    <Card className="modern-card gradient-border group hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-4 bg-gradient-subtle rounded-t-lg">
        <CardTitle className="section-title flex items-center gap-3 font-heading text-foreground">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          Time Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 backdrop-blur-sm">
        {/* Time Summary Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-gradient-subtle border hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-muted-foreground font-body">Total Hours</p>
            </div>
            <p className="text-2xl font-bold text-foreground font-heading gradient-text">
              {formatHours(totalHours)}h
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-gradient-subtle border hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <p className="text-sm font-medium text-muted-foreground font-body">Billable Hours</p>
            </div>
            <p className="text-2xl font-bold text-success font-heading">
              {formatHours(billableHours)}h
            </p>
          </div>
        </div>

        {/* Billable Percentage Bar */}
        {totalHours > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground font-body">Billable Rate</span>
              <span className="text-sm font-semibold text-foreground font-body">{billablePercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-success to-success/80 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${billablePercentage}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Additional Details */}
        <div className="space-y-3 pt-2 border-t border-muted/20">
          {workOrder.created_at && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border">
              <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-muted-foreground font-body">Created:</span>
                <span className="ml-2 text-sm font-semibold text-foreground font-body">
                  {new Date(workOrder.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-sm font-medium text-muted-foreground font-body">Time Entries</span>
            <span className="text-sm font-bold text-primary font-body">
              {timeEntries.length} {timeEntries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
