import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

export interface FuelCompartment {
  number: number;
  product_type?: string;
  capacity?: number;
  material?: string;
  last_inspection?: string;
}

export interface FuelTruckData {
  // Chassis
  chassis_type?: string;
  gvwr?: number;
  unladen_weight?: number;
  max_payload?: number;
  
  // Tank System
  tank_manufacturer?: string;
  tank_serial_number?: string;
  tank_material?: string;
  total_capacity?: number;
  num_compartments?: number;
  compartments?: FuelCompartment[];
  last_tank_inspection?: string;
  
  // Fuel Delivery System
  num_hose_reels?: number;
  hose_length?: number;
  pump_type?: string;
  flow_rate_gpm?: number;
  meter_type?: string;
  meter_model?: string;
  filter_type?: string;
}

interface FuelTruckSpecsProps {
  data: FuelTruckData;
  onChange: (data: FuelTruckData) => void;
}

const PRODUCT_TYPES = ['Diesel', 'Unleaded', 'Premium', 'DEF', 'Kerosene', 'Aviation Fuel', 'Other'];
const MATERIALS = ['Aluminum', 'Steel', 'Stainless Steel'];
const PUMP_TYPES = ['PTO', 'Electric', 'Hydraulic', 'Pneumatic'];

export function FuelTruckSpecs({ data, onChange }: FuelTruckSpecsProps) {
  const compartments = data.compartments || [];
  
  const updateField = (field: keyof FuelTruckData, value: any) => {
    onChange({ ...data, [field]: value });
  };
  
  const addCompartment = () => {
    const newCompartments = [
      ...compartments,
      {
        number: compartments.length + 1,
        product_type: undefined,
        capacity: undefined,
        material: undefined
      }
    ];
    onChange({ ...data, compartments: newCompartments });
  };
  
  const removeCompartment = (index: number) => {
    const newCompartments = compartments.filter((_, i) => i !== index);
    // Renumber compartments
    const renumbered = newCompartments.map((comp, i) => ({ ...comp, number: i + 1 }));
    onChange({ ...data, compartments: renumbered });
  };
  
  const updateCompartment = (index: number, field: keyof FuelCompartment, value: any) => {
    const newCompartments = [...compartments];
    newCompartments[index] = { ...newCompartments[index], [field]: value };
    onChange({ ...data, compartments: newCompartments });
  };
  
  // Calculate total capacity from compartments
  const calculatedTotalCapacity = compartments.reduce((sum, comp) => sum + (comp.capacity || 0), 0);
  
  return (
    <div className="space-y-6">
      {/* Weight & Chassis Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weight & Chassis Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Chassis Type</Label>
            <Input
              value={data.chassis_type || ''}
              onChange={(e) => updateField('chassis_type', e.target.value)}
              placeholder="e.g., Semi Truck, Single Unit"
            />
          </div>
          
          <div className="space-y-2">
            <Label>GVWR (lbs)</Label>
            <Input
              type="number"
              value={data.gvwr || ''}
              onChange={(e) => updateField('gvwr', parseInt(e.target.value) || undefined)}
              placeholder="Enter GVWR"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Unladen Weight (lbs)</Label>
            <Input
              type="number"
              value={data.unladen_weight || ''}
              onChange={(e) => updateField('unladen_weight', parseInt(e.target.value) || undefined)}
              placeholder="Enter weight"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Max Payload (lbs)</Label>
            <Input
              type="number"
              value={data.max_payload || ''}
              onChange={(e) => updateField('max_payload', parseInt(e.target.value) || undefined)}
              placeholder="Enter payload"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tank System */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tank System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tank Manufacturer</Label>
              <Input
                value={data.tank_manufacturer || ''}
                onChange={(e) => updateField('tank_manufacturer', e.target.value)}
                placeholder="e.g., Heil, Polar"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tank Serial Number</Label>
              <Input
                value={data.tank_serial_number || ''}
                onChange={(e) => updateField('tank_serial_number', e.target.value)}
                placeholder="HT-12345"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Last Tank Inspection</Label>
              <Input
                type="date"
                value={data.last_tank_inspection || ''}
                onChange={(e) => updateField('last_tank_inspection', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Total Capacity (gallons)</Label>
              <Input
                type="number"
                value={calculatedTotalCapacity}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Auto-calculated from compartments</p>
            </div>
          </div>

          {/* Compartments */}
          <div className="space-y-3 mt-6">
            <div className="flex items-center justify-between">
              <Label className="text-base">Tank Compartments</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCompartment}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Compartment
              </Button>
            </div>
            
            <div className="space-y-3">
              {compartments.map((compartment, index) => (
                <Card key={index} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold">Compartment #{compartment.number}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCompartment(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Product Type</Label>
                  <Select
                    value={compartment.product_type && compartment.product_type !== '' ? compartment.product_type : undefined}
                    onValueChange={(value) => updateCompartment(index, 'product_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product type" />
                    </SelectTrigger>
                          <SelectContent>
                            {PRODUCT_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Capacity (gallons)</Label>
                        <Input
                          type="number"
                          value={compartment.capacity !== undefined ? compartment.capacity : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateCompartment(index, 'capacity', val === '' ? undefined : parseInt(val) || undefined);
                          }}
                          placeholder=""
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Material</Label>
                  <Select
                    value={compartment.material && compartment.material !== '' ? compartment.material : undefined}
                    onValueChange={(value) => updateCompartment(index, 'material', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                          <SelectContent>
                            {MATERIALS.map((material) => (
                              <SelectItem key={material} value={material}>
                                {material}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {compartments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No compartments added yet.</p>
                  <p className="text-sm">Click "Add Compartment" to begin.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fuel Delivery System */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fuel Delivery System</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Number of Hose Reels</Label>
            <Input
              type="number"
              value={data.num_hose_reels || ''}
              onChange={(e) => updateField('num_hose_reels', parseInt(e.target.value) || undefined)}
              placeholder=""
            />
          </div>
          
          <div className="space-y-2">
            <Label>Hose Length (ft)</Label>
            <Input
              type="number"
              value={data.hose_length || ''}
              onChange={(e) => updateField('hose_length', parseInt(e.target.value) || undefined)}
              placeholder=""
            />
          </div>
          
          <div className="space-y-2">
            <Label>Pump Type</Label>
            <Select
              value={data.pump_type || undefined}
              onValueChange={(value) => updateField('pump_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pump type" />
              </SelectTrigger>
              <SelectContent>
                {PUMP_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Flow Rate (GPM)</Label>
            <Input
              type="number"
              value={data.flow_rate_gpm || ''}
              onChange={(e) => updateField('flow_rate_gpm', parseInt(e.target.value) || undefined)}
              placeholder=""
            />
          </div>
          
          <div className="space-y-2">
            <Label>Meter Type</Label>
            <Input
              value={data.meter_type || ''}
              onChange={(e) => updateField('meter_type', e.target.value)}
              placeholder="e.g., Electronic, Mechanical"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Meter Model</Label>
            <Input
              value={data.meter_model || ''}
              onChange={(e) => updateField('meter_model', e.target.value)}
              placeholder="e.g., LC M15"
            />
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <Label>Filter Type</Label>
            <Input
              value={data.filter_type || ''}
              onChange={(e) => updateField('filter_type', e.target.value)}
              placeholder="e.g., 10 Micron Spin-On"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
