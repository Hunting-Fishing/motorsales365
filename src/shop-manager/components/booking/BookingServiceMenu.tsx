import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Clock, DollarSign, GripVertical } from 'lucide-react';
import { BookableService, useCreateBookableService, useUpdateBookableService, useDeleteBookableService } from '@/hooks/useBookingSystem';
import { toast } from 'sonner';

interface BookingServiceMenuProps {
  services: BookableService[];
}

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const SERVICE_CATEGORIES = [
  'Cleaning', 'Maintenance', 'Repair', 'Inspection', 'Consultation', 'Other'
];

export function BookingServiceMenu({ services }: BookingServiceMenuProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingService, setEditingService] = useState<BookableService | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    duration_minutes: 60,
    buffer_minutes: 15,
    price: '',
    color: DEFAULT_COLORS[0],
    is_active: true,
    requires_equipment: false,
    equipment_type: '',
    booking_notice_hours: 24,
    cancellation_notice_hours: 24,
  });

  const createService = useCreateBookableService();
  const updateService = useUpdateBookableService();
  const deleteService = useDeleteBookableService();

  const handleEdit = (service: BookableService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      category: service.category || '',
      duration_minutes: service.duration_minutes,
      buffer_minutes: service.buffer_minutes,
      price: service.price?.toString() || '',
      color: service.color,
      is_active: service.is_active,
      requires_equipment: service.requires_equipment,
      equipment_type: service.equipment_type || '',
      booking_notice_hours: service.booking_notice_hours,
      cancellation_notice_hours: service.cancellation_notice_hours,
    });
    setShowDialog(true);
  };

  const handleCreate = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      duration_minutes: 60,
      buffer_minutes: 15,
      price: '',
      color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      is_active: true,
      requires_equipment: false,
      equipment_type: '',
      booking_notice_hours: 24,
      cancellation_notice_hours: 24,
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Service name is required');
      return;
    }

    const serviceData = {
      name: formData.name,
      description: formData.description || null,
      category: formData.category || null,
      duration_minutes: formData.duration_minutes,
      buffer_minutes: formData.buffer_minutes,
      price: formData.price ? parseFloat(formData.price) : null,
      color: formData.color,
      is_active: formData.is_active,
      requires_equipment: formData.requires_equipment,
      equipment_type: formData.requires_equipment ? formData.equipment_type : null,
      booking_notice_hours: formData.booking_notice_hours,
      cancellation_notice_hours: formData.cancellation_notice_hours,
    };

    if (editingService) {
      await updateService.mutateAsync({ id: editingService.id, ...serviceData });
    } else {
      await createService.mutateAsync(serviceData);
    }
    
    setShowDialog(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      await deleteService.mutateAsync(id);
    }
  };

  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, BookableService[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Service Menu</h2>
          <p className="text-sm text-muted-foreground">
            Configure the services available for booking
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {Object.keys(groupedServices).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No services configured yet</p>
            <Button onClick={handleCreate} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create your first service
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedServices).map(([category, categoryServices]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryServices.map((service) => (
                  <div 
                    key={service.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div 
                      className="w-1 h-12 rounded-full"
                      style={{ backgroundColor: service.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{service.name}</span>
                        {!service.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {service.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {service.duration_minutes} min
                        </span>
                        {service.price && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {service.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(service)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(service.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Service Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Edit Service' : 'Create Service'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Service Name *</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Pressure Washing"
                />
              </div>
              
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this service..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Category</Label>
                <Input 
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Cleaning"
                  list="categories"
                />
                <datalist id="categories">
                  {SERVICE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label>Price ($)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Duration (minutes)</Label>
                <Input 
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                />
              </div>

              <div>
                <Label>Buffer Time (minutes)</Label>
                <Input 
                  type="number"
                  value={formData.buffer_minutes}
                  onChange={(e) => setFormData({ ...formData, buffer_minutes: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label>Booking Notice (hours)</Label>
                <Input 
                  type="number"
                  value={formData.booking_notice_hours}
                  onChange={(e) => setFormData({ ...formData, booking_notice_hours: parseInt(e.target.value) || 24 })}
                />
              </div>

              <div>
                <Label>Cancellation Notice (hours)</Label>
                <Input 
                  type="number"
                  value={formData.cancellation_notice_hours}
                  onChange={(e) => setFormData({ ...formData, cancellation_notice_hours: parseInt(e.target.value) || 24 })}
                />
              </div>

              <div className="col-span-2">
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>

              <div className="col-span-2 flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">Show this service for booking</p>
                </div>
                <Switch 
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="col-span-2 flex items-center justify-between">
                <div>
                  <Label>Requires Equipment</Label>
                  <p className="text-sm text-muted-foreground">This service needs equipment reservation</p>
                </div>
                <Switch 
                  checked={formData.requires_equipment}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_equipment: checked })}
                />
              </div>

              {formData.requires_equipment && (
                <div className="col-span-2">
                  <Label>Equipment Type</Label>
                  <Input 
                    value={formData.equipment_type}
                    onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
                    placeholder="e.g., pressure_washer"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingService ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
