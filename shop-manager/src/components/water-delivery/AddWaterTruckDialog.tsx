import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Loader2, Truck, Droplets, Shield, Gauge } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useCreateWaterDeliveryTruck } from '@/hooks/water-delivery/useWaterDeliveryTrucks';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';

interface AddWaterTruckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TANK_MATERIALS = [
  { value: 'stainless_steel', label: 'Stainless Steel' },
  { value: 'aluminum', label: 'Aluminum' },
  { value: 'fiberglass', label: 'Fiberglass' },
  { value: 'food_grade_plastic', label: 'Food-Grade Plastic' },
  { value: 'carbon_steel', label: 'Carbon Steel' },
  { value: 'poly', label: 'Polyethylene' },
];

const TRUCK_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'in_use', label: 'In Use' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'out_of_service', label: 'Out of Service' },
];

export function AddWaterTruckDialog({ open, onOpenChange }: AddWaterTruckDialogProps) {
  const { shopId } = useShopId();
  const createTruck = useCreateWaterDeliveryTruck();
  const { getVolumeLabel, convertToGallons } = useWaterUnits();
  
  const [activeTab, setActiveTab] = useState('vehicle');
  const [formData, setFormData] = useState({
    // Vehicle Info
    truck_number: '',
    license_plate: '',
    vin: '',
    make: '',
    model: '',
    year: '',
    current_odometer: '',
    status: 'available',
    notes: '',
    // Tank Specifications
    tank_capacity_gallons: '',
    tank_material: 'stainless_steel',
    compartments: '1',
    is_potable_certified: true,
    // Compliance
    insurance_expiry: '',
    registration_expiry: '',
    dot_inspection_due: '',
    nfs_certification_expiry: '',
    last_sanitized_date: '',
    next_sanitization_due: '',
    // Calibration
    meter_number: '',
    last_calibration_date: '',
    next_calibration_due: '',
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!shopId || !formData.truck_number) return;

    const capacityInGallons = formData.tank_capacity_gallons 
      ? convertToGallons(parseFloat(formData.tank_capacity_gallons)) 
      : null;

    await createTruck.mutateAsync({
      shop_id: shopId,
      truck_number: formData.truck_number,
      license_plate: formData.license_plate || null,
      vin: formData.vin || null,
      make: formData.make || null,
      model: formData.model || null,
      year: formData.year ? parseInt(formData.year) : null,
      current_odometer: formData.current_odometer ? parseFloat(formData.current_odometer) : null,
      status: formData.status,
      notes: formData.notes || null,
      tank_capacity_gallons: capacityInGallons,
      tank_material: formData.tank_material || null,
      compartments: formData.compartments ? parseInt(formData.compartments) : 1,
      is_potable_certified: formData.is_potable_certified,
      insurance_expiry: formData.insurance_expiry || null,
      registration_expiry: formData.registration_expiry || null,
      dot_inspection_due: formData.dot_inspection_due || null,
      nfs_certification_expiry: formData.nfs_certification_expiry || null,
      last_sanitized_date: formData.last_sanitized_date || null,
      next_sanitization_due: formData.next_sanitization_due || null,
      meter_number: formData.meter_number || null,
      last_calibration_date: formData.last_calibration_date || null,
      next_calibration_due: formData.next_calibration_due || null,
      is_active: true,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      truck_number: '',
      license_plate: '',
      vin: '',
      make: '',
      model: '',
      year: '',
      current_odometer: '',
      status: 'available',
      notes: '',
      tank_capacity_gallons: '',
      tank_material: 'stainless_steel',
      compartments: '1',
      is_potable_certified: true,
      insurance_expiry: '',
      registration_expiry: '',
      dot_inspection_due: '',
      nfs_certification_expiry: '',
      last_sanitized_date: '',
      next_sanitization_due: '',
      meter_number: '',
      last_calibration_date: '',
      next_calibration_due: '',
    });
    setActiveTab('vehicle');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-cyan-600" />
            Add Water Tanker Truck
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="vehicle" className="flex items-center gap-1 text-xs">
              <Truck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Vehicle</span>
            </TabsTrigger>
            <TabsTrigger value="tank" className="flex items-center gap-1 text-xs">
              <Droplets className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tank</span>
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-1 text-xs">
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Compliance</span>
            </TabsTrigger>
            <TabsTrigger value="calibration" className="flex items-center gap-1 text-xs">
              <Gauge className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Meter</span>
            </TabsTrigger>
          </TabsList>

          {/* Vehicle Information Tab */}
          <TabsContent value="vehicle" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Truck Number *</Label>
                <Input
                  value={formData.truck_number}
                  onChange={(e) => handleChange('truck_number', e.target.value)}
                  placeholder="WT-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRUCK_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>License Plate</Label>
                <Input
                  value={formData.license_plate}
                  onChange={(e) => handleChange('license_plate', e.target.value)}
                  placeholder="ABC-1234"
                />
              </div>
              <div className="space-y-2">
                <Label>VIN</Label>
                <Input
                  value={formData.vin}
                  onChange={(e) => handleChange('vin', e.target.value)}
                  placeholder="1HGCM82633A123456"
                />
              </div>
              <div className="space-y-2">
                <Label>Make</Label>
                <Input
                  value={formData.make}
                  onChange={(e) => handleChange('make', e.target.value)}
                  placeholder="Freightliner"
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  placeholder="M2 106"
                />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => handleChange('year', e.target.value)}
                  placeholder="2024"
                />
              </div>
              <div className="space-y-2">
                <Label>Current Odometer</Label>
                <Input
                  type="number"
                  value={formData.current_odometer}
                  onChange={(e) => handleChange('current_odometer', e.target.value)}
                  placeholder="15000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about this truck..."
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Tank Specifications Tab */}
          <TabsContent value="tank" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tank Capacity ({getVolumeLabel()})</Label>
                <Input
                  type="number"
                  value={formData.tank_capacity_gallons}
                  onChange={(e) => handleChange('tank_capacity_gallons', e.target.value)}
                  placeholder="3000"
                />
              </div>
              <div className="space-y-2">
                <Label>Tank Material</Label>
                <Select value={formData.tank_material} onValueChange={(v) => handleChange('tank_material', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TANK_MATERIALS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Number of Compartments</Label>
                <Input
                  type="number"
                  value={formData.compartments}
                  onChange={(e) => handleChange('compartments', e.target.value)}
                  placeholder="1"
                  min="1"
                  max="10"
                />
              </div>
              <div className="space-y-2 flex items-end">
                <div className="flex items-center gap-3 pb-2">
                  <Switch
                    checked={formData.is_potable_certified}
                    onCheckedChange={(v) => handleChange('is_potable_certified', v)}
                    id="potable"
                  />
                  <Label htmlFor="potable" className="cursor-pointer">
                    Potable Water Certified
                  </Label>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 p-4">
              <div className="flex items-start gap-3">
                <Droplets className="h-5 w-5 text-cyan-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-cyan-900 dark:text-cyan-100">Tank Certification</p>
                  <p className="text-cyan-700 dark:text-cyan-300 mt-1">
                    Potable water trucks require NSF certification and regular sanitization schedules. 
                    Configure these in the Compliance tab.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Compliance & Certifications Tab */}
          <TabsContent value="compliance" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Insurance Expiry</Label>
                <Input
                  type="date"
                  value={formData.insurance_expiry}
                  onChange={(e) => handleChange('insurance_expiry', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Registration Expiry</Label>
                <Input
                  type="date"
                  value={formData.registration_expiry}
                  onChange={(e) => handleChange('registration_expiry', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>DOT Inspection Due</Label>
                <Input
                  type="date"
                  value={formData.dot_inspection_due}
                  onChange={(e) => handleChange('dot_inspection_due', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>NSF Certification Expiry</Label>
                <Input
                  type="date"
                  value={formData.nfs_certification_expiry}
                  onChange={(e) => handleChange('nfs_certification_expiry', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Sanitized Date</Label>
                <Input
                  type="date"
                  value={formData.last_sanitized_date}
                  onChange={(e) => handleChange('last_sanitized_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Next Sanitization Due</Label>
                <Input
                  type="date"
                  value={formData.next_sanitization_due}
                  onChange={(e) => handleChange('next_sanitization_due', e.target.value)}
                />
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-100">Compliance Tracking</p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    Set expiry dates to receive alerts before items expire. 
                    Yellow alerts appear 30 days before expiry, red when expired.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Calibration Tab */}
          <TabsContent value="calibration" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meter Number</Label>
                <Input
                  value={formData.meter_number}
                  onChange={(e) => handleChange('meter_number', e.target.value)}
                  placeholder="MTR-12345"
                />
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Last Calibration Date</Label>
                  <Input
                    type="date"
                    value={formData.last_calibration_date}
                    onChange={(e) => handleChange('last_calibration_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Next Calibration Due</Label>
                  <Input
                    type="date"
                    value={formData.next_calibration_due}
                    onChange={(e) => handleChange('next_calibration_due', e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
              <div className="flex items-start gap-3">
                <Gauge className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">Meter Calibration</p>
                  <p className="text-blue-700 dark:text-blue-300 mt-1">
                    Regular meter calibration ensures accurate delivery measurements for billing. 
                    Most jurisdictions require annual calibration.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.truck_number || createTruck.isPending}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {createTruck.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Truck
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
