import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useGunsmithParts } from '@/hooks/useGunsmith';
import { useCreateStockMovement } from '@/hooks/useGunsmithInventory';

export default function GunsmithStockAdjust() {
  const navigate = useNavigate();
  const { data: parts } = useGunsmithParts();
  const createMovement = useCreateStockMovement();

  const [form, setForm] = useState({
    part_id: '',
    movement_type: 'adjustment',
    quantity_change: '',
    reason: '',
    notes: ''
  });

  const selectedPart = parts?.find(p => p.id === form.part_id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.part_id || !form.quantity_change) return;

    createMovement.mutate({
      part_id: form.part_id,
      movement_type: form.movement_type,
      quantity_change: parseInt(form.quantity_change),
      reason: form.reason || undefined,
      notes: form.notes || undefined
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
        <h1 className="text-2xl font-bold">Stock Adjustment</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Adjust Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Part *</Label>
              <Select value={form.part_id} onValueChange={v => setForm(prev => ({ ...prev, part_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a part" />
                </SelectTrigger>
                <SelectContent>
                  {parts?.map(part => (
                    <SelectItem key={part.id} value={part.id}>
                      {part.name} {part.part_number && `(${part.part_number})`} - Qty: {part.quantity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPart && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-2xl font-bold">{selectedPart.quantity}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Adjustment Type *</Label>
                <Select value={form.movement_type} onValueChange={v => setForm(prev => ({ ...prev, movement_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                    <SelectItem value="count">Physical Count</SelectItem>
                    <SelectItem value="damage">Damage/Loss</SelectItem>
                    <SelectItem value="return">Customer Return</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity Change *</Label>
                <Input
                  type="number"
                  value={form.quantity_change}
                  onChange={e => setForm(prev => ({ ...prev, quantity_change: e.target.value }))}
                  placeholder="e.g., +5 or -3"
                />
                <p className="text-xs text-muted-foreground">Use negative for decrease</p>
              </div>
            </div>

            {selectedPart && form.quantity_change && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">New Stock Level</p>
                <p className="text-2xl font-bold">
                  {selectedPart.quantity + parseInt(form.quantity_change || '0')}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason *</Label>
              <Input
                value={form.reason}
                onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g., Physical count correction, Damaged in shipping"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional details..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/gunsmith/inventory')}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!form.part_id || !form.quantity_change || createMovement.isPending}
              >
                {createMovement.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Adjustment
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
