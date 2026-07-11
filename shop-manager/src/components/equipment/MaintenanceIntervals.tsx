import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface MaintenanceItem {
  id: string;
  equipment_id: string;
  item_name: string;
  item_category: string;
  description: string | null;
  interval_type: string;
  interval_value: number;
  interval_unit: string;
  quantity: number | null;
  quantity_unit: string | null;
  part_numbers: string[] | null;
  last_service_date: string | null;
  last_service_hours: number | null;
  next_service_date: string | null;
  next_service_hours: number | null;
  is_active: boolean;
  notes: string | null;
}

interface MaintenanceIntervalsProps {
  equipmentId: string;
}

const ITEM_CATEGORIES = [
  { value: 'engine', label: 'Engine' },
  { value: 'gearbox', label: 'Gearbox' },
  { value: 'hydraulics', label: 'Hydraulics' },
  { value: 'transmission', label: 'Transmission' },
  { value: 'electrical', label: 'Electrical System' },
  { value: 'cooling', label: 'Cooling System' },
  { value: 'fuel', label: 'Fuel System' },
  { value: 'life_vest', label: 'Life Vest' },
  { value: 'survival_suit', label: 'Survival Suit' },
  { value: 'life_raft', label: 'Life Raft' },
  { value: 'fire_extinguisher', label: 'Fire Extinguisher' },
  { value: 'safety_equipment', label: 'Safety Equipment' },
  { value: 'filters', label: 'Filters' },
  { value: 'belts', label: 'Belts & Hoses' },
  { value: 'other', label: 'Other' },
];

const INTERVAL_TYPES = [
  { value: 'time', label: 'Time-Based' },
  { value: 'hours', label: 'Operating Hours' },
  { value: 'mileage', label: 'Mileage/Distance' },
  { value: 'engine_hours', label: 'Engine Hours' },
];

const TIME_UNITS = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

const HOUR_UNITS = [
  { value: 'hours', label: 'Hours' },
  { value: 'engine_hours', label: 'Engine Hours' },
];

const DISTANCE_UNITS = [
  { value: 'km', label: 'Kilometers' },
  { value: 'miles', label: 'Miles' },
];

const QUANTITY_UNITS = [
  { value: 'litres', label: 'Litres' },
  { value: 'gallons', label: 'Gallons' },
  { value: 'pieces', label: 'Pieces' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'lbs', label: 'Pounds' },
  { value: 'units', label: 'Units' },
];

