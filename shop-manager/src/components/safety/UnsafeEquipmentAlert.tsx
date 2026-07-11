import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertOctagon, Wrench, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import type { LiftHoistInspection } from '@/types/safety';
import { useNavigate } from 'react-router-dom';

interface UnsafeEquipmentAlertProps {
  unsafeLifts: LiftHoistInspection[];
  loading: boolean;
}

const equipmentTypeLabels: Record<string, string> = {
  two_post_lift: '2-Post Lift',
  four_post_lift: '4-Post Lift',
  scissor_lift: 'Scissor Lift',
  alignment_lift: 'Alignment Lift',
  mobile_column_lift: 'Mobile Column Lift',
  engine_hoist: 'Engine Hoist',
  transmission_jack: 'Transmission Jack',
  floor_jack: 'Floor Jack',
  jack_stands: 'Jack Stands',
  other: 'Other'
};

export function UnsafeEquipmentAlert({ unsafeLifts, loading }: UnsafeEquipmentAlertProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertOctagon className="h-5 w-5" />
            Equipment Out of Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (unsafeLifts.length === 0) {
    return (
      <Card className="border-green-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Wrench className="h-5 w-5" />
            Equipment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="p-4 rounded-full bg-green-500/10 w-fit mx-auto mb-3">
              <Wrench className="h-8 w-8 text-green-500" />
            </div>
            <p className="font-medium text-green-600">All Equipment Operational</p>
            <p className="text-sm text-muted-foreground">No lifts or hoists out of service</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertOctagon className="h-5 w-5" />
          Equipment Out of Service ({unsafeLifts.length})
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/safety/equipment')}
        >
          Manage
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {unsafeLifts.map((lift) => (
            <div 
              key={lift.id} 
              className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertOctagon className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{lift.equipment_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {equipmentTypeLabels[lift.equipment_type] || lift.equipment_type}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="destructive">
                  {lift.locked_out ? 'LOCKOUT' : 'Out of Service'}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  Since {format(new Date(lift.inspection_date), 'MMM d')}
                </p>
              </div>
            </div>
          ))}
        </div>
        {unsafeLifts.some(l => l.lockout_reason) && (
          <div className="mt-4 p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium mb-1">Lockout Reasons:</p>
            {unsafeLifts.filter(l => l.lockout_reason).map((lift) => (
              <p key={lift.id} className="text-sm text-muted-foreground">
                • {lift.equipment_name}: {lift.lockout_reason}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
