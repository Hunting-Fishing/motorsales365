import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Truck, Plus, Pencil, Trash2, Loader2, MapPin, Star } from 'lucide-react';
import { FuelDeliveryYard, useFuelDeliveryYards } from '@/hooks/fuel-delivery/useFuelDeliveryYards';
import { LocationPickerMap } from './LocationPickerMap';

interface YardLocationCardProps {
  shopId: string | null;
  onYardClick?: (yard: FuelDeliveryYard) => void;
}

export function YardLocationCard({ shopId, onYardClick }: YardLocationCardProps) {
  const { yards, isLoading, createYard, updateYard, deleteYard, isCreating, isUpdating } = useFuelDeliveryYards(shopId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingYard, setEditingYard] = useState<FuelDeliveryYard | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    is_primary: false,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      latitude: undefined,
      longitude: undefined,
      is_primary: false,
    });
    setEditingYard(null);
  };

  const openEditDialog = (yard: FuelDeliveryYard) => {
    setEditingYard(yard);
    setFormData({
      name: yard.name,
      address: yard.address || '',
      latitude: yard.latitude,
      longitude: yard.longitude,
      is_primary: yard.is_primary,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!shopId) return;

    const yardData = {
      shop_id: shopId,
      name: formData.name,
      address: formData.address || undefined,
      latitude: formData.latitude,
      longitude: formData.longitude,
      is_primary: formData.is_primary,
      is_active: true,
    };

    if (editingYard?.id) {
      updateYard({ id: editingYard.id, ...yardData });
    } else {
      createYard(yardData);
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this yard location?')) {
      deleteYard(id);
    }
  };

  const handleLocationChange = (location: { latitude: number; longitude: number; address: string }) => {
    setFormData(prev => ({
      ...prev,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">Yard Locations</CardTitle>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Yard
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingYard ? 'Edit Yard' : 'Add Yard Location'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Yard Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Main Yard, North Depot"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Location</Label>
                  <LocationPickerMap
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    address={formData.address}
                    onLocationChange={handleLocationChange}
                    height="250px"
                    placeholder="Search for yard address..."
                  />
                </div>

                {formData.address && (
                  <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                    <MapPin className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Selected Location</p>
                      <p className="text-muted-foreground">{formData.address}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_primary}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_primary: checked }))}
                  />
                  <Label className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500" />
                    Primary Yard (default origin for zones)
                  </Label>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!formData.name || isCreating || isUpdating}
                  className="w-full"
                >
                  {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingYard ? 'Update Yard' : 'Add Yard'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : yards.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Truck className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No yard locations configured</p>
            <p className="text-xs">Add yards where your delivery vehicles are stationed</p>
          </div>
        ) : (
          <div className="space-y-2">
            {yards.map((yard) => (
              <div
                key={yard.id}
                onClick={() => onYardClick?.(yard)}
                className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${yard.is_primary ? 'bg-blue-500' : 'bg-slate-500'}`}>
                    <Truck className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{yard.name}</span>
                      {yard.is_primary && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          <Star className="h-3 w-3 mr-0.5 text-amber-500" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    {yard.address && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{yard.address}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); openEditDialog(yard); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); yard.id && handleDelete(yard.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
