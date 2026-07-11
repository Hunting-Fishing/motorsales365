import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Fuel, Save, Loader2 } from 'lucide-react';
import { useUpdateFuelDeliveryTruck, FuelDeliveryTruck } from '@/hooks/useFuelDelivery';
import { useTruckCompartments, TruckCompartment } from '@/hooks/useTruckCompartments';
import { useFuelProducts } from '@/hooks/useFuelProducts';
import { useFuelUnits } from '@/hooks/fuel-delivery/useFuelUnits';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface TruckEditDialogProps {
  truck: FuelDeliveryTruck | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CompartmentFormData {
  id?: string;
  compartment_number: number;
  compartment_name: string;
  capacity_gallons: string;
  current_level_gallons: string;
  product_id: string;
  material: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

export function TruckEditDialog({ truck, open, onOpenChange }: TruckEditDialogProps) {
  const updateTruck = useUpdateFuelDeliveryTruck();
  const { data: compartments = [], isLoading: loadingCompartments } = useTruckCompartments(truck?.id);
  const { data: products = [] } = useFuelProducts();
  const { getVolumeLabel, convertToGallons, convertFromGallons } = useFuelUnits();
  const queryClient = useQueryClient();
  
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    truck_number: '',
    license_plate: '',
    vin: '',
    make: '',
    model: '',
    year: '',
    tank_capacity_gallons: '',
    meter_number: '',
    insurance_expiry: '',
    registration_expiry: '',
    dot_inspection_due: '',
    status: 'available',
    notes: ''
  });
  
  const [compartmentForms, setCompartmentForms] = useState<CompartmentFormData[]>([]);

  // Initialize form when truck changes
  useEffect(() => {
    if (truck) {
      setFormData({
        truck_number: truck.truck_number || '',
        license_plate: truck.license_plate || '',
        vin: truck.vin || '',
        make: truck.make || '',
        model: truck.model || '',
        year: truck.year?.toString() || '',
        tank_capacity_gallons: truck.tank_capacity_gallons?.toString() || '',
        meter_number: truck.meter_number || '',
        insurance_expiry: truck.insurance_expiry || '',
        registration_expiry: truck.registration_expiry || '',
        dot_inspection_due: truck.dot_inspection_due || '',
        status: truck.status || 'available',
        notes: truck.notes || ''
      });
    }
  }, [truck]);

  // Initialize compartments when loaded - convert from gallons to display unit
  useEffect(() => {
    if (compartments.length > 0) {
      setCompartmentForms(compartments.map(c => ({
        id: c.id,
        compartment_number: c.compartment_number,
        compartment_name: c.compartment_name || '',
        // Convert from gallons (DB) to display unit
        capacity_gallons: convertFromGallons(c.capacity_gallons).toFixed(0),
        current_level_gallons: convertFromGallons(c.current_level_gallons).toFixed(0),
        product_id: c.product_id || '',
        material: c.material || 'steel',
        isNew: false,
        isDeleted: false
      })));
    } else if (truck && compartments.length === 0 && !loadingCompartments) {
      // No compartments yet - start with empty
      setCompartmentForms([]);
    }
  }, [compartments, truck, loadingCompartments, convertFromGallons]);

  const addCompartment = () => {
    const nextNumber = compartmentForms.filter(c => !c.isDeleted).length + 1;
    setCompartmentForms([...compartmentForms, {
      compartment_number: nextNumber,
      compartment_name: `Tank ${nextNumber}`,
      capacity_gallons: '',
      current_level_gallons: '0',
      product_id: '',
      material: 'steel',
      isNew: true,
      isDeleted: false
    }]);
  };

  const removeCompartment = (index: number) => {
    const updated = [...compartmentForms];
    if (updated[index].isNew) {
      // Just remove new ones
      updated.splice(index, 1);
    } else {
      // Mark existing ones as deleted
      updated[index].isDeleted = true;
    }
    setCompartmentForms(updated);
  };

  const updateCompartment = (index: number, field: keyof CompartmentFormData, value: string | number) => {
    const updated = [...compartmentForms];
    (updated[index] as any)[field] = value;
    setCompartmentForms(updated);
  };

  const handleSave = async () => {
    if (!truck) return;
    setSaving(true);

    try {
      // Update truck details
      await updateTruck.mutateAsync({
        id: truck.id,
        truck_number: formData.truck_number,
        license_plate: formData.license_plate || null,
        vin: formData.vin || null,
        make: formData.make || null,
        model: formData.model || null,
        year: formData.year ? parseInt(formData.year) : null,
        tank_capacity_gallons: formData.tank_capacity_gallons ? parseFloat(formData.tank_capacity_gallons) : null,
        meter_number: formData.meter_number || null,
        insurance_expiry: formData.insurance_expiry || null,
        registration_expiry: formData.registration_expiry || null,
        dot_inspection_due: formData.dot_inspection_due || null,
        status: formData.status,
        notes: formData.notes || null,
        compartments: compartmentForms.filter(c => !c.isDeleted).length
      });

      // Handle compartment changes
      const { data: profile } = await supabase.from('profiles').select('shop_id').single();
      const shopId = profile?.shop_id;

      // Delete removed compartments
      const toDelete = compartmentForms.filter(c => c.isDeleted && c.id);
      for (const comp of toDelete) {
        await supabase.from('fuel_delivery_truck_compartments').delete().eq('id', comp.id);
      }

      // Get original compartments for history tracking
      const originalCompartmentsMap = new Map(compartments.map(c => [c.id, c]));

      // Update existing compartments - convert display units to gallons for storage
      const toUpdate = compartmentForms.filter(c => !c.isNew && !c.isDeleted && c.id);
      for (const comp of toUpdate) {
        const originalComp = originalCompartmentsMap.get(comp.id!);
        // Convert from display unit to gallons for storage
        const newLevelInGallons = convertToGallons(parseFloat(comp.current_level_gallons) || 0);
        const capacityInGallons = convertToGallons(parseFloat(comp.capacity_gallons) || 0);
        const previousLevel = originalComp?.current_level_gallons || 0;
        
        await supabase
          .from('fuel_delivery_truck_compartments')
          .update({
            compartment_number: comp.compartment_number,
            compartment_name: comp.compartment_name || null,
            capacity_gallons: capacityInGallons,
            current_level_gallons: newLevelInGallons,
            product_id: comp.product_id || null,
            material: comp.material || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', comp.id);
        
        // Log history if level changed (comparing in gallons)
        if (Math.abs(newLevelInGallons - previousLevel) > 0.1 && comp.id) {
          await supabase.from('fuel_delivery_compartment_history').insert({
            shop_id: shopId,
            compartment_id: comp.id,
            truck_id: truck.id,
            previous_level_gallons: previousLevel,
            new_level_gallons: newLevelInGallons,
            change_amount_gallons: newLevelInGallons - previousLevel,
            change_type: 'manual',
            reference_type: 'manual_adjustment',
            notes: `Manual level adjustment via truck edit`
          });
        }
      }

      // Insert new compartments - convert display units to gallons for storage
      const toInsert = compartmentForms.filter(c => c.isNew && !c.isDeleted);
      for (const comp of toInsert) {
        const capacityInGallons = convertToGallons(parseFloat(comp.capacity_gallons) || 0);
        const currentLevelInGallons = convertToGallons(parseFloat(comp.current_level_gallons) || 0);
        
        const { data: insertedComp } = await supabase.from('fuel_delivery_truck_compartments').insert({
          shop_id: shopId,
          truck_id: truck.id,
          compartment_number: comp.compartment_number,
          compartment_name: comp.compartment_name || null,
          capacity_gallons: capacityInGallons,
          current_level_gallons: currentLevelInGallons,
          product_id: comp.product_id || null,
          material: comp.material || null
        }).select().single();
        
        // Log history for new compartment if it has initial level
        if (currentLevelInGallons > 0 && insertedComp) {
          await supabase.from('fuel_delivery_compartment_history').insert({
            shop_id: shopId,
            compartment_id: insertedComp.id,
            truck_id: truck.id,
            previous_level_gallons: 0,
            new_level_gallons: currentLevelInGallons,
            change_amount_gallons: currentLevelInGallons,
            change_type: 'manual',
            reference_type: 'manual_adjustment',
            notes: `Initial level set when compartment created`
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['truck-compartments', truck.id] });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-trucks'] });
      toast.success('Truck updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving truck:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const activeCompartments = compartmentForms.filter(c => !c.isDeleted);
  const totalCapacity = activeCompartments.reduce((sum, c) => sum + (parseFloat(c.capacity_gallons) || 0), 0);

  if (!truck) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Truck: {truck.truck_number}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Truck Details</TabsTrigger>
            <TabsTrigger value="tanks">
              Tanks/Compartments
              <Badge variant="secondary" className="ml-2">{activeCompartments.length}</Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Truck Number *</Label>
                <Input
                  value={formData.truck_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, truck_number: e.target.value }))}
                  placeholder="TRK-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>License Plate</Label>
                <Input
                  value={formData.license_plate}
                  onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value }))}
                  placeholder="ABC-1234"
                />
              </div>
              <div className="space-y-2">
                <Label>VIN</Label>
                <Input
                  value={formData.vin}
                  onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value }))}
                  placeholder="1HGCM82633A123456"
                />
              </div>
              <div className="space-y-2">
                <Label>Make</Label>
                <Input
                  value={formData.make}
                  onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
                  placeholder="Peterbilt"
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="579"
                />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="2023"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Tank Capacity ({getVolumeLabel()})</Label>
                <Input
                  type="number"
                  value={formData.tank_capacity_gallons}
                  onChange={(e) => setFormData(prev => ({ ...prev, tank_capacity_gallons: e.target.value }))}
                  placeholder="3000"
                />
                {totalCapacity > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Sum from compartments: {totalCapacity.toLocaleString()} {getVolumeLabel()}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Meter Number</Label>
                <Input
                  value={formData.meter_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, meter_number: e.target.value }))}
                  placeholder="MTR-12345"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_use">In Use</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="out_of_service">Out of Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Insurance Expiry</Label>
                <Input
                  type="date"
                  value={formData.insurance_expiry}
                  onChange={(e) => setFormData(prev => ({ ...prev, insurance_expiry: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Registration Expiry</Label>
                <Input
                  type="date"
                  value={formData.registration_expiry}
                  onChange={(e) => setFormData(prev => ({ ...prev, registration_expiry: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>DOT Inspection Due</Label>
                <Input
                  type="date"
                  value={formData.dot_inspection_due}
                  onChange={(e) => setFormData(prev => ({ ...prev, dot_inspection_due: e.target.value }))}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="tanks" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Tank Compartments</h3>
                <p className="text-sm text-muted-foreground">
                  Configure individual tank compartments and their fuel products
                </p>
              </div>
              <Button onClick={addCompartment} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Tank
              </Button>
            </div>
            
            {loadingCompartments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : activeCompartments.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <Fuel className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No tank compartments configured</p>
                  <Button variant="link" onClick={addCompartment}>
                    Add your first tank compartment
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {compartmentForms.map((comp, index) => {
                  if (comp.isDeleted) return null;
                  
                  const fillPercent = comp.capacity_gallons 
                    ? ((parseFloat(comp.current_level_gallons) || 0) / parseFloat(comp.capacity_gallons)) * 100 
                    : 0;
                  
                  return (
                    <Card key={comp.id || `new-${index}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Fuel className="h-4 w-4" />
                            Tank #{comp.compartment_number}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeCompartment(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tank Name</Label>
                            <Input
                              value={comp.compartment_name}
                              onChange={(e) => updateCompartment(index, 'compartment_name', e.target.value)}
                              placeholder="Tank 1"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Fuel Product</Label>
                            <Select 
                              value={comp.product_id || 'none'} 
                              onValueChange={(v) => updateCompartment(index, 'product_id', v === 'none' ? '' : v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No product assigned</SelectItem>
                                {products.map(p => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.product_name} ({p.product_code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Capacity ({getVolumeLabel()})</Label>
                            <Input
                              type="number"
                              value={comp.capacity_gallons}
                              onChange={(e) => updateCompartment(index, 'capacity_gallons', e.target.value)}
                              placeholder="1000"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Current Level ({getVolumeLabel()})</Label>
                            <Input
                              type="number"
                              value={comp.current_level_gallons}
                              onChange={(e) => updateCompartment(index, 'current_level_gallons', e.target.value)}
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Material</Label>
                            <Select 
                              value={comp.material} 
                              onValueChange={(v) => updateCompartment(index, 'material', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="steel">Steel</SelectItem>
                                <SelectItem value="aluminum">Aluminum</SelectItem>
                                <SelectItem value="fiberglass">Fiberglass</SelectItem>
                                <SelectItem value="stainless">Stainless Steel</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Fill Level</Label>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${Math.min(100, fillPercent)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-12 text-right">
                                {fillPercent.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            
            {activeCompartments.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Total Capacity:</span>
                  <span className="font-medium">{totalCapacity.toLocaleString()} {getVolumeLabel()}</span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
