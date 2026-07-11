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
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';

interface DeliveryCompletion {
  id: string;
  delivery_date: string;
  gallons_delivered: number | null;
  tank_level_before: number | null;
  tank_level_after: number | null;
  notes: string | null;
  total_amount: number | null;
  price_per_gallon: number | null;
  payment_method: string | null;
  customer_id: string | null;
}

interface EditDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: DeliveryCompletion | null;
  onSuccess?: () => void;
}

export function EditDeliveryDialog({
  open,
  onOpenChange,
  delivery,
  onSuccess,
}: EditDeliveryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getVolumeLabel, getPriceLabel, convertToGallons, convertFromGallons } = useWaterUnits();

  const [formData, setFormData] = useState({
    delivery_date: '',
    gallons_delivered: 0,
    tank_level_before: 0,
    tank_level_after: 0,
    price_per_gallon: 0,
    payment_method: 'cash',
    notes: '',
    change_note: '',
  });

  // Get current user profile
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, shop_id')
        .eq('id', user.id)
        .single();
      
      return profile;
    },
  });

  useEffect(() => {
    if (delivery) {
      setFormData({
        delivery_date: delivery.delivery_date ? format(parseISO(delivery.delivery_date), 'yyyy-MM-dd') : '',
        gallons_delivered: convertFromGallons(delivery.gallons_delivered || 0),
        tank_level_before: delivery.tank_level_before || 0,
        tank_level_after: delivery.tank_level_after || 0,
        price_per_gallon: delivery.price_per_gallon || 0,
        payment_method: delivery.payment_method || 'cash',
        notes: delivery.notes || '',
        change_note: '',
      });
    }
  }, [delivery, convertFromGallons]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!delivery || !currentUser?.shop_id) throw new Error('Missing required data');

      // Convert back to gallons for storage
      const gallonsDelivered = convertToGallons(data.gallons_delivered);

      // Get original values for audit log
      const previousValues = {
        delivery_date: delivery.delivery_date,
        gallons_delivered: delivery.gallons_delivered,
        tank_level_before: delivery.tank_level_before,
        tank_level_after: delivery.tank_level_after,
        price_per_gallon: delivery.price_per_gallon,
        payment_method: delivery.payment_method,
        notes: delivery.notes,
      };

      const newValues = {
        delivery_date: data.delivery_date,
        gallons_delivered: gallonsDelivered,
        tank_level_before: data.tank_level_before,
        tank_level_after: data.tank_level_after,
        price_per_gallon: data.price_per_gallon,
        payment_method: data.payment_method,
        notes: data.notes,
      };

      // Calculate new total amount (price is always per gallon in database)
      const total_amount = gallonsDelivered * data.price_per_gallon;

      // Update the delivery completion
      const { error: updateError } = await supabase
        .from('water_delivery_completions')
        .update({
          delivery_date: data.delivery_date,
          gallons_delivered: gallonsDelivered,
          tank_level_before: data.tank_level_before,
          tank_level_after: data.tank_level_after,
          price_per_gallon: data.price_per_gallon,
          payment_method: data.payment_method,
          notes: data.notes,
          total_amount,
        })
        .eq('id', delivery.id);

      if (updateError) throw updateError;

      // Insert audit log entry
      const employeeName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || 'Unknown';
      
      const { error: auditError } = await supabase
        .from('water_delivery_audit_log')
        .insert({
          shop_id: currentUser.shop_id,
          entity_type: 'delivery_completion',
          entity_id: delivery.id,
          action: 'update',
          changed_by: currentUser.id,
          changed_by_name: employeeName,
          previous_values: previousValues,
          new_values: newValues,
          notes: data.change_note || null,
        });

      if (auditError) {
        console.error('Failed to create audit log:', auditError);
        // Don't throw - update was successful, audit log is secondary
      }

      return { success: true };
    },
    onSuccess: () => {
      toast({ title: 'Delivery updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['water-delivery-history'] });
      queryClient.invalidateQueries({ queryKey: ['water-delivery-audit-log'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error updating delivery',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.change_note.trim()) {
      toast({
        title: 'Note required',
        description: 'Please provide a note explaining the reason for this change.',
        variant: 'destructive',
      });
      return;
    }
    updateMutation.mutate(formData);
  };

  if (!delivery) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Delivery Record</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delivery_date">Delivery Date</Label>
            <Input
              id="delivery_date"
              type="date"
              value={formData.delivery_date}
              onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gallons_delivered">{getVolumeLabel(false)} Delivered</Label>
              <Input
                id="gallons_delivered"
                type="number"
                min="0"
                step="0.01"
                value={formData.gallons_delivered}
                onChange={(e) => setFormData(prev => ({ ...prev, gallons_delivered: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_per_gallon">Price {getPriceLabel(true)} ($)</Label>
              <Input
                id="price_per_gallon"
                type="number"
                min="0"
                step="0.01"
                value={formData.price_per_gallon}
                onChange={(e) => setFormData(prev => ({ ...prev, price_per_gallon: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tank_level_before">Tank Level Before (%)</Label>
              <Input
                id="tank_level_before"
                type="number"
                min="0"
                max="100"
                value={formData.tank_level_before}
                onChange={(e) => setFormData(prev => ({ ...prev, tank_level_before: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tank_level_after">Tank Level After (%)</Label>
              <Input
                id="tank_level_after"
                type="number"
                min="0"
                max="100"
                value={formData.tank_level_after}
                onChange={(e) => setFormData(prev => ({ ...prev, tank_level_after: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="online">Online Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Delivery Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="change_note" className="text-orange-600">
              Reason for Change (Required) *
            </Label>
            <Textarea
              id="change_note"
              value={formData.change_note}
              onChange={(e) => setFormData(prev => ({ ...prev, change_note: e.target.value }))}
              placeholder="Explain why this delivery record is being modified..."
              rows={3}
              required
              className="border-orange-200 focus:border-orange-400"
            />
            <p className="text-xs text-muted-foreground">
              This note will be recorded in the audit log along with your name and timestamp.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
