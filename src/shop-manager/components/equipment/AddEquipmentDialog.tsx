import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { decodeVin, getVinValidationError } from '@/services/vinDecoderService';
import { uploadEquipmentProfileImage } from '@/services/equipment/equipmentImageService';
import { EquipmentImageUpload } from './EquipmentImageUpload';
import { EquipmentCategorySelector } from './EquipmentCategorySelector';
import { getAssetClassForType } from '@/types/equipmentCategory';
import { Loader2, Search, Car, CheckCircle2 } from 'lucide-react';

interface AddEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Equipment types that support VIN decoding
const VIN_SUPPORTED_TYPES = [
  'forklift', 'excavator', 'loader', 'dozer', 'crane', 'heavy_truck', 
  'semi', 'fleet_vehicle', 'courtesy_car', 'rental_vehicle', 'service_vehicle',
  'flat_deck', 'fuel_truck', 'roll_on_roll_off', 'transport', 'skid_steer'
];

export function AddEquipmentDialog({ open, onOpenChange }: AddEquipmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    manufacturer: '',
    serial_number: '',
    equipment_type: '',
    unit_number: '',
    location: '',
    purchase_date: '',
    purchase_price: '',
    warranty_expiry: '',
    maintenance_interval_days: '',
    notes: '',
    // Vehicle-specific fields
    vin_number: '',
    year: '',
    engine: '',
    fuel_type: '',
    transmission: '',
    drive_type: '',
    gvwr: '',
    plate_number: '',
    registration_state: '',
    registration_expiry: ''
  });

  const isVehicleType = VIN_SUPPORTED_TYPES.includes(formData.equipment_type);

  const handleVinDecode = async () => {
    const vin = formData.vin_number.trim().toUpperCase();
    
    // Validate VIN
    const validationError = getVinValidationError(vin);
    if (validationError) {
      toast({
        title: "Invalid VIN",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsDecoding(true);
    try {
      const result = await decodeVin(vin);
      
      if (result) {
        setFormData(prev => ({
          ...prev,
          vin_number: vin,
          year: result.year?.toString() || prev.year,
          manufacturer: result.make || prev.manufacturer,
          model: result.model || prev.model,
          engine: result.engine || prev.engine,
          fuel_type: result.fuel_type || prev.fuel_type,
          transmission: result.transmission || result.transmission_type || prev.transmission,
          drive_type: result.drive_type || prev.drive_type,
          gvwr: result.gvwr || prev.gvwr,
          // Auto-generate name if empty
          name: prev.name || `${result.year || ''} ${result.make || ''} ${result.model || ''}`.trim()
        }));
        
        setVinDecoded(true);
        toast({
          title: "VIN Decoded",
          description: `Found: ${result.year} ${result.make} ${result.model}`,
        });
      }
    } catch (error) {
      console.error('VIN decode error:', error);
      toast({
        title: "Decode Failed",
        description: error instanceof Error ? error.message : "Unable to decode VIN",
        variant: "destructive",
      });
    } finally {
      setIsDecoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.equipment_type) {
      toast({
        title: "Validation Error",
        description: "Equipment Name and Type are required fields.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(`Authentication error: ${userError.message}`);
      if (!userData.user) throw new Error('You must be logged in to add equipment');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profileError) throw new Error(`Failed to fetch user profile: ${profileError.message}`);
      if (!profile?.shop_id) throw new Error('No shop associated with your account.');

      const assetNumber = `AST-${Date.now()}`;
      
      // Upload profile image if selected
      let profileImageUrl: string | null = null;
      if (profileImage) {
        try {
          profileImageUrl = await uploadEquipmentProfileImage(profileImage, assetNumber);
        } catch (imgError) {
          console.error('Image upload error:', imgError);
          // Continue without image - don't block equipment creation
        }
      }
      
      // Determine asset_class based on equipment type
      const assetClass = getAssetClassForType(formData.equipment_type);
      
      const equipmentData = {
        shop_id: profile.shop_id,
        equipment_type: formData.equipment_type as any,
        category_id: categoryId || null,
        asset_class: assetClass,
        asset_number: assetNumber,
        unit_number: formData.unit_number || null,
        name: formData.name,
        manufacturer: formData.manufacturer || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        year: formData.year ? parseInt(formData.year) : null,
        location: formData.location || null,
        purchase_date: formData.purchase_date || null,
        purchase_cost: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        status: 'operational' as any,
        current_hours: 0,
        current_mileage: 0,
        maintenance_intervals: [],
        notes: formData.notes || null,
        created_by: userData.user.id,
        profile_image_url: profileImageUrl,
        // Vehicle-specific fields
        vin_number: formData.vin_number || null,
        plate_number: formData.plate_number || null,
        registration_state: formData.registration_state || null,
        registration_expiry: formData.registration_expiry || null,
        // Store additional vehicle specs in specifications JSONB
        specifications: isVehicleType ? {
          engine: formData.engine || null,
          fuel_type: formData.fuel_type || null,
          transmission: formData.transmission || null,
          drive_type: formData.drive_type || null,
          gvwr: formData.gvwr || null
        } : null
      };
      
      const { error: insertError } = await supabase
        .from('equipment_assets')
        .insert([equipmentData])
        .select();

      if (insertError) throw new Error(`Database error: ${insertError.message}`);

      toast({
        title: "Success!",
        description: `${formData.name} has been added to your equipment inventory.`,
      });

      // Reset form
      setFormData({
        name: '', model: '', manufacturer: '', serial_number: '', equipment_type: '',
        unit_number: '', location: '', purchase_date: '', purchase_price: '',
        warranty_expiry: '', maintenance_interval_days: '', notes: '',
        vin_number: '', year: '', engine: '', fuel_type: '', transmission: '',
        drive_type: '', gvwr: '', plate_number: '', registration_state: '', registration_expiry: ''
      });
      setVinDecoded(false);
      setProfileImage(null);
      setCategoryId('');
      setCategoryName('');
      onOpenChange(false);

    } catch (error) {
      console.error('Error adding equipment:', error);
      toast({
        title: "Failed to Add Equipment",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Equipment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Image Upload */}
          <div className="flex items-start gap-4 pb-2 border-b">
            <EquipmentImageUpload
              onImageSelect={setProfileImage}
              onImageRemove={() => setProfileImage(null)}
              isUploading={isSubmitting}
              size="lg"
            />
            <div className="flex-1 pt-2">
              <p className="text-sm font-medium">Equipment Photo</p>
              <p className="text-xs text-muted-foreground">
                Add a photo to easily identify this equipment. JPG, PNG or WebP, max 5MB.
              </p>
            </div>
          </div>

          {/* Category and Type Selection */}
          <EquipmentCategorySelector
            categoryId={categoryId}
            equipmentType={formData.equipment_type}
            onCategoryChange={(id, name) => {
              setCategoryId(id);
              setCategoryName(name);
            }}
            onTypeChange={(value) => {
              setFormData(prev => ({ ...prev, equipment_type: value }));
              setVinDecoded(false);
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="space-y-2">
              <Label htmlFor="name">Equipment Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={vinDecoded ? "Auto-filled from VIN" : "e.g., Shop Forklift #1"}
                required
              />
            </div>
          </div>

          {/* VIN Decoder Section - Show for vehicle types */}
          {isVehicleType && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                <span className="font-medium">VIN Decoder</span>
                {vinDecoded && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Decoded
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="vin_number"
                    value={formData.vin_number}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, vin_number: e.target.value.toUpperCase() }));
                      setVinDecoded(false);
                    }}
                    placeholder="Enter 17-character VIN"
                    maxLength={17}
                    className="font-mono uppercase"
                  />
                </div>
                <Button 
                  type="button" 
                  onClick={handleVinDecode}
                  disabled={isDecoding || formData.vin_number.length < 17}
                  variant="secondary"
                >
                  {isDecoding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-1" />
                      Decode
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Works with automotive, heavy trucks, forklifts, excavators, and most equipment with standard VINs
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Year field - show for vehicle types */}
            {isVehicleType && (
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 2}
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="e.g., 2023"
                  className={vinDecoded && formData.year ? "border-green-200 bg-green-50" : ""}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="manufacturer">{isVehicleType ? 'Make' : 'Manufacturer'}</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                placeholder={isVehicleType ? "e.g., Toyota, Caterpillar" : "e.g., Snap-on, Milwaukee"}
                className={vinDecoded && formData.manufacturer ? "border-green-200 bg-green-50" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                className={vinDecoded && formData.model ? "border-green-200 bg-green-50" : ""}
              />
            </div>

            {/* Engine field - show for vehicle types */}
            {isVehicleType && (
              <div className="space-y-2">
                <Label htmlFor="engine">Engine</Label>
                <Input
                  id="engine"
                  value={formData.engine}
                  onChange={(e) => setFormData(prev => ({ ...prev, engine: e.target.value }))}
                  placeholder="e.g., 5.7L V8, Diesel 6.7L"
                  className={vinDecoded && formData.engine ? "border-green-200 bg-green-50" : ""}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_number">Unit #</Label>
              <Input
                id="unit_number"
                value={formData.unit_number}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_number: e.target.value }))}
                placeholder="e.g., UNIT-001"
              />
            </div>

            {/* Vehicle registration fields */}
            {isVehicleType && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="plate_number">License Plate</Label>
                  <Input
                    id="plate_number"
                    value={formData.plate_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, plate_number: e.target.value.toUpperCase() }))}
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuel_type">Fuel Type</Label>
                  <Select 
                    value={formData.fuel_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, fuel_type: value }))}
                  >
                    <SelectTrigger className={vinDecoded && formData.fuel_type ? "border-green-200 bg-green-50" : ""}>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasoline">Gasoline</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="propane">Propane/LPG</SelectItem>
                      <SelectItem value="natural_gas">Natural Gas</SelectItem>
                      <SelectItem value="flex_fuel">Flex Fuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Bay 1, Yard, Storage"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_date">Purchase Date</Label>
              <Input
                id="purchase_date"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_price">Purchase Price</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
              <Input
                id="warranty_expiry"
                type="date"
                value={formData.warranty_expiry}
                onChange={(e) => setFormData(prev => ({ ...prev, warranty_expiry: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this equipment..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name || !formData.equipment_type}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Equipment'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
