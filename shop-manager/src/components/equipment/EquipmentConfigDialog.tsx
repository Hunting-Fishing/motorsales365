import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useEquipmentManagement } from '@/hooks/useEquipmentManagement';
import { EquipmentDetails } from '@/services/equipment/equipmentService';
import { Wrench, FileText, Image, Plus, X, Upload, Settings, Trash2, ShieldCheck, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AddSafetyEquipmentDialog } from './AddSafetyEquipmentDialog';
import { SafetyEquipmentList } from './SafetyEquipmentList';
import { FuelTruckSpecs, FuelTruckData } from './specs/FuelTruckSpecs';
import { MaintenanceItemCombobox } from './MaintenanceItemCombobox';
import { MaintenanceTypeCombobox } from './MaintenanceTypeCombobox';
import { EquipmentCategorySelector } from './EquipmentCategorySelector';
import { getCategoryForType } from '@/types/equipmentCategory';
import { useEquipmentCategories } from '@/hooks/useEquipmentCategories';
import { EquipmentImageUpload } from './EquipmentImageUpload';
import { uploadEquipmentProfileImage, deleteEquipmentProfileImage, updateEquipmentProfileImageUrl } from '@/services/equipment/equipmentImageService';
import { useInspectionTemplates } from '@/hooks/useInspectionTemplates';

interface EquipmentConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: EquipmentDetails;
  onSave: () => void;
}

interface Specification {
  id?: string;
  spec_type: string; // Oil, Filter, Fluid, Battery, Belt, Tire, Other
  spec_name: string;
  inventory_id: string | null;
  quantity: number;
  unit: string;
  custom_value: string; // For non-inventory specs
  notes: string;
}

interface MediaAttachment {
  id?: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'document';
}

interface EquipmentServiceItem {
  id?: string;
  item_name: string;
  item_type: string;
  inventory_id: string | null;
  part_number: string;
  quantity: number;
  hours_interval: number | null;
  mileage_interval: number | null;
  calendar_interval: number | null;
  calendar_interval_unit: string;
  item_category: string;
  position: string;
  notes: string;
  is_critical: boolean;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  part_number: string;
  category: string;
  quantity: number;
  unit_price: number;
}

