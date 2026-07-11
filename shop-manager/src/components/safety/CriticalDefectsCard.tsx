import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertOctagon, Wrench, Clock, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import type { LiftHoistInspection, DVIRReport } from '@/types/safety';

interface CriticalDefectsCardProps {
  liftInspections: LiftHoistInspection[];
  dvirReports: DVIRReport[];
  loading?: boolean;
}

export function CriticalDefectsCard({ liftInspections, dvirReports, loading }: CriticalDefectsCardProps) {
  const navigate = useNavigate();
  
  // Get critical items: locked out equipment and unsafe vehicles
  const lockedOutEquipment = liftInspections.filter(i => i.locked_out || !i.safe_for_use);
  const unsafeVehicles = dvirReports.filter(d => !d.vehicle_safe_to_operate);
  
  const totalCritical = lockedOutEquipment.length + unsafeVehicles.length;

  if (loading) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertOctagon className="h-5 w-5" />
            Critical Defects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalCritical === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5" />
            Critical Defects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
            <p className="text-sm font-medium">No Critical Defects</p>
            <p className="text-xs text-muted-foreground">
              All equipment and vehicles operational
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertOctagon className="h-5 w-5" />
          Critical Defects
          <Badge variant="destructive">{totalCritical}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Locked Out Equipment */}
        {lockedOutEquipment.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Equipment Out of Service
            </h4>
            <div className="space-y-2">
              {lockedOutEquipment.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm"
                >
                  <div>
                    <p className="font-medium">{item.equipment_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.lockout_reason || 'Unsafe for use'}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs">Locked Out</Badge>
                </div>
              ))}
              {lockedOutEquipment.length > 3 && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => navigate('/safety/equipment')}
                >
                  +{lockedOutEquipment.length - 3} more
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Unsafe Vehicles */}
        {unsafeVehicles.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Vehicles Out of Service
            </h4>
            <div className="space-y-2">
              {unsafeVehicles.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm"
                >
                  <div>
                    <p className="font-medium">Vehicle {item.vehicle_id.slice(0, 8)}...</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {item.defects_description || 'Not safe to operate'}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs">Out of Service</Badge>
                </div>
              ))}
              {unsafeVehicles.length > 3 && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => navigate('/safety/dvir')}
                >
                  +{unsafeVehicles.length - 3} more
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
