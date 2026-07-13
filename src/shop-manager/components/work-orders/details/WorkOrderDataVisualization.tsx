import React from 'react';
import { WorkOrder } from '@/types/workOrder';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart } from '@/types/workOrderPart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WorkOrderDataVisualizationProps {
  workOrder: WorkOrder;
  jobLines?: WorkOrderJobLine[];
  parts?: WorkOrderPart[];
  className?: string;
}

export function WorkOrderDataVisualization({
  workOrder,
  jobLines = [],
  parts = [],
  className = ''
}: WorkOrderDataVisualizationProps) {
  // Calculate cost breakdown
  const laborCost = jobLines?.reduce((sum, line) => sum + (line.total_amount || 0), 0) || 0;
  const partsCost = parts?.reduce((sum, part) => sum + ((part.quantity || 0) * (part.unit_price || 0)), 0) || 0;
  const totalCost = laborCost + partsCost;

  const laborPercentage = totalCost > 0 ? (laborCost / totalCost) * 100 : 0;
  const partsPercentage = totalCost > 0 ? (partsCost / totalCost) * 100 : 0;

  // Status progress mapping
  const statusProgress = {
    'draft': 0,
    'pending': 15,
    'scheduled': 25,
    'in_progress': 60,
    'awaiting_parts': 45,
    'quality_check': 85,
    'completed': 100,
    'cancelled': 0,
    'on_hold': 30
  };

  const currentProgress = statusProgress[workOrder.status as keyof typeof statusProgress] || 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cost Breakdown Visualization */}
      <Card className="modern-card gradient-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-heading">Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Cost Display */}
          <div className="text-center p-4 bg-gradient-subtle rounded-lg">
            <p className="text-3xl font-bold text-foreground font-heading gradient-text">
              ${totalCost.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground font-body">Total Estimated Cost</p>
          </div>

          {/* Cost Breakdown Bars */}
          <div className="space-y-3">
            {/* Labor Cost */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground font-body">Labor</span>
                <span className="text-sm font-bold text-foreground">${laborCost.toFixed(2)}</span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${laborPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{laborPercentage.toFixed(1)}% of total</p>
            </div>

            {/* Parts Cost */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground font-body">Parts</span>
                <span className="text-sm font-bold text-foreground">${partsCost.toFixed(2)}</span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${partsPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{partsPercentage.toFixed(1)}% of total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Visualization */}
      <Card className="modern-card gradient-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-heading">Work Order Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Circle */}
          <div className="flex items-center justify-center">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  fill="none"
                  className="opacity-20"
                />
                {/* Progress Circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - currentProgress / 100)}`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-foreground font-heading">
                  {currentProgress}%
                </span>
              </div>
            </div>
          </div>

          {/* Status Information */}
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-foreground capitalize font-body">
              {workOrder.status.replace('_', ' ')}
            </p>
            {workOrder.priority && (
              <p className="text-xs text-muted-foreground">
                Priority: <span className="capitalize font-medium">{workOrder.priority}</span>
              </p>
            )}
          </div>

          {/* Progress Steps */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Started</span>
              <span>In Progress</span>
              <span>Completed</span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-1">
              <div 
                className="bg-gradient-to-r from-primary to-primary/80 h-1 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="modern-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground font-heading">
              {jobLines.length}
            </p>
            <p className="text-xs text-muted-foreground font-body">Job Lines</p>
          </CardContent>
        </Card>
        
        <Card className="modern-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground font-heading">
              {parts.length}
            </p>
            <p className="text-xs text-muted-foreground font-body">Parts</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}