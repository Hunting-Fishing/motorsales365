import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Droplets, Plus, Trash2, Edit2, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useWaterTruckTanks, useDeleteWaterTruckTank, WaterTruckTank } from '@/hooks/water-delivery/useWaterTruckTanks';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';
import { AddWaterTruckTankDialog } from './AddWaterTruckTankDialog';
import { EditWaterTruckTankDialog } from './EditWaterTruckTankDialog';
import { format } from 'date-fns';

interface WaterTruckTanksSectionProps {
  truckId: string;
}

const getMaterialLabel = (material: string | null) => {
  const materials: Record<string, string> = {
    'stainless_steel': 'Stainless Steel',
    'aluminum': 'Aluminum',
    'fiberglass': 'Fiberglass',
    'food_grade_plastic': 'Food-Grade Plastic',
    'carbon_steel': 'Carbon Steel',
    'poly': 'Polyethylene',
  };
  return material ? materials[material] || material : 'Not specified';
};

export function WaterTruckTanksSection({ truckId }: WaterTruckTanksSectionProps) {
  const { data: tanks, isLoading } = useWaterTruckTanks(truckId);
  const deleteTank = useDeleteWaterTruckTank();
  const { getVolumeLabel, convertFromGallons } = useWaterUnits();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTank, setEditingTank] = useState<WaterTruckTank | null>(null);
  const [deletingTank, setDeletingTank] = useState<WaterTruckTank | null>(null);

  const handleDelete = async () => {
    if (!deletingTank) return;
    await deleteTank.mutateAsync({ id: deletingTank.id, truckId });
    setDeletingTank(null);
  };

  const getTotalCapacity = () => {
    if (!tanks) return 0;
    return tanks.reduce((sum, tank) => sum + Number(tank.capacity_gallons), 0);
  };

  const getTotalCurrentLevel = () => {
    if (!tanks) return 0;
    return tanks.reduce((sum, tank) => sum + Number(tank.current_level_gallons), 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-cyan-600" />
            Tank Compartments
          </h3>
          {tanks && tanks.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Total: {convertFromGallons(getTotalCurrentLevel()).toLocaleString()} / {convertFromGallons(getTotalCapacity()).toLocaleString()} {getVolumeLabel()}
            </p>
          )}
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)}
          size="sm"
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Tank
        </Button>
      </div>

      {tanks && tanks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Droplets className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-center">No tanks configured</p>
            <Button 
              onClick={() => setShowAddDialog(true)} 
              variant="outline" 
              size="sm" 
              className="mt-3"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add First Tank
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tanks?.map((tank) => {
            const capacity = Number(tank.capacity_gallons);
            const currentLevel = Number(tank.current_level_gallons);
            const fillPercentage = capacity > 0 ? (currentLevel / capacity) * 100 : 0;
            const isLow = fillPercentage < 20;

            return (
              <Card key={tank.id} className="relative overflow-hidden">
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-500/20 to-transparent transition-all duration-500"
                  style={{ height: `${fillPercentage}%` }}
                />
                <CardHeader className="pb-2 relative">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      {tank.tank_name || `Tank ${tank.tank_number}`}
                      {tank.is_potable_certified && (
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingTank(tank)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingTank(tank)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Water Level</span>
                      <span className={`font-medium ${isLow ? 'text-amber-600' : ''}`}>
                        {fillPercentage.toFixed(0)}%
                        {isLow && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                      </span>
                    </div>
                    <Progress 
                      value={fillPercentage} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {convertFromGallons(currentLevel).toLocaleString()} / {convertFromGallons(capacity).toLocaleString()} {getVolumeLabel()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      {getMaterialLabel(tank.material)}
                    </Badge>
                    {tank.last_fill_date && (
                      <Badge variant="secondary" className="text-xs">
                        Filled: {format(new Date(tank.last_fill_date), 'MMM d')}
                      </Badge>
                    )}
                  </div>

                  {tank.next_sanitization_due && (
                    <p className="text-xs text-muted-foreground">
                      Next sanitization: {format(new Date(tank.next_sanitization_due), 'MMM d, yyyy')}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddWaterTruckTankDialog
        truckId={truckId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      {editingTank && (
        <EditWaterTruckTankDialog
          tank={editingTank}
          open={!!editingTank}
          onOpenChange={(open) => !open && setEditingTank(null)}
        />
      )}

      <AlertDialog open={!!deletingTank} onOpenChange={(open) => !open && setDeletingTank(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tank</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTank?.tank_name || `Tank ${deletingTank?.tank_number}`}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTank.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