export function EquipmentConfigDialog({ open, onOpenChange, equipment, onSave }: EquipmentConfigDialogProps) {
  const { updateEquipment, loading } = useEquipmentManagement();
  const [uploading, setUploading] = useState(false);
  const [safetyDialogOpen, setSafetyDialogOpen] = useState(false);
  const [safetyRefreshTrigger, setSafetyRefreshTrigger] = useState(0);
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>((equipment as any).profile_image_url || null);
  
  // Fetch inspection templates
  const { data: inspectionTemplates } = useInspectionTemplates();
  
  // Basic Info State
  const [formData, setFormData] = useState({
    name: equipment.name || '',
    model: equipment.model || '',
    manufacturer: equipment.manufacturer || '',
    serial_number: equipment.serial_number || '',
    unit_number: (equipment as any).unit_number || '',
    location: equipment.location || '',
    status: equipment.status || 'operational',
    notes: equipment.notes || '',
    purchase_date: equipment.purchase_date || '',
    current_value: (equipment as any).current_value || 0,
    // Vehicle fields
    vin_number: (equipment as any).vin_number || '',
    engine_id: (equipment as any).engine_id || '',
    year: (equipment as any).year?.toString() || '',
    plate_number: (equipment as any).plate_number || '',
    registration_state: (equipment as any).registration_state || '',
    registration_expiry: (equipment as any).registration_expiry || '',
    title_number: (equipment as any).title_number || '',
    title_status: (equipment as any).title_status || '',
    // Inspection template
    inspection_template_id: (equipment as any).inspection_template_id || '',
  });

  // Equipment Type State
  const [equipmentType, setEquipmentType] = useState<string>(() => {
    return (equipment as any).equipment_type || 'other';
  });

  // Category State
  const { categories } = useEquipmentCategories();
  const [categoryId, setCategoryId] = useState<string>(() => {
    return (equipment as any).category_id || '';
  });
  const [categoryName, setCategoryName] = useState<string>('');

  // Trailer Information State
  const [trailerData, setTrailerData] = useState({
    gvwr: ((equipment as any).specifications?.trailer?.gvwr) || '',
    front_axle_capacity: ((equipment as any).specifications?.trailer?.front_axle_capacity) || '',
    rear_axle_capacity: ((equipment as any).specifications?.trailer?.rear_axle_capacity) || '',
    num_axles: ((equipment as any).specifications?.trailer?.num_axles) || '',
    tire_size: ((equipment as any).specifications?.trailer?.tire_size) || '',
    rim_size: ((equipment as any).specifications?.trailer?.rim_size) || '',
    tire_psi: ((equipment as any).specifications?.trailer?.tire_psi) || '',
    manufacture_year: ((equipment as any).specifications?.trailer?.manufacture_year) || '',
  });
  
  // Fuel Truck Information State
  const [fuelTruckData, setFuelTruckData] = useState<FuelTruckData>(() => {
    return (equipment as any).specifications?.fuel_truck || {};
  });
  
  // Check if this is a trailer (by type or name)
  const isTrailer = equipment.name?.toLowerCase().includes('trailer') || 
                    equipment.type?.toLowerCase().includes('trailer') ||
                    ((equipment as any).specifications?.trailer);
  const [showTrailerSection, setShowTrailerSection] = useState(isTrailer);

  // Specifications State
  const [specifications, setSpecifications] = useState<Specification[]>(() => {
    const specs = (equipment as any).specifications || [];
    return Array.isArray(specs) ? specs : [];
  });
  const [specTypes] = useState<string[]>([
    'Oil', 'Filter', 'Fluid', 'Battery', 'Belt', 'Tire', 'Coolant', 'Other'
  ]);

  // Media Attachments State - load from specifications if they exist
  const [attachments, setAttachments] = useState<MediaAttachment[]>(() => {
    const existingAttachments = (equipment as any).specifications?.attachments;
    return Array.isArray(existingAttachments) ? existingAttachments : [];
  });

  // Equipment Service Items State
  const [serviceItems, setServiceItems] = useState<EquipmentServiceItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Fetch service items and inventory on mount
  useEffect(() => {
    if (open && equipment.id) {
      fetchServiceItems();
      fetchInventoryItems();
    }
  }, [open, equipment.id]);

  // Filter inventory by category
  useEffect(() => {
    if (categoryFilter === 'all') {
      setFilteredInventory(inventoryItems);
    } else {
      setFilteredInventory(inventoryItems.filter(item => 
        item.category?.toLowerCase() === categoryFilter.toLowerCase()
      ));
    }
  }, [categoryFilter, inventoryItems]);

  const fetchServiceItems = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_maintenance_items')
        .select('*')
        .eq('equipment_id', equipment.id);

      if (error) throw error;
      setServiceItems(data || []);
    } catch (error) {
      console.error('Error fetching service items:', error);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, sku, part_number, category, quantity, unit_price')
        .order('name');

      if (error) {
        console.error('Inventory fetch error:', error);
        throw error;
      }
      
      console.log('Inventory items loaded:', data?.length || 0);
      setInventoryItems(data || []);
      setFilteredInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory items');
      // Set empty arrays to prevent undefined errors
      setInventoryItems([]);
      setFilteredInventory([]);
    }
  };


  const handleAddSpecification = () => {
    setSpecifications([...specifications, { 
      spec_type: 'Oil',
      spec_name: '',
      inventory_id: null,
      quantity: 1,
      unit: 'L',
      custom_value: '',
      notes: ''
    }]);
  };

  const handleRemoveSpecification = (index: number) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  const handleSpecificationChange = (index: number, field: keyof Specification, value: any) => {
    const updated = [...specifications];
    updated[index][field] = value as never;

    // Auto-fill spec name when inventory item is selected
    if (field === 'inventory_id' && value) {
      const inventoryItem = inventoryItems.find(item => item.id === value);
      if (inventoryItem) {
        updated[index].spec_name = inventoryItem.name;
      }
    }

    setSpecifications(updated);
  };


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${equipment.id}/${Date.now()}.${fileExt}`;
        const filePath = `equipment-media/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('equipment_attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('equipment_attachments')
          .getPublicUrl(filePath);

        const fileType = file.type.startsWith('image/') ? 'image' 
          : file.type.startsWith('video/') ? 'video' 
          : 'document';

        setAttachments(prev => [...prev, {
          name: file.name,
          url: publicUrl,
          type: fileType
        }]);
      }
      toast.success('Files uploaded successfully');
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleAddServiceItem = () => {
    try {
      console.log('Adding new service item...');
      setServiceItems([...serviceItems, {
        item_name: '',
        item_type: 'filter',
        inventory_id: null,
        part_number: '',
        quantity: 1,
        hours_interval: null,
        mileage_interval: null,
        calendar_interval: null,
        calendar_interval_unit: 'days',
        item_category: '',
        position: '',
        notes: '',
        is_critical: false
      }]);
      console.log('Service item added successfully');
    } catch (error) {
      console.error('Error adding service item:', error);
      toast.error('Failed to add service item');
    }
  };

  const handleRemoveServiceItem = async (index: number, id?: string) => {
    if (id) {
      try {
        const { error } = await supabase
          .from('equipment_maintenance_items')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('Service item deleted');
      } catch (error) {
        console.error('Error deleting service item:', error);
        toast.error('Failed to delete service item');
        return;
      }
    }
    setServiceItems(serviceItems.filter((_, i) => i !== index));
  };

  const handleServiceItemChange = (index: number, field: keyof EquipmentServiceItem, value: any) => {
    const updated = [...serviceItems];
    updated[index][field] = value as never;

    // Auto-fill part number when inventory item is selected
    if (field === 'inventory_id' && value) {
      const inventoryItem = inventoryItems.find(item => item.id === value);
      if (inventoryItem) {
        updated[index].part_number = inventoryItem.part_number || inventoryItem.sku;
        updated[index].item_name = inventoryItem.name;
      }
    }

    setServiceItems(updated);
  };

  const saveServiceItems = async () => {
    try {
      // Delete all existing items for this equipment
      await supabase
        .from('equipment_maintenance_items')
        .delete()
        .eq('equipment_id', equipment.id);

      // Insert new items
      if (serviceItems.length > 0) {
        const itemsToInsert = serviceItems.map(item => {
          const { id, ...itemWithoutId } = item;
          return {
            ...itemWithoutId,
            equipment_id: equipment.id
          };
        });

        const { error } = await supabase
          .from('equipment_maintenance_items')
          .insert(itemsToInsert);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving service items:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    try {
      // Prepare trailer specifications if trailer section is shown
      const equipmentSpecs = Array.isArray(specifications) ? specifications : [];
      const existingSpecsObj = (equipment as any).specifications || {};
      
      let specsToSave: any = equipmentSpecs;
      
      // If trailer section is visible, save trailer data in specifications object
      if (showTrailerSection) {
        specsToSave = {
          ...existingSpecsObj,
          items: equipmentSpecs,
          trailer: {
            gvwr: trailerData.gvwr ? parseFloat(trailerData.gvwr.toString()) : null,
            front_axle_capacity: trailerData.front_axle_capacity ? parseFloat(trailerData.front_axle_capacity.toString()) : null,
            rear_axle_capacity: trailerData.rear_axle_capacity ? parseFloat(trailerData.rear_axle_capacity.toString()) : null,
            num_axles: trailerData.num_axles ? parseInt(trailerData.num_axles.toString()) : null,
            tire_size: trailerData.tire_size || null,
            rim_size: trailerData.rim_size || null,
            tire_psi: trailerData.tire_psi ? parseFloat(trailerData.tire_psi.toString()) : null,
            manufacture_year: trailerData.manufacture_year ? parseInt(trailerData.manufacture_year.toString()) : null,
          }
        };
      }
      
      // If fuel truck type, save fuel truck data
      if (equipmentType === 'fuel_truck') {
        specsToSave = {
          ...existingSpecsObj,
          items: equipmentSpecs,
          fuel_truck: fuelTruckData
        };
      }
      
      // Include attachments in specifications JSONB
      const specsWithAttachments = {
        ...(typeof specsToSave === 'object' && !Array.isArray(specsToSave) ? specsToSave : { items: specsToSave }),
        attachments: attachments
      };
      
      // Prepare update data - only include valid database columns
      const updates = {
        name: formData.name,
        model: formData.model,
        manufacturer: formData.manufacturer,
        serial_number: formData.serial_number,
        unit_number: formData.unit_number || null,
        location: formData.location,
        status: formData.status,
        notes: formData.notes,
        purchase_date: formData.purchase_date || null,
        purchase_cost: formData.current_value ? parseFloat(formData.current_value.toString()) : null,
        equipment_type: equipmentType,
        category_id: categoryId || null,
        specifications: specsWithAttachments,
        updated_at: new Date().toISOString(),
        // Vehicle fields
        vin_number: formData.vin_number || null,
        engine_id: formData.engine_id || null,
        year: formData.year ? parseInt(formData.year) : null,
        plate_number: formData.plate_number || null,
        registration_state: formData.registration_state || null,
        registration_expiry: formData.registration_expiry || null,
        title_number: formData.title_number || null,
        title_status: formData.title_status || null,
        // Inspection template
        inspection_template_id: formData.inspection_template_id || null,
      };

      // Save service items first
      await saveServiceItems();

      // Update equipment
      await updateEquipment(equipment.id, updates);
      toast.success('Equipment updated successfully');
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving equipment:', error);
      toast.error('Failed to update equipment');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Equipment - {equipment.name}</DialogTitle>
          <DialogDescription className="sr-only">
            Configure equipment settings, specifications, and maintenance items
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="inline-flex h-11 items-center justify-start rounded-full bg-muted/60 p-1 text-muted-foreground min-w-max w-full">
              <TabsTrigger 
                value="basic"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border gap-2"
              >
                <Wrench className="h-4 w-4" />
                <span className="hidden sm:inline">Basic Info</span>
                <span className="sm:hidden">Basic</span>
              </TabsTrigger>
              <TabsTrigger 
                value="specifications"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border gap-2"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Specifications</span>
                <span className="sm:hidden">Specs</span>
              </TabsTrigger>
              <TabsTrigger 
                value="maintenance"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border gap-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Maintenance Items</span>
                <span className="sm:hidden">Maint</span>
              </TabsTrigger>
              <TabsTrigger 
                value="safety"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Safety</span>
                <span className="sm:hidden">Safety</span>
              </TabsTrigger>
              <TabsTrigger 
                value="media"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border gap-2"
              >
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Media & Files</span>
                <span className="sm:hidden">Media</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Profile Image Upload */}
            <div className="flex items-start gap-6 pb-4 border-b">
              <EquipmentImageUpload
                imageUrl={profileImageUrl}
                onImageSelect={async (file) => {
                  try {
                    setProfileImageUploading(true);
                    const url = await uploadEquipmentProfileImage(file, equipment.id);
                    await updateEquipmentProfileImageUrl(equipment.id, url);
                    setProfileImageUrl(url);
                    toast.success('Profile image uploaded');
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to upload image');
                  } finally {
                    setProfileImageUploading(false);
                  }
                }}
                onImageRemove={async () => {
                  try {
                    setProfileImageUploading(true);
                    if (profileImageUrl) {
                      await deleteEquipmentProfileImage(profileImageUrl);
                    }
                    await updateEquipmentProfileImageUrl(equipment.id, null);
                    setProfileImageUrl(null);
                    toast.success('Profile image removed');
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to remove image');
                  } finally {
                    setProfileImageUploading(false);
                  }
                }}
                isUploading={profileImageUploading}
                size="lg"
              />
              <div className="flex-1">
                <Label className="text-sm font-medium">Equipment Photo</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a photo to help quickly identify this equipment. Max 5MB, JPG/PNG/WebP.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Equipment Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter equipment name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_number">Unit #</Label>
                <Input
                  id="unit_number"
                  value={formData.unit_number}
                  onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                  placeholder="e.g., FL 2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Enter model"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="Enter manufacturer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="Enter serial number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="status" className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="down">Down</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <EquipmentCategorySelector
                  categoryId={categoryId}
                  equipmentType={equipmentType}
                  onCategoryChange={(id, name) => {
                    setCategoryId(id);
                    setCategoryName(name);
                  }}
                  onTypeChange={(value) => setEquipmentType(value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={formData.purchase_date?.split('T')[0] || ''}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_value">Current Value ($)</Label>
                <Input
                  id="current_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.current_value}
                  onChange={(e) => setFormData({ ...formData, current_value: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter any additional notes or comments"
                rows={4}
              />
            </div>

            {/* Inspection Template Assignment */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="inspection_template">Pre-Trip Inspection Template</Label>
              </div>
              <Select 
                value={formData.inspection_template_id || ''} 
                onValueChange={(value) => setFormData({ ...formData, inspection_template_id: value })}
              >
                <SelectTrigger id="inspection_template" className="bg-background">
                  <SelectValue placeholder="Select inspection template..." />
                </SelectTrigger>
                <SelectContent className="bg-background border">
                  <SelectItem value="">None</SelectItem>
                  {inspectionTemplates?.filter(t => t.is_published).map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.asset_type && (
                        <span className="text-muted-foreground ml-2">({template.asset_type})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assign an inspection form template for pre-trip/daily inspections on this equipment.
              </p>
            </div>

            {/* Vehicle Information Section - shown for vehicle types */}
            {['fuel_truck', 'heavy_truck', 'fleet_vehicle', 'semi', 'service_vehicle', 'rental_vehicle', 'courtesy_car'].includes(equipmentType) && (
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-semibold">🚛 Vehicle Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vin_number">VIN Number</Label>
                    <Input 
                      id="vin_number"
                      value={formData.vin_number}
                      onChange={(e) => setFormData({ ...formData, vin_number: e.target.value.toUpperCase() })}
                      placeholder="17-character VIN"
                      maxLength={17}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input 
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      placeholder="e.g., 2021"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="engine_id">Engine ID</Label>
                    <Input 
                      id="engine_id"
                      value={formData.engine_id}
                      onChange={(e) => setFormData({ ...formData, engine_id: e.target.value })}
                      placeholder="Engine serial/ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plate_number">Plate Number</Label>
                    <Input 
                      id="plate_number"
                      value={formData.plate_number}
                      onChange={(e) => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })}
                      placeholder="License plate"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registration_state">Registration State</Label>
                    <Input 
                      id="registration_state"
                      value={formData.registration_state}
                      onChange={(e) => setFormData({ ...formData, registration_state: e.target.value.toUpperCase() })}
                      placeholder="e.g., FL, TX"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registration_expiry">Registration Expiry</Label>
                    <Input 
                      id="registration_expiry"
                      type="date"
                      value={formData.registration_expiry?.split('T')[0] || ''}
                      onChange={(e) => setFormData({ ...formData, registration_expiry: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title_number">Title Number</Label>
                    <Input 
                      id="title_number"
                      value={formData.title_number}
                      onChange={(e) => setFormData({ ...formData, title_number: e.target.value })}
                      placeholder="Vehicle title #"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title_status">Title Status</Label>
                    <Select value={formData.title_status} onValueChange={(value) => setFormData({ ...formData, title_status: value })}>
                      <SelectTrigger id="title_status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clean">Clean</SelectItem>
                        <SelectItem value="salvage">Salvage</SelectItem>
                        <SelectItem value="rebuilt">Rebuilt</SelectItem>
                        <SelectItem value="lienholder">Lienholder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Fuel Truck Specifications Section */}
            {equipmentType === 'fuel_truck' && (
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-semibold">⛽ Fuel Truck Specifications</h3>
                <FuelTruckSpecs data={fuelTruckData} onChange={setFuelTruckData} />
              </div>
            )}

            {/* Trailer Information Section */}
            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">🚛 Trailer Specifications</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTrailerSection(!showTrailerSection)}
                >
                  {showTrailerSection ? 'Hide' : 'Show'}
                </Button>
              </div>
              
              {showTrailerSection && (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gvwr">GVWR (lbs)</Label>
                        <Input
                          id="gvwr"
                          type="number"
                          value={trailerData.gvwr}
                          onChange={(e) => setTrailerData({ ...trailerData, gvwr: e.target.value })}
                          placeholder="12573"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="manufacture_year">Manufacture Year</Label>
                        <Input
                          id="manufacture_year"
                          type="number"
                          value={trailerData.manufacture_year}
                          onChange={(e) => setTrailerData({ ...trailerData, manufacture_year: e.target.value })}
                          placeholder="2007"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="front_axle">Front Axle Capacity (lbs)</Label>
                        <Input
                          id="front_axle"
                          type="number"
                          value={trailerData.front_axle_capacity}
                          onChange={(e) => setTrailerData({ ...trailerData, front_axle_capacity: e.target.value })}
                          placeholder="6338"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rear_axle">Rear Axle Capacity (lbs)</Label>
                        <Input
                          id="rear_axle"
                          type="number"
                          value={trailerData.rear_axle_capacity}
                          onChange={(e) => setTrailerData({ ...trailerData, rear_axle_capacity: e.target.value })}
                          placeholder="6338"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="num_axles">Number of Axles</Label>
                        <Select 
                          value={trailerData.num_axles ? trailerData.num_axles.toString() : '_none'} 
                          onValueChange={(value) => setTrailerData({ ...trailerData, num_axles: value === '_none' ? '' : value })}
                        >
                          <SelectTrigger id="num_axles">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">Select...</SelectItem>
                            <SelectItem value="1">1 Axle</SelectItem>
                            <SelectItem value="2">2 Axles</SelectItem>
                            <SelectItem value="3">3 Axles</SelectItem>
                            <SelectItem value="4">4+ Axles</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tire_psi">Tire PSI</Label>
                        <Input
                          id="tire_psi"
                          type="number"
                          value={trailerData.tire_psi}
                          onChange={(e) => setTrailerData({ ...trailerData, tire_psi: e.target.value })}
                          placeholder="80"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tire_size">Tire Size</Label>
                        <Input
                          id="tire_size"
                          value={trailerData.tire_size}
                          onChange={(e) => setTrailerData({ ...trailerData, tire_size: e.target.value })}
                          placeholder="235/85/R16"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rim_size">Rim Size</Label>
                        <Input
                          id="rim_size"
                          value={trailerData.rim_size}
                          onChange={(e) => setTrailerData({ ...trailerData, rim_size: e.target.value })}
                          placeholder="16X6"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="specifications" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Add technical specifications like oil type, filter numbers, capacities, etc.
                </p>
                <Button 
                  type="button" 
                  onClick={handleAddSpecification} 
                  size="default"
                  className="w-full sm:w-auto touch-manipulation"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Specification
                </Button>
              </div>

              <div className="space-y-3">
                {specifications.map((spec, index) => (
                  <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex gap-3 items-start">
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor={`spec-type-${index}`} className="text-xs font-medium">
                                Type *
                              </Label>
                              <Select 
                                value={spec.spec_type}
                                onValueChange={(value) => handleSpecificationChange(index, 'spec_type', value)}
                              >
                                <SelectTrigger id={`spec-type-${index}`} className="h-12 touch-manipulation">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {specTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`spec-name-${index}`} className="text-xs font-medium">
                                Specification Name *
                              </Label>
                              <Input
                                id={`spec-name-${index}`}
                                placeholder="e.g., 5W-30 Synthetic"
                                value={spec.spec_name}
                                onChange={(e) => handleSpecificationChange(index, 'spec_name', e.target.value)}
                                className="h-12 text-base touch-manipulation"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`spec-inventory-${index}`} className="text-xs font-medium">
                              Link to Inventory Item (Optional)
                            </Label>
                            <Select 
                              value={spec.inventory_id || 'none'}
                              onValueChange={(value) => handleSpecificationChange(index, 'inventory_id', value === 'none' ? null : value)}
                            >
                              <SelectTrigger id={`spec-inventory-${index}`} className="h-12 touch-manipulation">
                                <SelectValue placeholder="Select inventory item..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No inventory link</SelectItem>
                                {inventoryItems
                                  .filter(item => item.category?.toLowerCase().includes(spec.spec_type.toLowerCase()) || spec.spec_type === 'Other')
                                  .map(item => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.name} ({item.sku})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor={`spec-qty-${index}`} className="text-xs font-medium">
                                Quantity
                              </Label>
                              <Input
                                id={`spec-qty-${index}`}
                                type="number"
                                min="0"
                                step="0.1"
                                value={spec.quantity}
                                onChange={(e) => handleSpecificationChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                className="h-12 text-base touch-manipulation"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`spec-unit-${index}`} className="text-xs font-medium">
                                Unit
                              </Label>
                              <Input
                                id={`spec-unit-${index}`}
                                placeholder="L, qt, pcs"
                                value={spec.unit}
                                onChange={(e) => handleSpecificationChange(index, 'unit', e.target.value)}
                                className="h-12 text-base touch-manipulation"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`spec-notes-${index}`} className="text-xs font-medium">
                              Notes
                            </Label>
                            <Textarea
                              id={`spec-notes-${index}`}
                              placeholder="Additional notes or specifications..."
                              value={spec.notes}
                              onChange={(e) => handleSpecificationChange(index, 'notes', e.target.value)}
                              className="min-h-[60px] text-base touch-manipulation"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSpecification(index)}
                          className="h-10 w-10 mt-6 touch-manipulation shrink-0"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {specifications.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No specifications added yet</p>
                    <p className="text-xs mt-1">Click "Add Specification" to get started</p>
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Quick Add Common Specification Types
                </p>
                <div className="flex flex-wrap gap-2">
                  {specTypes.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSpecifications([...specifications, { 
                          spec_type: type,
                          spec_name: '',
                          inventory_id: null,
                          quantity: 1,
                          unit: type === 'Oil' ? 'L' : 'pcs',
                          custom_value: '',
                          notes: ''
                        }]);
                        toast.success(`Added ${type} specification`);
                      }}
                      className="touch-manipulation text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Label htmlFor="category-filter" className="whitespace-nowrap">Filter by Type:</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger id="category-filter" className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="marine">Marine</SelectItem>
                      <SelectItem value="automotive">Automotive</SelectItem>
                      <SelectItem value="heavy equipment">Heavy Equipment</SelectItem>
                      <SelectItem value="filters">Filters</SelectItem>
                      <SelectItem value="oils & fluids">Oils & Fluids</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" onClick={handleAddServiceItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {serviceItems.length > 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[180px]">Item Name</TableHead>
                            <TableHead className="w-[120px]">Type</TableHead>
                            <TableHead className="w-[120px]">Position</TableHead>
                            <TableHead className="w-[200px]">Inventory Item</TableHead>
                            <TableHead className="w-[120px]">Part #</TableHead>
                            <TableHead className="w-[90px]">Qty</TableHead>
                            <TableHead className="w-[110px]">Hours</TableHead>
                            <TableHead className="w-[120px]">Mileage</TableHead>
                            <TableHead className="w-[120px]">Calendar</TableHead>
                            <TableHead className="w-[80px]">Critical</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {serviceItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <MaintenanceItemCombobox
                                  value={item.item_name}
                                  onSelect={(value) => handleServiceItemChange(index, 'item_name', value)}
                                  placeholder="Search item..."
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <MaintenanceTypeCombobox
                                  value={item.item_type}
                                  onSelect={(value) => handleServiceItemChange(index, 'item_type', value)}
                                  placeholder="Select type..."
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                              <Select
                                  value={item.position || '_none'}
                                  onValueChange={(value) => handleServiceItemChange(index, 'position', value === '_none' ? '' : value)}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Position" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_none">None</SelectItem>
                                    <SelectItem value="primary">Primary</SelectItem>
                                    <SelectItem value="secondary">Secondary</SelectItem>
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
                                    <SelectItem value="front">Front</SelectItem>
                                    <SelectItem value="rear">Rear</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={item.inventory_id || '_none'}
                                  onValueChange={(value) => handleServiceItemChange(index, 'inventory_id', value === '_none' ? null : value)}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select item" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_none">None</SelectItem>
                                    {filteredInventory.map((invItem) => (
                                      <SelectItem key={invItem.id} value={invItem.id}>
                                        {invItem.name} ({invItem.sku})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={item.part_number}
                                  onChange={(e) => handleServiceItemChange(index, 'part_number', e.target.value)}
                                  placeholder="Part #"
                                  className="h-8 min-w-[80px]"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={item.quantity}
                                  onChange={(e) => handleServiceItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="h-8 min-w-[60px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.hours_interval || ''}
                                  onChange={(e) => handleServiceItemChange(index, 'hours_interval', e.target.value ? parseInt(e.target.value) : null)}
                                  placeholder="hrs"
                                  className="h-8 min-w-[70px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.mileage_interval || ''}
                                  onChange={(e) => handleServiceItemChange(index, 'mileage_interval', e.target.value ? parseInt(e.target.value) : null)}
                                  placeholder="mi/km"
                                  className="h-8 min-w-[80px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.calendar_interval || ''}
                                    onChange={(e) => handleServiceItemChange(index, 'calendar_interval', e.target.value ? parseInt(e.target.value) : null)}
                                    placeholder="90"
                                    className="h-8 w-16"
                                  />
                                  <Select
                                    value={item.calendar_interval_unit}
                                    onValueChange={(value) => handleServiceItemChange(index, 'calendar_interval_unit', value)}
                                  >
                                    <SelectTrigger className="h-8 w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="days">Days</SelectItem>
                                      <SelectItem value="weeks">Weeks</SelectItem>
                                      <SelectItem value="months">Months</SelectItem>
                                      <SelectItem value="years">Years</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="checkbox"
                                  checked={item.is_critical}
                                  onChange={(e) => handleServiceItemChange(index, 'is_critical', e.target.checked)}
                                  className="h-4 w-4"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleRemoveServiceItem(index, item.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Settings className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
                  <p className="text-muted-foreground">No maintenance items added yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click "Add Item" to define parts and service intervals
                  </p>
                </div>
              )}

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Service Intervals Guide:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Hours:</strong> Service every X operating hours (e.g., 250 hours)</li>
                  <li>• <strong>Mileage:</strong> Service every X miles or kilometers (e.g., 5000 miles)</li>
                  <li>• <strong>Calendar:</strong> Service every X days/weeks/months (e.g., 90 days)</li>
                  <li>• <strong>Position:</strong> Use for multiple items (Primary/Secondary filters, Left/Right)</li>
                  <li>• <strong>Critical:</strong> Mark items that require immediate attention when due</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="safety" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Track safety equipment with color-coded status indicators
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-muted-foreground">Current (&gt;30 days)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-muted-foreground">Due Soon (7-30 days)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-muted-foreground">Urgent (&lt;7 days)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-muted-foreground">Overdue</span>
                    </div>
                  </div>
                </div>
                <Button 
                  type="button" 
                  onClick={() => setSafetyDialogOpen(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Safety Equipment
                </Button>
              </div>

              <AddSafetyEquipmentDialog
                open={safetyDialogOpen}
                onOpenChange={setSafetyDialogOpen}
                parentEquipmentId={equipment.id}
                onSuccess={() => {
                  toast.success('Safety equipment added successfully');
                  setSafetyDialogOpen(false);
                  setSafetyRefreshTrigger(prev => prev + 1);
                }}
              />

              <SafetyEquipmentList 
                refreshTrigger={safetyRefreshTrigger} 
                parentEquipmentId={equipment.id}
              />
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Upload photos, videos, manuals, and other documents
                </p>
                <div>
                  <Input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    size="sm"
                    variant="outline"
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Files'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {attachments.map((attachment, index) => (
                  <Card key={index} className="p-3 relative group">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveAttachment(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    
                    {attachment.type === 'image' && (
                      <img 
                        src={attachment.url} 
                        alt={attachment.name}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    )}
                    {attachment.type === 'video' && (
                      <video 
                        src={attachment.url} 
                        className="w-full h-32 object-cover rounded mb-2"
                        controls
                      />
                    )}
                    {attachment.type === 'document' && (
                      <div className="w-full h-32 flex items-center justify-center bg-muted rounded mb-2">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-xs truncate">{attachment.name}</p>
                  </Card>
                ))}
              </div>

              {attachments.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Image className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
                  <p className="text-muted-foreground">No files uploaded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click "Upload Files" to add photos, videos, or documents
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || uploading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || uploading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
