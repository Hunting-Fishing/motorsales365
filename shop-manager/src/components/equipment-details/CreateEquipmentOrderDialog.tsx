import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CreateEquipmentOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  shopId?: string;
  order?: any | null;
  onSuccess: () => void;
}

interface OrderItem {
  id?: string;
  item_name: string;
  item_category: string;
  quantity: number;
  unit_price: string;
  notes: string;
}

const ITEM_CATEGORIES = [
  { value: 'tools', label: 'Tools' },
  { value: 'consumables', label: 'Consumables' },
  { value: 'safety', label: 'Safety (Spill Pads, Pillows)' },
  { value: 'cleaning', label: 'Cleaning (Brake Clean, etc.)' },
  { value: 'fittings', label: 'Fittings' },
  { value: 'parts', label: 'Parts' },
  { value: 'ppe', label: 'PPE' },
  { value: 'other', label: 'Other' },
];

const COMMON_ITEMS = [
  { name: 'Brake Clean', category: 'cleaning' },
  { name: 'Spill Pads', category: 'safety' },
  { name: 'Absorbent Pillows', category: 'safety' },
  { name: 'Hydraulic Fittings', category: 'fittings' },
  { name: 'WD-40', category: 'consumables' },
  { name: 'Shop Towels', category: 'cleaning' },
  { name: 'Nitrile Gloves', category: 'ppe' },
  { name: 'Safety Glasses', category: 'ppe' },
  { name: 'Grease', category: 'consumables' },
  { name: 'Oil Filter', category: 'parts' },
];

export function CreateEquipmentOrderDialog({ 
  open, 
  onOpenChange, 
  equipmentId, 
  shopId,
  order,
  onSuccess 
}: CreateEquipmentOrderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    supplier: '',
    expected_delivery: '',
    notes: '',
  });
  const [items, setItems] = useState<OrderItem[]>([
    { item_name: '', item_category: 'consumables', quantity: 1, unit_price: '', notes: '' }
  ]);

  useEffect(() => {
    if (open) {
      if (order) {
        setFormData({
          supplier: order.supplier || '',
          expected_delivery: order.expected_delivery || '',
          notes: order.notes || '',
        });
        if (order.items && order.items.length > 0) {
          setItems(order.items.map((item: any) => ({
            id: item.id,
            item_name: item.item_name,
            item_category: item.item_category,
            quantity: item.quantity,
            unit_price: item.unit_price?.toString() || '',
            notes: item.notes || '',
          })));
        }
      } else {
        setFormData({
          supplier: '',
          expected_delivery: '',
          notes: '',
        });
        setItems([
          { item_name: '', item_category: 'consumables', quantity: 1, unit_price: '', notes: '' }
        ]);
      }
    }
  }, [open, order]);

  const addItem = () => {
    setItems([...items, { item_name: '', item_category: 'consumables', quantity: 1, unit_price: '', notes: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addCommonItem = (commonItem: { name: string; category: string }) => {
    setItems([...items, { 
      item_name: commonItem.name, 
      item_category: commonItem.category, 
      quantity: 1, 
      unit_price: '', 
      notes: '' 
    }]);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const price = parseFloat(item.unit_price) || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = items.filter(item => item.item_name.trim());
    if (validItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user?.id)
        .single();

      const requesterName = profile 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
        : null;

      const total = calculateTotal();

      if (order) {
        // Update existing order
        const { error: orderError } = await supabase
          .from('equipment_supply_orders')
          .update({
            supplier: formData.supplier || null,
            expected_delivery: formData.expected_delivery || null,
            notes: formData.notes || null,
            total_estimated_cost: total > 0 ? total : null,
          })
          .eq('id', order.id);

        if (orderError) throw orderError;

        // Delete existing items and insert new ones
        await supabase
          .from('equipment_supply_order_items')
          .delete()
          .eq('order_id', order.id);

        const itemsData = validItems.map(item => ({
          order_id: order.id,
          item_name: item.item_name.trim(),
          item_category: item.item_category,
          quantity: item.quantity,
          unit_price: item.unit_price ? parseFloat(item.unit_price) : null,
          notes: item.notes || null,
        }));

        const { error: itemsError } = await supabase
          .from('equipment_supply_order_items')
          .insert(itemsData);

        if (itemsError) throw itemsError;

        toast.success('Order updated');
      } else {
        // Generate order number
        const { data: orderNum } = await supabase.rpc('generate_equipment_order_number', { 
          p_shop_id: shopId 
        });

        // Create new order
        const { data: newOrder, error: orderError } = await supabase
          .from('equipment_supply_orders')
          .insert({
            equipment_id: equipmentId,
            shop_id: shopId,
            order_number: orderNum,
            supplier: formData.supplier || null,
            expected_delivery: formData.expected_delivery || null,
            notes: formData.notes || null,
            requested_by: user?.id,
            requested_by_name: requesterName,
            total_estimated_cost: total > 0 ? total : null,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Insert items
        const itemsData = validItems.map(item => ({
          order_id: newOrder.id,
          item_name: item.item_name.trim(),
          item_category: item.item_category,
          quantity: item.quantity,
          unit_price: item.unit_price ? parseFloat(item.unit_price) : null,
          notes: item.notes || null,
        }));

        const { error: itemsError } = await supabase
          .from('equipment_supply_order_items')
          .insert(itemsData);

        if (itemsError) throw itemsError;

        toast.success('Order created');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('Failed to save order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{order ? 'Edit Order' : 'Create Supply Order'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Quick Add Common Items */}
              {!order && (
                <div>
                  <Label className="text-sm">Quick Add Common Items</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {COMMON_ITEMS.map((item, idx) => (
                      <Button
                        key={idx}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addCommonItem(item)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {item.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Order Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-3 bg-muted/30">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="col-span-2 sm:col-span-1">
                          <Input
                            placeholder="Item name"
                            value={item.item_name}
                            onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <Select 
                            value={item.item_category} 
                            onValueChange={(v) => updateItem(index, 'item_category', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ITEM_CATEGORIES.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Unit price"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Supplier name"
                  />
                </div>

                <div>
                  <Label htmlFor="expected_delivery">Expected Delivery</Label>
                  <Input
                    id="expected_delivery"
                    type="date"
                    value={formData.expected_delivery}
                    onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              {/* Total */}
              {calculateTotal() > 0 && (
                <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                  <span className="font-medium">Estimated Total</span>
                  <span className="text-lg font-semibold">${calculateTotal().toFixed(2)}</span>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {order ? 'Update Order' : 'Create Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
