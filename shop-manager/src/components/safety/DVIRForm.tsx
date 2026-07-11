import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useDVIR, CreateDVIRData } from '@/hooks/useDVIR';
import { supabase } from '@/integrations/supabase/client';
import { Truck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { DVIRInspectionType } from '@/types/safety';

const INSPECTION_ITEMS = [
  { key: 'brakes', label: 'Brakes', description: 'Service and parking brakes' },
  { key: 'lights', label: 'Lights', description: 'Headlights, taillights, turn signals' },
  { key: 'tires', label: 'Tires', description: 'Condition, pressure, tread depth' },
  { key: 'mirrors', label: 'Mirrors', description: 'All mirrors clean and adjusted' },
  { key: 'horn', label: 'Horn', description: 'Working properly' },
  { key: 'windshield', label: 'Windshield', description: 'Clean, no cracks' },
  { key: 'wipers', label: 'Wipers', description: 'Working, blades in good condition' },
  { key: 'steering', label: 'Steering', description: 'No excessive play' },
  { key: 'emergency_equipment', label: 'Emergency Equipment', description: 'Fire extinguisher, triangles' },
  { key: 'fluid_levels', label: 'Fluid Levels', description: 'Oil, coolant, brake fluid' },
  { key: 'exhaust', label: 'Exhaust', description: 'No leaks, secure mounting' },
];

interface Vehicle {
  id: string;
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
}

export function DVIRForm() {
  const navigate = useNavigate();
  const { createDVIR } = useDVIR();
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  const [formData, setFormData] = useState({
    vehicle_id: '',
    inspection_type: 'pre_trip' as DVIRInspectionType,
    odometer_reading: '',
    driver_name: '',
    brakes_ok: true,
    lights_ok: true,
    tires_ok: true,
    mirrors_ok: true,
    horn_ok: true,
    windshield_ok: true,
    wipers_ok: true,
    steering_ok: true,
    emergency_equipment_ok: true,
    fluid_levels_ok: true,
    exhaust_ok: true,
    defects_description: '',
    vehicle_safe_to_operate: true,
    mechanic_review_required: false
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('id, make, model, year, license_plate')
      .order('make');
    setVehicles(data || []);
  };

  const handleCheckboxChange = (key: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [key]: checked }));
  };

  const hasDefects = () => {
    return !formData.brakes_ok || !formData.lights_ok || !formData.tires_ok || 
           !formData.mirrors_ok || !formData.horn_ok || !formData.windshield_ok ||
           !formData.wipers_ok || !formData.steering_ok || !formData.emergency_equipment_ok ||
           !formData.fluid_levels_ok || !formData.exhaust_ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const now = new Date();
    const dvirData: CreateDVIRData = {
      vehicle_id: formData.vehicle_id,
      inspection_type: formData.inspection_type,
      inspection_date: now.toISOString().split('T')[0],
      inspection_time: now.toTimeString().split(' ')[0],
      odometer_reading: formData.odometer_reading ? parseInt(formData.odometer_reading) : undefined,
      driver_name: formData.driver_name,
      brakes_ok: formData.brakes_ok,
      lights_ok: formData.lights_ok,
      tires_ok: formData.tires_ok,
      mirrors_ok: formData.mirrors_ok,
      horn_ok: formData.horn_ok,
      windshield_ok: formData.windshield_ok,
      wipers_ok: formData.wipers_ok,
      steering_ok: formData.steering_ok,
      emergency_equipment_ok: formData.emergency_equipment_ok,
      fluid_levels_ok: formData.fluid_levels_ok,
      exhaust_ok: formData.exhaust_ok,
      defects_found: hasDefects(),
      defects_description: formData.defects_description || undefined,
      vehicle_safe_to_operate: formData.vehicle_safe_to_operate,
      mechanic_review_required: formData.mechanic_review_required,
      driver_signature: formData.driver_name // Simplified signature
    };
    
    const result = await createDVIR(dvirData);
    setSubmitting(false);
    
    if (result) {
      navigate('/safety/dvir');
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === formData.vehicle_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Vehicle Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Vehicle Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Vehicle *</Label>
              <Select
                value={formData.vehicle_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.license_plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Inspection Type *</Label>
              <Select
                value={formData.inspection_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, inspection_type: value as DVIRInspectionType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_trip">Pre-Trip</SelectItem>
                  <SelectItem value="post_trip">Post-Trip</SelectItem>
                  <SelectItem value="roadside">Roadside</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="driver_name">Driver Name *</Label>
              <Input
                id="driver_name"
                value={formData.driver_name}
                onChange={(e) => setFormData(prev => ({ ...prev, driver_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="odometer">Odometer Reading</Label>
              <Input
                id="odometer"
                type="number"
                value={formData.odometer_reading}
                onChange={(e) => setFormData(prev => ({ ...prev, odometer_reading: e.target.value }))}
                placeholder="Miles"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspection Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Checklist</CardTitle>
          <CardDescription>Verify all items are satisfactory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {INSPECTION_ITEMS.map((item) => {
              const key = `${item.key}_ok` as keyof typeof formData;
              const isOk = formData[key] as boolean;
              
              return (
                <div 
                  key={item.key} 
                  className={`flex items-start space-x-3 p-3 rounded-lg border ${!isOk ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : ''}`}
                >
                  <Checkbox
                    id={item.key}
                    checked={isOk}
                    onCheckedChange={(checked) => handleCheckboxChange(`${item.key}_ok`, checked === true)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={item.key} className="font-medium cursor-pointer">
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  {isOk ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Defects */}
      {hasDefects() && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              Defects Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Defect Description *</Label>
              <Textarea
                placeholder="Describe all defects in detail..."
                value={formData.defects_description}
                onChange={(e) => setFormData(prev => ({ ...prev, defects_description: e.target.value }))}
                required={hasDefects()}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Safety Determination */}
      <Card>
        <CardHeader>
          <CardTitle>Safety Determination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label className="text-base">Vehicle Safe to Operate</Label>
              <p className="text-sm text-muted-foreground">Can this vehicle be safely operated?</p>
            </div>
            <Switch
              checked={formData.vehicle_safe_to_operate}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, vehicle_safe_to_operate: checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label className="text-base">Mechanic Review Required</Label>
              <p className="text-sm text-muted-foreground">Does a mechanic need to review this vehicle?</p>
            </div>
            <Switch
              checked={formData.mechanic_review_required}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, mechanic_review_required: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-medium">Status:</span>
            <Badge
              variant={formData.vehicle_safe_to_operate ? 'default' : 'destructive'}
            >
              {formData.vehicle_safe_to_operate ? 'Safe to Operate' : 'Not Safe'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => navigate('/safety/dvir')}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={submitting || !formData.vehicle_id || !formData.driver_name || (hasDefects() && !formData.defects_description)}
        >
          {submitting ? 'Submitting...' : 'Submit DVIR'}
        </Button>
      </div>
    </form>
  );
}
