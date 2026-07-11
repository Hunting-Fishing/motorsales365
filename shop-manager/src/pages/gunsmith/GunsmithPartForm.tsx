import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Package, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCreateGunsmithPart } from '@/hooks/useGunsmith';

const CATEGORIES = [
  'Springs', 'Pins', 'Screws', 'Triggers', 'Hammers', 'Sears',
  'Barrels', 'Stocks', 'Grips', 'Sights', 'Magazines', 'Bolts',
  'Firing Pins', 'Extractors', 'Ejectors', 'Safety Parts', 'Other'
];

export default function GunsmithPartForm() {
  const navigate = useNavigate();
  const createPart = useCreateGunsmithPart();
  
  const [formData, setFormData] = useState({
    part_number: '',
    name: '',
    category: '',
    manufacturer: '',
    quantity: '0',
    min_quantity: '5',
    unit_cost: '',
    retail_price: '',
    location: ''
  });

  const handleSubmit = () => {
    createPart.mutate({
      part_number: formData.part_number || undefined,
      name: formData.name,
      category: formData.category || undefined,
      manufacturer: formData.manufacturer || undefined,
      quantity: parseInt(formData.quantity) || 0,
      min_quantity: parseInt(formData.min_quantity) || 5,
      unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : undefined,
      retail_price: formData.retail_price ? parseFloat(formData.retail_price) : undefined,
      location: formData.location || undefined
    }, {
      onSuccess: () => navigate('/gunsmith/parts')
    });
  };

  const isValid = formData.name;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gunsmith/parts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Package className="h-8 w-8 text-amber-600" />
              Add Part
            </h1>
            <p className="text-muted-foreground mt-1">Add a new part to inventory</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Part Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Part Number</Label>
                <Input
                  value={formData.part_number}
                  onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                  placeholder="e.g., REM-870-SP1"
                />
              </div>
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Part name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Manufacturer</Label>
                <Input
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="e.g., Remington, Wolff"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity in Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
              <div>
                <Label>Minimum Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.min_quantity}
                  onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unit Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Retail Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.retail_price}
                  onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label>Storage Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Bin A-3, Drawer 2"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" onClick={() => navigate('/gunsmith/parts')}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || createPart.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createPart.isPending ? 'Adding...' : 'Add Part'}
          </Button>
        </div>
      </div>
    </div>
  );
}