export function MaintenanceIntervals({ equipmentId }: MaintenanceIntervalsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaintenanceItem | null>(null);
  const [partDialogOpen, setPartDialogOpen] = useState(false);
  const [partEntryMode, setPartEntryMode] = useState<'manual' | 'inventory'>('manual');
  const [manualPartNumber, setManualPartNumber] = useState('');
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string>('');
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    item_name: '',
    item_category: '',
    description: '',
    interval_type: 'time',
    interval_value: 1,
    interval_unit: 'months',
    quantity: '',
    quantity_unit: '',
    part_numbers: [] as string[],
    notes: '',
  });

  // Fetch maintenance items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['maintenance-items', equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_maintenance_items')
        .select('*')
        .eq('equipment_id', equipmentId)
        .eq('is_active', true)
        .order('item_name');

      if (error) throw error;
      return data as MaintenanceItem[];
    },
  });

  // Fetch inventory items for selection
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, sku, part_number')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingItem) {
        const { error } = await supabase
          .from('equipment_maintenance_items')
          .update(data)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('equipment_maintenance_items')
          .insert({ ...data, equipment_id: equipmentId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-items', equipmentId] });
      toast.success(editingItem ? 'Maintenance item updated' : 'Maintenance item added');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to save maintenance item');
      console.error(error);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment_maintenance_items')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-items', equipmentId] });
      toast.success('Maintenance item removed');
    },
    onError: () => {
      toast.error('Failed to remove maintenance item');
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({
      item_name: '',
      item_category: '',
      description: '',
      interval_type: 'time',
      interval_value: 1,
      interval_unit: 'months',
      quantity: '',
      quantity_unit: '',
      part_numbers: [],
      notes: '',
    });
  };

  const handleAddPart = () => {
    if (partEntryMode === 'manual' && manualPartNumber.trim()) {
      setFormData({
        ...formData,
        part_numbers: [...formData.part_numbers, manualPartNumber.trim()]
      });
      setManualPartNumber('');
    } else if (partEntryMode === 'inventory' && selectedInventoryItem) {
      const item = inventoryItems.find(i => i.id === selectedInventoryItem);
      if (item && item.part_number) {
        setFormData({
          ...formData,
          part_numbers: [...formData.part_numbers, item.part_number]
        });
        setSelectedInventoryItem('');
      }
    }
    setPartDialogOpen(false);
    setPartEntryMode('manual');
  };

  const handleRemovePart = (index: number) => {
    setFormData({
      ...formData,
      part_numbers: formData.part_numbers.filter((_, i) => i !== index)
    });
  };

  const handleEdit = (item: MaintenanceItem) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      item_category: item.item_category,
      description: item.description || '',
      interval_type: item.interval_type,
      interval_value: item.interval_value,
      interval_unit: item.interval_unit,
      quantity: item.quantity?.toString() || '',
      quantity_unit: item.quantity_unit || '',
      part_numbers: item.part_numbers || [],
      notes: item.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: any = {
      item_name: formData.item_name,
      item_category: formData.item_category,
      description: formData.description || null,
      interval_type: formData.interval_type,
      interval_value: formData.interval_value,
      interval_unit: formData.interval_unit,
      quantity: formData.quantity ? parseFloat(formData.quantity) : null,
      quantity_unit: formData.quantity_unit || null,
      part_numbers: formData.part_numbers.length > 0 ? formData.part_numbers : null,
      notes: formData.notes || null,
    };

    saveMutation.mutate(submitData);
  };

  const getIntervalUnits = () => {
    switch (formData.interval_type) {
      case 'time':
        return TIME_UNITS;
      case 'hours':
      case 'engine_hours':
        return HOUR_UNITS;
      case 'mileage':
        return DISTANCE_UNITS;
      default:
        return TIME_UNITS;
    }
  };

  const getDueStatus = (item: MaintenanceItem) => {
    if (!item.next_service_date) return 'scheduled';
    
    const now = new Date();
    const dueDate = new Date(item.next_service_date);
    const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 7) return 'due_soon';
    return 'scheduled';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'due_soon':
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Due Soon</Badge>;
      default:
        return <Badge variant="secondary">Scheduled</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Maintenance Intervals</h3>
          <p className="text-sm text-muted-foreground">
            Track maintenance schedules for equipment components
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Maintenance Item' : 'Add Maintenance Item'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_name">Item Name *</Label>
                  <Input
                    id="item_name"
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    placeholder="e.g., Engine Oil"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item_category">Category *</Label>
                  <Select
                    value={formData.item_category}
                    onValueChange={(value) => setFormData({ ...formData, item_category: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the maintenance item"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interval_type">Interval Type *</Label>
                  <Select
                    value={formData.interval_type}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      interval_type: value,
                      interval_unit: value === 'time' ? 'months' : value === 'mileage' ? 'km' : 'hours'
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVAL_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval_value">Every *</Label>
                  <Input
                    id="interval_value"
                    type="number"
                    min="1"
                    value={formData.interval_value}
                    onChange={(e) => setFormData({ ...formData, interval_value: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval_unit">Unit *</Label>
                  <Select
                    value={formData.interval_unit}
                    onValueChange={(value) => setFormData({ ...formData, interval_unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getIntervalUnits().map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="e.g., 5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity_unit">Quantity Unit</Label>
                  <Select
                    value={formData.quantity_unit}
                    onValueChange={(value) => setFormData({ ...formData, quantity_unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUANTITY_UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Part Numbers</Label>
                <div className="space-y-2">
                  {formData.part_numbers.length > 0 ? (
                    <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30">
                      {formData.part_numbers.map((partNum, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {partNum}
                          <button
                            type="button"
                            onClick={() => handleRemovePart(index)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 border rounded-md bg-muted/30 text-sm text-muted-foreground text-center">
                      No parts added yet
                    </div>
                  )}
                  <Dialog open={partDialogOpen} onOpenChange={setPartDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Part
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Part Number</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={partEntryMode === 'manual' ? 'default' : 'outline'}
                            onClick={() => setPartEntryMode('manual')}
                            className="flex-1"
                          >
                            Manual Entry
                          </Button>
                          <Button
                            type="button"
                            variant={partEntryMode === 'inventory' ? 'default' : 'outline'}
                            onClick={() => setPartEntryMode('inventory')}
                            className="flex-1"
                          >
                            From Inventory
                          </Button>
                        </div>

                        {partEntryMode === 'manual' ? (
                          <div className="space-y-2">
                            <Label htmlFor="manual_part">Part Number</Label>
                            <Input
                              id="manual_part"
                              value={manualPartNumber}
                              onChange={(e) => setManualPartNumber(e.target.value)}
                              placeholder="Enter part number"
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label htmlFor="inventory_select">Select from Inventory</Label>
                            <Select
                              value={selectedInventoryItem}
                              onValueChange={setSelectedInventoryItem}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose an item" />
                              </SelectTrigger>
                              <SelectContent>
                                {inventoryItems.filter(item => item.part_number).map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name} - {item.part_number}
                                    {item.sku && ` (${item.sku})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setPartDialogOpen(false);
                              setPartEntryMode('manual');
                              setManualPartNumber('');
                              setSelectedInventoryItem('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={handleAddPart}
                            disabled={
                              (partEntryMode === 'manual' && !manualPartNumber.trim()) ||
                              (partEntryMode === 'inventory' && !selectedInventoryItem)
                            }
                          >
                            Add Part
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes or instructions"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : editingItem ? 'Update' : 'Add Item'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Loading maintenance items...</p>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No maintenance items configured yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Click "Add Item" to set up maintenance intervals.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-base">{item.item_name}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">
                        {ITEM_CATEGORIES.find(c => c.value === item.item_category)?.label}
                      </Badge>
                      {getStatusBadge(getDueStatus(item))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
                
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Every {item.interval_value} {item.interval_unit}
                  </span>
                </div>

                {item.quantity && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Quantity: </span>
                    <span className="font-medium">
                      {item.quantity} {item.quantity_unit}
                    </span>
                  </div>
                )}

                {item.part_numbers && item.part_numbers.length > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Parts: </span>
                    <span className="font-medium">{item.part_numbers.join(', ')}</span>
                  </div>
                )}

                {item.next_service_date && (
                  <div className="flex items-center gap-2 text-sm pt-2 border-t">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Next service: </span>
                      <span className="font-medium">
                        {new Date(item.next_service_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
