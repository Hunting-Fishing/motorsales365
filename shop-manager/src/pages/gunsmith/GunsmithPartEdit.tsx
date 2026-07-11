import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useGunsmithPart, useUpdateGunsmithPart } from '@/hooks/useGunsmith';

export default function GunsmithPartEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: part, isLoading } = useGunsmithPart(id || '');
  const updatePart = useUpdateGunsmithPart();

  const [form, setForm] = useState({
    part_number: '',
    name: '',
    category: 'general',
    manufacturer: '',
    quantity: '',
    min_quantity: '',
    unit_cost: '',
    retail_price: '',
    location: ''
  });

  useEffect(() => {
    if (part) {
      setForm({
        part_number: part.part_number || '',
        name: part.name || '',
        category: part.category || 'general',
        manufacturer: part.manufacturer || '',
        quantity: part.quantity?.toString() || '0',
        min_quantity: part.min_quantity?.toString() || '0',
        unit_cost: part.unit_cost?.toString() || '',
        retail_price: part.retail_price?.toString() || '',
        location: part.location || ''
      });
    }
  }, [part]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    updatePart.mutate({
      id,
      part_number: form.part_number || undefined,
      name: form.name,
      category: form.category,
      manufacturer: form.manufacturer || undefined,
      quantity: parseInt(form.quantity) || 0,
      min_quantity: parseInt(form.min_quantity) || 0,
      unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : undefined,
      retail_price: form.retail_price ? parseFloat(form.retail_price) : undefined,
      location: form.location || undefined
    }, {
      onSuccess: () => navigate('/gunsmith/parts')
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!part) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Part not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/gunsmith/parts')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Edit Part</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Part Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="part_number">Part Number</Label>
                <Input
                  id="part_number"
                  value={form.part_number}
                  onChange={e => setForm(prev => ({ ...prev, part_number: e.target.value }))}
                  placeholder="e.g., AR15-BCG-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Part Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="springs">Springs</SelectItem>
                    <SelectItem value="pins">Pins</SelectItem>
                    <SelectItem value="triggers">Triggers</SelectItem>
                    <SelectItem value="barrels">Barrels</SelectItem>
                    <SelectItem value="stocks">Stocks</SelectItem>
                    <SelectItem value="sights">Sights/Optics</SelectItem>
                    <SelectItem value="magazines">Magazines</SelectItem>
                    <SelectItem value="cleaning">Cleaning Supplies</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={form.manufacturer}
                  onChange={e => setForm(prev => ({ ...prev, manufacturer: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity in Stock</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_quantity">Minimum Stock Level</Label>
                <Input
                  id="min_quantity"
                  type="number"
                  min="0"
                  value={form.min_quantity}
                  onChange={e => setForm(prev => ({ ...prev, min_quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_cost">Unit Cost ($)</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.unit_cost}
                  onChange={e => setForm(prev => ({ ...prev, unit_cost: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retail_price">Retail Price ($)</Label>
                <Input
                  id="retail_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.retail_price}
                  onChange={e => setForm(prev => ({ ...prev, retail_price: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location">Storage Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Shelf A, Bin 3"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/gunsmith/parts')}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatePart.isPending}>
                {updatePart.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
