import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, MapPin, ChevronDown, Home, Container, Droplets } from 'lucide-react';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { LocationMapPicker } from './LocationMapPicker';

interface Location {
  id: string;
  location_name: string;
  address: string | null;
  notes: string | null;
  is_active: boolean | null;
  customer_id: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface EditLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location | null;
}

const LOCATION_TYPES = [
  { value: 'residence', label: 'Residence', icon: Home },
  { value: 'cistern', label: 'Cistern', icon: Container },
  { value: 'well', label: 'Well', icon: Droplets },
];

// Helper to detect location type from name
function detectLocationType(name: string): 'residence' | 'cistern' | 'well' {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('cistern')) return 'cistern';
  if (lowerName.includes('well')) return 'well';
  if (lowerName.includes('residence') || lowerName.includes('house') || lowerName.includes('home')) return 'residence';
  return 'residence'; // default
}

export function EditLocationDialog({ open, onOpenChange, location }: EditLocationDialogProps) {
  const queryClient = useQueryClient();
  const [showMap, setShowMap] = useState(false);
  const [formData, setFormData] = useState({
    location_type: '' as 'residence' | 'cistern' | 'well' | '',
    location_name: '',
    address: '',
    notes: '',
    is_active: true,
    latitude: null as number | null,
    longitude: null as number | null,
  });

  useEffect(() => {
    if (location) {
      const hasCoordinates = location.latitude != null && location.longitude != null;
      setFormData({
        location_type: detectLocationType(location.location_name),
        location_name: location.location_name || '',
        address: location.address || '',
        notes: location.notes || '',
        is_active: location.is_active ?? true,
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
      });
      // Auto-show map if coordinates exist
      setShowMap(hasCoordinates);
    }
  }, [location]);

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
  }, []);

  const handleAddressSelect = useCallback((addressData: { street: string; city: string; state: string; zip: string }) => {
    const fullAddress = [addressData.street, addressData.city, addressData.state, addressData.zip]
      .filter(Boolean)
      .join(', ');
    setFormData(prev => ({ ...prev, address: fullAddress }));
  }, []);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!location) return;

      const { error } = await supabase
        .from('water_delivery_locations')
        .update({
          location_name: formData.location_name || 
            LOCATION_TYPES.find(t => t.value === formData.location_type)?.label || 
            formData.location_type,
          address: formData.address || null,
          notes: formData.notes || null,
          is_active: formData.is_active,
          latitude: formData.latitude,
          longitude: formData.longitude,
        })
        .eq('id', location.id);

      if (error) throw error;
    },
    onSuccess: () => {
      if (location) {
        queryClient.invalidateQueries({ queryKey: ['water-delivery-customer-locations', location.customer_id] });
      }
      toast.success('Location updated successfully');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('Failed to update location: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location_type) {
      toast.error('Please select a location type');
      return;
    }
    updateMutation.mutate();
  };

  if (!location) return null;

  const selectedType = LOCATION_TYPES.find(t => t.value === formData.location_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-md max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit Location</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location_type">Location Type *</Label>
            <Select
              value={formData.location_type}
              onValueChange={(value: 'residence' | 'cistern' | 'well') => 
                setFormData({ ...formData, location_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location_name">Location Name</Label>
            <Input
              id="location_name"
              value={formData.location_name}
              onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              placeholder={selectedType ? `e.g., Main ${selectedType.label}` : 'e.g., Main House'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <AddressAutocomplete
              id="address"
              value={formData.address}
              onChange={(value) => setFormData({ ...formData, address: value })}
              onAddressSelect={handleAddressSelect}
              placeholder="Start typing address..."
            />
          </div>

          {/* Collapsible Map Section */}
          <Collapsible open={showMap} onOpenChange={setShowMap}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {showMap ? 'Hide Map' : 'Show on Map'}
                  {formData.latitude && formData.longitude && (
                    <span className="text-xs text-muted-foreground">
                      (Location marked)
                    </span>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showMap ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <LocationMapPicker
                latitude={formData.latitude}
                longitude={formData.longitude}
                onLocationChange={handleLocationChange}
                locationType={formData.location_type}
              />
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Access instructions, gate code, etc."
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
