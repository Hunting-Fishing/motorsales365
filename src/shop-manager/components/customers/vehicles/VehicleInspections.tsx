
import React, { useState, useEffect } from 'react';
import { FileText, Camera, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import VehicleInteractivePanel from './VehicleInteractivePanel';
import { VehicleBodyStyle } from '@/types/vehicleBodyStyles';

interface DamageArea {
  id: string;
  name: string;
  isDamaged: boolean;
  damageType: string | null;
  notes: string;
}

export const VehicleInspections: React.FC<{ vehicleId: string }> = ({ vehicleId }) => {
  const [inspectionExists, setInspectionExists] = useState(false);
  const [activeTab, setActiveTab] = useState("interactive");
  const { toast } = useToast();
  
  // Get the vehicle body style from VIN or other data
  const [vehicleBodyStyle, setVehicleBodyStyle] = useState<VehicleBodyStyle>('sedan');
  
  // Determine vehicle type from VIN or stored data
  useEffect(() => {
    const fetchVehicleDetails = async () => {
      try {
        // This would normally come from an API based on vehicleId
        // For demo, we're setting a default or checking the URL for a type param
        const urlParams = new URLSearchParams(window.location.search);
        const typeParam = urlParams.get('type');
        
        if (typeParam && ['sedan', 'truck', 'suv', 'hatchback', 'van'].includes(typeParam)) {
          setVehicleBodyStyle(typeParam as VehicleBodyStyle);
        } else {
          // If no type parameter is present, you could fetch from an API
          // For now, we'll just use 'sedan' as default
          setVehicleBodyStyle('sedan');
        }
      } catch (error) {
        console.error("Error fetching vehicle details:", error);
      }
    };
    
    fetchVehicleDetails();
  }, [vehicleId]);
  
  // Damage areas for the vehicle
  const [damageAreas, setDamageAreas] = useState<DamageArea[]>([
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
  
  const [selectedArea, setSelectedArea] = useState<DamageArea | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const damageTypes = [
    { id: 'scratch', label: 'Scratch' },
    { id: 'dent', label: 'Dent' },
    { id: 'crack', label: 'Crack' },
    { id: 'rust', label: 'Rust' },
  ];
  
  const handleAreaClick = (areaId: string) => {
    const area = damageAreas.find(a => a.id === areaId) || null;
    setSelectedArea(area);
    setIsDialogOpen(true);
  };
  
  const handleDamageUpdate = (damageType: string | null, notes: string) => {
    if (!selectedArea) return;
    
    const updatedAreas = damageAreas.map(area => {
      if (area.id === selectedArea.id) {
        return {
          ...area,
          isDamaged: !!damageType,
          damageType,
          notes
        };
      }
      return area;
    });
    
    setDamageAreas(updatedAreas);
    setIsDialogOpen(false);
    
    toast({
      title: "Damage recorded",
      description: `Updated ${selectedArea.name} inspection information`,
    });
  };
  
  const createInspection = () => {
    setInspectionExists(true);
    toast({
      title: "Inspection created",
      description: "New vehicle inspection has been created",
    });
  };
  
  const saveInspection = () => {
    toast({
      title: "Inspection saved",
      description: "Vehicle inspection has been saved successfully",
      variant: "success",
    });
  };

  if (!inspectionExists) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText className="w-16 h-16 mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No Inspections Found</h3>
        <p className="text-muted-foreground mb-6">
          There are no digital inspections recorded for this vehicle.
        </p>
        <Button onClick={createInspection} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg transition-all duration-300">
          <FileText className="mr-2 h-4 w-4" />
          Create New Inspection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-blue-100 shadow-md transition-all hover:shadow-lg rounded-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 pb-4">
          <CardTitle className="text-xl font-semibold flex items-center text-blue-900">
            <FileText className="mr-3 h-6 w-6 text-blue-700" />
            Vehicle Inspection Report
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6 w-full">
              <TabsTrigger value="interactive" className="flex-1">
                Interactive View
              </TabsTrigger>
              <TabsTrigger value="checklist" className="flex-1">
                Checklist View
              </TabsTrigger>
              <TabsTrigger value="photos" className="flex-1">
                Photos
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="interactive" className="space-y-4 animate-fade-in">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="text-lg font-medium mb-4 text-blue-800">Click on any view to mark damage</h3>
                
                <VehicleInteractivePanel
                  vehicleType={vehicleBodyStyle}
                  damageAreas={damageAreas}
                  onAreaClick={handleAreaClick}
                />
                
                {/* Damage report */}
                {damageAreas.some(area => area.isDamaged) && (
                  <div className="mt-6 border rounded-lg p-4 bg-white shadow-sm">
                    <h4 className="font-medium mb-3">Damage Report:</h4>
                    <div className="space-y-2">
                      {damageAreas
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
            </TabsContent>
            
            <TabsContent value="checklist" className="space-y-4 animate-fade-in">
              <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
                <h3 className="text-lg font-medium mb-4 text-blue-800">Exterior Condition Checklist</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {damageAreas.map(area => (
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
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="photos" className="space-y-4 animate-fade-in">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="text-lg font-medium mb-4 text-blue-800">Inspection Photos</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Photo placeholders with upload buttons */}
                  {['Front View', 'Rear View', 'Driver Side', 'Passenger Side', 'Hood', 'Additional'].map((view, index) => (
                    <div key={index} className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center aspect-square bg-gray-50 hover:bg-gray-100 transition-colors">
                      <Camera className="h-10 w-10 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 mb-1">{view}</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Upload Photo
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 flex justify-end">
            <Button onClick={saveInspection} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg transition-all duration-300">
              <CheckCircle className="mr-2 h-4 w-4" />
              Save Inspection
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Damage Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedArea?.name || 'Vehicle Area'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Damage Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={!selectedArea?.damageType ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => selectedArea && handleDamageUpdate(null, selectedArea.notes || "")}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  No Damage
                </Button>
                
                {damageTypes.map(type => (
                  <Button
                    key={type.id}
                    type="button"
                    variant={selectedArea?.damageType === type.id ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => selectedArea && handleDamageUpdate(type.id, selectedArea.notes || "")}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea 
                placeholder="Add details about the condition..." 
                value={selectedArea?.notes || ""}
                onChange={(e) => {
                  if (selectedArea) {
                    handleDamageUpdate(
                      selectedArea.damageType, 
                      e.target.value
                    );
                  }
                }}
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
