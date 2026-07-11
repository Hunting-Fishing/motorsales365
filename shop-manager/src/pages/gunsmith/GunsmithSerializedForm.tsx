import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Barcode, Loader2 } from 'lucide-react';
import { useGunsmithParts } from '@/hooks/useGunsmith';
import { useCreateSerializedItem } from '@/hooks/useGunsmithInventory';

export default function GunsmithSerializedForm() {
  const navigate = useNavigate();
  const { data: parts } = useGunsmithParts();
  const createItem = useCreateSerializedItem();

  // Filter to only show serialized parts
  const serializedParts = parts?.filter(p => p.is_serialized);

  const [form, setForm] = useState({
    part_id: '',
    serial_number: '',
    status: 'in_stock',
    acquisition_date: new Date().toISOString().split('T')[0],
    acquisition_source: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.part_id || !form.serial_number) return;

    createItem.mutate({
      part_id: form.part_id,
      serial_number: form.serial_number,
      status: form.status as any,
      acquisition_date: form.acquisition_date || undefined,
      acquisition_source: form.acquisition_source || undefined,
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
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Barcode className="h-6 w-6" />
            Add Serialized Item
          </h1>
          <p className="text-muted-foreground">Track regulated parts like receivers and frames</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Serial Number Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Part Type *</Label>
              <Select value={form.part_id} onValueChange={v => setForm(prev => ({ ...prev, part_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a serialized part type" />
                </SelectTrigger>
                <SelectContent>
                  {serializedParts?.length ? (
                    serializedParts.map(part => (
                      <SelectItem key={part.id} value={part.id}>
                        {part.name} {part.manufacturer && `(${part.manufacturer})`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_none" disabled>
                      No serialized parts configured
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only parts marked as "serialized" in inventory appear here
              </p>
            </div>

            <div className="space-y-2">
              <Label>Serial Number *</Label>
              <Input
                value={form.serial_number}
                onChange={e => setForm(prev => ({ ...prev, serial_number: e.target.value.toUpperCase() }))}
                placeholder="e.g., ABC123456"
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="used_in_job">Used in Job</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Acquisition Date</Label>
                <Input
                  type="date"
                  value={form.acquisition_date}
                  onChange={e => setForm(prev => ({ ...prev, acquisition_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Acquisition Source</Label>
              <Input
                value={form.acquisition_source}
                onChange={e => setForm(prev => ({ ...prev, acquisition_source: e.target.value }))}
                placeholder="e.g., Manufacturer, Distributor name, Transfer from customer"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional details, condition notes..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/gunsmith/inventory')}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!form.part_id || !form.serial_number || createItem.isPending}
              >
                {createItem.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Serialized Item
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
