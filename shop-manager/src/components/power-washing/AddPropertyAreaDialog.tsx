import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Loader2, Ruler } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PropertyArea, AREA_TYPES } from './PropertyAreasTab';

interface CustomerAddress {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
}

interface AddPropertyAreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  shopId: string;
  editingArea?: PropertyArea | null;
  customerAddress?: CustomerAddress;
}

export function AddPropertyAreaDialog({
  open,
  onOpenChange,
  customerId,
  shopId,
  editingArea,
  customerAddress
}: AddPropertyAreaDialogProps) {
  const queryClient = useQueryClient();
  const [showDimensions, setShowDimensions] = useState(false);

  const [formData, setFormData] = useState({
    area_type: '',
    label: '',
    square_footage: '',
    length_ft: '',
    width_ft: '',
    height_ft: '',
    notes: '',
  });

  // Reset form when dialog opens/closes or editing area changes
  useEffect(() => {
    if (editingArea) {
      setFormData({
        area_type: editingArea.area_type,
        label: editingArea.label || '',
        square_footage: editingArea.square_footage.toString(),
        length_ft: editingArea.length_ft?.toString() || '',
        width_ft: editingArea.width_ft?.toString() || '',
        height_ft: editingArea.height_ft?.toString() || '',
        notes: editingArea.notes || '',
      });
      if (editingArea.length_ft || editingArea.width_ft || editingArea.height_ft) {
        setShowDimensions(true);
      }
    } else {
      setFormData({
        area_type: '',
        label: '',
        square_footage: '',
        length_ft: '',
        width_ft: '',
        height_ft: '',
        notes: '',
      });
      setShowDimensions(false);
    }
  }, [editingArea, open]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        customer_id: customerId,
        shop_id: shopId,
        area_type: data.area_type,
        label: data.label || null,
        square_footage: parseInt(data.square_footage),
        length_ft: data.length_ft ? parseFloat(data.length_ft) : null,
        width_ft: data.width_ft ? parseFloat(data.width_ft) : null,
        height_ft: data.height_ft ? parseFloat(data.height_ft) : null,
        notes: data.notes || null,
      };

      if (editingArea) {
        const { error } = await supabase
          .from('customer_property_areas')
          .update(payload)
          .eq('id', editingArea.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customer_property_areas')
          .insert(payload);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingArea ? 'Property area updated' : 'Property area added');
      queryClient.invalidateQueries({ queryKey: ['customer-property-areas', customerId] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Failed to save area:', error);
      toast.error(editingArea ? 'Failed to update property area' : 'Failed to add property area');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.area_type) {
      toast.error('Please select an area type');
      return;
    }
    
    if (!formData.square_footage || parseInt(formData.square_footage) <= 0) {
      toast.error('Please enter a valid square footage');
      return;
    }

    createMutation.mutate(formData);
  };

  // Build formatted address string
  const formattedAddress = customerAddress ? [
    customerAddress.address,
    customerAddress.city,
    customerAddress.state,
    customerAddress.postal_code
  ].filter(Boolean).join(', ') : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-cyan-600" />
            {editingArea ? 'Edit Property Area' : 'Add Property Area'}
          </DialogTitle>
          {formattedAddress && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              📍 {formattedAddress}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Area Type */}
          <div className="space-y-2">
            <Label htmlFor="area_type">Area Type *</Label>
            <Select 
              value={formData.area_type} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, area_type: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select area type" />
              </SelectTrigger>
              <SelectContent>
                {AREA_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label">Custom Label</Label>
            <Input
              id="label"
              placeholder="e.g., Front Driveway, Back Patio"
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
            />
          </div>

          {/* Square Footage */}
          <div className="space-y-2">
            <Label htmlFor="square_footage">Square Footage *</Label>
            <div className="relative">
              <Input
                id="square_footage"
                type="number"
                placeholder="e.g., 850"
                value={formData.square_footage}
                onChange={(e) => setFormData(prev => ({ ...prev, square_footage: e.target.value }))}
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                sqft
              </span>
            </div>
          </div>

          {/* Optional Dimensions */}
          <Collapsible open={showDimensions} onOpenChange={setShowDimensions}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-sm text-muted-foreground">Optional Dimensions</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showDimensions ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="length_ft" className="text-xs">Length (ft)</Label>
                  <Input
                    id="length_ft"
                    type="number"
                    step="0.01"
                    placeholder="L"
                    value={formData.length_ft}
                    onChange={(e) => setFormData(prev => ({ ...prev, length_ft: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="width_ft" className="text-xs">Width (ft)</Label>
                  <Input
                    id="width_ft"
                    type="number"
                    step="0.01"
                    placeholder="W"
                    value={formData.width_ft}
                    onChange={(e) => setFormData(prev => ({ ...prev, width_ft: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="height_ft" className="text-xs">Height (ft)</Label>
                  <Input
                    id="height_ft"
                    type="number"
                    step="0.01"
                    placeholder="H"
                    value={formData.height_ft}
                    onChange={(e) => setFormData(prev => ({ ...prev, height_ft: e.target.value }))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                For fences, use length and height. For rectangular areas, use length and width.
              </p>
            </CollapsibleContent>
          </Collapsible>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Special instructions for this area..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingArea ? 'Update Area' : 'Add Area'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
