import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Loader2, ShoppingCart } from 'lucide-react';
import { useGunsmithParts } from '@/hooks/useGunsmith';
import { useCreatePurchaseOrder, useLowStockParts } from '@/hooks/useGunsmithInventory';

interface POLineItem {
  part_id?: string;
  part_name: string;
  part_number?: string;
  quantity_ordered: number;
  unit_cost?: number;
}

export default function GunsmithPurchaseOrderForm() {
  const navigate = useNavigate();
  const { data: parts } = useGunsmithParts();
  const { data: lowStock } = useLowStockParts();
  const createPO = useCreatePurchaseOrder();

  const [form, setForm] = useState({
    supplier: '',
    supplier_contact: '',
    supplier_email: '',
    expected_date: '',
    notes: ''
  });

  const [items, setItems] = useState<POLineItem[]>([]);

  const addItem = (partId?: string) => {
    if (partId) {
      const part = parts?.find(p => p.id === partId);
      if (part) {
        setItems(prev => [...prev, {
          part_id: part.id,
          part_name: part.name,
          part_number: part.part_number || undefined,
          quantity_ordered: Math.max(1, (part.min_quantity || 5) - part.quantity),
          unit_cost: part.unit_cost || undefined
        }]);
      }
    } else {
      setItems(prev => [...prev, {
        part_name: '',
        quantity_ordered: 1
      }]);
    }
  };

  const updateItem = (index: number, updates: Partial<POLineItem>) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const addLowStockItems = () => {
    if (!lowStock?.length) return;
    const newItems = lowStock.map(part => ({
      part_id: part.id,
      part_name: part.name,
      part_number: part.part_number || undefined,
      quantity_ordered: Math.max(1, (part.min_quantity || 5) * 2 - part.quantity),
      unit_cost: part.unit_cost || undefined
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.unit_cost || 0) * item.quantity_ordered, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length) return;

    createPO.mutate({
      ...form,
      order_date: new Date().toISOString(),
      expected_date: form.expected_date || undefined,
      subtotal,
      total: subtotal,
      items: items.map(item => ({
        ...item,
        total_cost: (item.unit_cost || 0) * item.quantity_ordered
      }))
    }, {
      onSuccess: () => navigate('/gunsmith/inventory')
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/gunsmith/inventory')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">New Purchase Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Supplier Info */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Supplier Name</Label>
                <Input
                  value={form.supplier}
                  onChange={e => setForm(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder="e.g., Brownells"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={form.supplier_contact}
                  onChange={e => setForm(prev => ({ ...prev, supplier_contact: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.supplier_email}
                  onChange={e => setForm(prev => ({ ...prev, supplier_email: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Delivery</Label>
                <Input
                  type="date"
                  value={form.expected_date}
                  onChange={e => setForm(prev => ({ ...prev, expected_date: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Order Items</CardTitle>
            <div className="flex gap-2">
              {(lowStock?.length || 0) > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={addLowStockItems}>
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Add Low Stock ({lowStock?.length})
                </Button>
              )}
              <Select onValueChange={addItem}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Add from inventory" />
                </SelectTrigger>
                <SelectContent>
                  {parts?.map(part => (
                    <SelectItem key={part.id} value={part.id}>
                      {part.name} (Qty: {part.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={() => addItem()}>
                <Plus className="h-4 w-4 mr-1" /> Custom Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No items added. Add parts from inventory or create custom items.
              </p>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-muted/50 rounded-lg">
                    <div className="col-span-4 space-y-1">
                      <Label className="text-xs">Part Name</Label>
                      <Input
                        value={item.part_name}
                        onChange={e => updateItem(index, { part_name: e.target.value })}
                        disabled={!!item.part_id}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Part #</Label>
                      <Input
                        value={item.part_number || ''}
                        onChange={e => updateItem(index, { part_number: e.target.value })}
                        disabled={!!item.part_id}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity_ordered}
                        onChange={e => updateItem(index, { quantity_ordered: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Unit Cost</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_cost || ''}
                        onChange={e => updateItem(index, { unit_cost: parseFloat(e.target.value) || undefined })}
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <p className="text-sm font-medium">
                        ${((item.unit_cost || 0) * item.quantity_ordered).toFixed(2)}
                      </p>
                    </div>
                    <div className="col-span-1">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-4 border-t">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Subtotal</p>
                    <p className="text-2xl font-bold">${subtotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Special instructions, shipping notes..."
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/gunsmith/inventory')}>
            Cancel
          </Button>
          <Button type="submit" disabled={!items.length || createPO.isPending}>
            {createPO.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Purchase Order
          </Button>
        </div>
      </form>
    </div>
  );
}
