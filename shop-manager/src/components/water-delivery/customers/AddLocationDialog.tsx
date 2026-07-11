import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, MapPin, ChevronDown, Home, Container, Droplets } from 'lucide-react';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { LocationMapPicker } from './LocationMapPicker';

interface AddLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
}

const LOCATION_TYPES = [
  { value: 'residence', label: 'Residence', icon: Home },
  { value: 'cistern', label: 'Cistern', icon: Container },
  { value: 'well', label: 'Well', icon: Droplets },
];

export function AddLocationDialog({ open, onOpenChange, customerId }: AddLocationDialogProps) {
  const queryClient = useQueryClient();
  const [showMap, setShowMap] = useState(false);
  const [formData, setFormData] = useState({
    location_type: '' as 'residence' | 'cistern' | 'well' | '',
    location_name: '',
    address: '',
    notes: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
  }, []);

  const handleAddressSelect = useCallback((addressData: { street: string; city: string; state: string; zip: string }) => {
    // Just update the address - coordinates will be set via map
    const fullAddress = [addressData.street, addressData.city, addressData.state, addressData.zip]
      .filter(Boolean)
      .join(', ');
    setFormData(prev => ({ ...prev, address: fullAddress }));
  }, []);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', profile.user?.id)
        .single();

      // Use location type as the location name if no custom name provided
      const locationName = formData.location_name || 
        LOCATION_TYPES.find(t => t.value === formData.location_type)?.label || 
        formData.location_type;

      const { error } = await supabase.from('water_delivery_locations').insert({
        customer_id: customerId,
        shop_id: userProfile?.shop_id,
        location_name: locationName,
        address: formData.address || null,
        notes: formData.notes || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-customer-locations', customerId] });
      toast.success('Location added successfully');
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Failed to add location: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      location_type: '',
      location_name: '',
      address: '',
      notes: '',
      latitude: null,
      longitude: null,
    });
    setShowMap(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location_type) {
      toast.error('Please select a location type');
      return;
    }
    createMutation.mutate();
  };

  const selectedType = LOCATION_TYPES.find(t => t.value === formData.location_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-md max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Add Location</DialogTitle>
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
            <Label htmlFor="location_name">Location Name (optional)</Label>
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Location
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
