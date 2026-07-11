
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Check, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { VehicleBodyStyle } from '@/types/vehicleBodyStyles';
import VehicleInteractivePanel from '../customers/vehicles/VehicleInteractivePanel';
import { DamageArea } from '@/services/vehicleInspectionService';

interface ExteriorCheckTabProps {
  vehicleBodyStyle: VehicleBodyStyle;
  damageAreas?: DamageArea[];
  onDamageAreasChange?: (damageAreas: DamageArea[]) => void;
}

const ExteriorCheckTab: React.FC<ExteriorCheckTabProps> = ({ 
  vehicleBodyStyle = 'sedan',
  damageAreas = [],
  onDamageAreasChange
}) => {
  // Initialize damage areas
  const [localDamageAreas, setLocalDamageAreas] = useState<DamageArea[]>([
    { id: 'front', name: 'Front', isDamaged: false, damageType: null, notes: '' },
    { id: 'rear', name: 'Rear', isDamaged: false, damageType: null, notes: '' },
    { id: 'driver_side', name: 'Driver Side', isDamaged: false, damageType: null, notes: '' },
    { id: 'passenger_side', name: 'Passenger Side', isDamaged: false, damageType: null, notes: '' },
    { id: 'hood', name: 'Hood', isDamaged: false, damageType: null, notes: '' },
    { id: 'roof', name: 'Roof', isDamaged: false, damageType: null, notes: '' },
    { id: 'windshield', name: 'Windshield', isDamaged: false, damageType: null, notes: '' },
    { id: 'trunk', name: 'Trunk/Cargo', isDamaged: false, damageType: null, notes: '' },
    { id: 'left_front_door', name: 'Left Front Door', isDamaged: false, damageType: null, notes: '' },
    { id: 'right_front_door', name: 'Right Front Door', isDamaged: false, damageType: null, notes: '' },
    { id: 'left_rear_door', name: 'Left Rear Door', isDamaged: false, damageType: null, notes: '' },
    { id: 'right_rear_door', name: 'Right Rear Door', isDamaged: false, damageType: null, notes: '' },
    { id: 'left_front_fender', name: 'Left Front Fender', isDamaged: false, damageType: null, notes: '' },
    { id: 'right_front_fender', name: 'Right Front Fender', isDamaged: false, damageType: null, notes: '' },
    { id: 'truck_bed', name: 'Truck Bed', isDamaged: false, damageType: null, notes: '' },
  ]);
  
  // If provided with initial damage areas data, merge it with our default data
  useEffect(() => {
    if (damageAreas && damageAreas.length > 0) {
      // Create a map of existing damage areas for quick lookup
      const damageAreaMap = damageAreas.reduce((map, area) => {
        map[area.id] = area;
        return map;
      }, {} as Record<string, DamageArea>);
      
      // Update local state with provided data
      setLocalDamageAreas(prevAreas => 
        prevAreas.map(area => {
          if (damageAreaMap[area.id]) {
            return {
              ...area,
              isDamaged: damageAreaMap[area.id].isDamaged,
              damageType: damageAreaMap[area.id].damageType,
              notes: damageAreaMap[area.id].notes
            };
          }
          return area;
        })
      );
    }
  }, [damageAreas]);
  
  const [selectedArea, setSelectedArea] = useState<DamageArea | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tempDamageType, setTempDamageType] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  
  const damageTypes = [
    { id: 'scratch', label: 'Scratch' },
    { id: 'dent', label: 'Dent' },
    { id: 'crack', label: 'Crack' },
    { id: 'rust', label: 'Rust' },
  ];
  
  const handleAreaClick = (areaId: string) => {
    const area = localDamageAreas.find(a => a.id === areaId) || null;
    setSelectedArea(area);
    
    if (area) {
      setTempDamageType(area.damageType);
      setTempNotes(area.notes);
    }
    
    setIsDialogOpen(true);
  };
  
  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedArea(null);
    setTempDamageType(null);
    setTempNotes('');
  };
  
  const handleSaveDamage = () => {
    if (!selectedArea) return;
    
    const updatedAreas = localDamageAreas.map(area => {
      if (area.id === selectedArea.id) {
        return {
          ...area,
          isDamaged: !!tempDamageType,
          damageType: tempDamageType,
          notes: tempNotes
        };
      }
      return area;
    });
    
    setLocalDamageAreas(updatedAreas);
    
    // Notify parent component of changes
    if (onDamageAreasChange) {
      onDamageAreasChange(updatedAreas);
    }
    
    toast({
      title: "Damage recorded",
      description: `Updated ${selectedArea.name} inspection information`,
    });
    
    closeDialog();
  };
  
  const handleClearDamage = () => {
    if (!selectedArea) return;
    
    setTempDamageType(null);
    setTempNotes('');
  };

  return (
    <Card className="overflow-hidden border border-blue-100 shadow-md transition-all hover:shadow-lg rounded-xl">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 pb-4">
        <CardTitle className="text-xl font-semibold flex items-center text-blue-900">
          <Check className="mr-3 h-6 w-6 text-blue-700" />
          Exterior Condition Inspection
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-medium mb-4 text-blue-800">Click on any view to mark damage</h3>
          
          <VehicleInteractivePanel
            vehicleType={vehicleBodyStyle}
            damageAreas={localDamageAreas}
            onAreaClick={handleAreaClick}
          />
          
          {/* Damage report */}
          {localDamageAreas.some(area => area.isDamaged) && (
            <div className="mt-6 border rounded-lg p-4 bg-white shadow-sm">
              <h4 className="font-medium mb-3">Damage Report:</h4>
              <div className="space-y-2">
                {localDamageAreas
                  .filter(area => area.isDamaged)
                  .map(area => (
                    <div key={area.id} className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-md">
                      <div className="flex justify-between items-center">
                        <h5 className="font-medium text-amber-900">{area.name}</h5>
                        <Badge variant="outline" className="bg-white">
                          {area.damageType}
                        </Badge>
                      </div>
                      {area.notes && <p className="text-sm mt-1 text-gray-600">{area.notes}</p>}
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
        
        {/* Checklist view */}
        <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4 mt-6">
          <h3 className="text-lg font-medium mb-4 text-blue-800">Exterior Condition Checklist</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localDamageAreas.map(area => (
              <div 
                key={area.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => handleAreaClick(area.id)}
              >
                <div>
                  <h4 className="font-medium">{area.name}</h4>
                  <p className="text-sm text-gray-500">
                    {area.isDamaged 
                      ? `${area.damageType || 'Damaged'} ${area.notes ? `- ${area.notes}` : ''}`
                      : 'No issues reported'
                    }
                  </p>
                </div>
                {area.isDamaged ? (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                ) : (
                  <Check className="h-5 w-5 text-green-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      
      {/* Damage Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedArea?.name || 'Area'} Condition</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Damage Type</Label>
              <RadioGroup value={tempDamageType || ''} onValueChange={setTempDamageType} className="flex flex-wrap gap-4">
                {damageTypes.map(type => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={type.id} id={`damage-${type.id}`} />
                    <Label htmlFor={`damage-${type.id}`} className="cursor-pointer">{type.label}</Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="" id="damage-none" />
                  <Label htmlFor="damage-none" className="cursor-pointer">No Damage</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="damage-notes">Notes</Label>
              <Textarea 
                id="damage-notes"
                placeholder="Add details about the damage"
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button variant="outline" onClick={handleClearDamage} type="button">
              Clear
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeDialog} type="button">
                Cancel
              </Button>
              <Button onClick={handleSaveDamage} type="button">
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ExteriorCheckTab;
