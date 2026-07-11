import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { History } from 'lucide-react';
import { EquipmentAuditTrail } from './EquipmentAuditTrail';

interface ToolDialogProps {
  open: boolean;
  onClose: () => void;
  tool?: any;
}

export function ToolDialog({ open, onClose, tool }: ToolDialogProps) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    tool_number: '',
    name: '',
    description: '',
    category: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    purchase_cost: '',
    vendor: '',
    status: 'available',
    condition: 'good',
    location: '',
    warranty_duration: '',
    warranty_expiry: '',
    warranty_notes: '',
    notes: '',
  });

  useEffect(() => {
    if (tool) {
      setFormData({
        tool_number: tool.tool_number || '',
        name: tool.name || '',
        description: tool.description || '',
        category: tool.category || '',
        manufacturer: tool.manufacturer || '',
        model: tool.model || '',
        serial_number: tool.serial_number || '',
        purchase_date: tool.purchase_date || '',
        purchase_cost: tool.purchase_cost?.toString() || '',
        vendor: tool.vendor || '',
        status: tool.status || 'available',
        condition: tool.condition || 'good',
        location: tool.location || '',
        warranty_duration: tool.warranty_duration || '',
        warranty_expiry: tool.warranty_expiry || '',
        warranty_notes: tool.warranty_notes || '',
        notes: tool.notes || '',
      });
    } else {
      setFormData({
        tool_number: '',
        name: '',
        description: '',
        category: '',
        manufacturer: '',
        model: '',
        serial_number: '',
        purchase_date: '',
        purchase_cost: '',
        vendor: '',
        status: 'available',
        condition: 'good',
        location: '',
        warranty_duration: '',
        warranty_expiry: '',
        warranty_notes: '',
        notes: '',
      });
    }
  }, [tool]);

  // Auto-calculate warranty expiry when purchase date or warranty duration changes
  useEffect(() => {
    if (formData.purchase_date && formData.warranty_duration && formData.warranty_duration !== 'lifetime' && formData.warranty_duration !== 'custom') {
      const purchaseDate = new Date(formData.purchase_date);
      const months = parseInt(formData.warranty_duration);
      purchaseDate.setMonth(purchaseDate.getMonth() + months);
      setFormData(prev => ({
        ...prev,
        warranty_expiry: purchaseDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.purchase_date, formData.warranty_duration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shopId) {
      toast({ title: 'Error', description: 'Shop ID not found', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const payload = {
        shop_id: shopId,
        tool_number: formData.tool_number,
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        manufacturer: formData.manufacturer || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        purchase_date: formData.purchase_date || null,
        purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null,
        vendor: formData.vendor || null,
        status: formData.status as any,
        condition: formData.condition as any,
        location: formData.location || null,
        warranty_duration: formData.warranty_duration || null,
        warranty_expiry: formData.warranty_expiry || null,
        warranty_notes: formData.warranty_notes || null,
        notes: formData.notes || null,
        created_by: userData.user.id,
      };

      if (tool) {
        const { error } = await supabase
          .from('tools')
          .update(payload)
          .eq('id', tool.id);

        if (error) throw error;

        toast({ title: 'Success', description: 'Tool updated successfully' });
      } else {
        const { error } = await supabase
          .from('tools')
          .insert([payload]);

        if (error) throw error;

        toast({ title: 'Success', description: 'Tool added successfully' });
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving tool:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save tool',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const FormContent = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tool_number">Tool Number *</Label>
          <Input
            id="tool_number"
            value={formData.tool_number}
            onChange={(e) => setFormData({ ...formData, tool_number: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hand_tool">Hand Tool</SelectItem>
              <SelectItem value="power_tool">Power Tool</SelectItem>
              <SelectItem value="diagnostic">Diagnostic</SelectItem>
              <SelectItem value="specialty">Specialty</SelectItem>
              <SelectItem value="ppe">PPE</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Tool Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="manufacturer">Manufacturer</Label>
          <Input
            id="manufacturer"
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="serial_number">Serial Number</Label>
          <Input
            id="serial_number"
            value={formData.serial_number}
            onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchase_cost">Purchase Cost</Label>
          <Input
            id="purchase_cost"
            type="number"
            step="0.01"
            value={formData.purchase_cost}
            onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="purchase_date">Purchase Date</Label>
          <Input
            id="purchase_date"
            type="date"
            value={formData.purchase_date}
            onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor</Label>
          <Input
            id="vendor"
            value={formData.vendor}
            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="in_use">In Use</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="broken">Broken</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="condition">Condition</Label>
          <Select
            value={formData.condition}
            onValueChange={(value) => setFormData({ ...formData, condition: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="excellent">Excellent</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
              <SelectItem value="unusable">Unusable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>
      </div>

      {/* Warranty Section */}
      <div className="border-t pt-4 space-y-4">
        <h3 className="font-semibold text-sm">Warranty Information</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="warranty_duration">Warranty Duration</Label>
            <Select
              value={formData.warranty_duration}
              onValueChange={(value) => setFormData({ ...formData, warranty_duration: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Warranty</SelectItem>
                <SelectItem value="12">12 Months</SelectItem>
                <SelectItem value="24">24 Months</SelectItem>
                <SelectItem value="36">36 Months</SelectItem>
                <SelectItem value="60">60 Months</SelectItem>
                <SelectItem value="lifetime">Lifetime</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warranty_expiry">Warranty Expiry Date</Label>
            <Input
              id="warranty_expiry"
              type="date"
              value={formData.warranty_expiry}
              onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
              disabled={formData.warranty_duration === 'lifetime'}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="warranty_notes">Warranty Notes</Label>
          <Textarea
            id="warranty_notes"
            value={formData.warranty_notes}
            onChange={(e) => setFormData({ ...formData, warranty_notes: e.target.value })}
            placeholder="Terms, conditions, or warranty provider details..."
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : tool ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tool ? 'Edit Tool' : 'Add New Tool'}
          </DialogTitle>
        </DialogHeader>

        {tool ? (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <FormContent />
            </TabsContent>

            <TabsContent value="history">
              <EquipmentAuditTrail entityType="tools" entityId={tool.id} />
            </TabsContent>
          </Tabs>
        ) : (
          <FormContent />
        )}
      </DialogContent>
    </Dialog>
  );
}
