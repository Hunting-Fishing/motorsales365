import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Droplets } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const CHEMICAL_TYPES = [
  'degreaser',
  'detergent',
  'surfactant',
  'bleach',
  'oxidizer',
  'rust_remover',
  'concrete_cleaner',
  'wood_cleaner',
  'roof_cleaner',
  'house_wash',
  'other',
];

const UNITS = ['gallons', 'liters', 'ounces', 'pounds', 'kilograms'];

export default function PowerWashingChemicalCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shopId, setShopId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('shop_id').eq('user_id', user.id).single()
        .then(({ data }) => setShopId(data?.shop_id || null));
    }
  }, [user]);

  const [formData, setFormData] = useState({
    name: '',
    chemical_type: '',
    brand: '',
    dilution_ratio: '',
    current_quantity: '',
    unit_of_measure: 'gallons',
    reorder_level: '',
    cost_per_unit: '',
    supplier: '',
    safety_notes: '',
    sds_url: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.chemical_type) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!shopId) {
      toast.error('Shop not found');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('power_washing_chemicals')
        .insert({
          shop_id: shopId,
          name: formData.name,
          chemical_type: formData.chemical_type,
          brand: formData.brand || null,
          dilution_ratio: formData.dilution_ratio || null,
          current_quantity: formData.current_quantity ? parseFloat(formData.current_quantity) : 0,
          unit_of_measure: formData.unit_of_measure,
          reorder_level: formData.reorder_level ? parseFloat(formData.reorder_level) : null,
          cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : null,
          supplier: formData.supplier || null,
          safety_notes: formData.safety_notes || null,
          sds_url: formData.sds_url || null,
          is_active: true,
        });

      if (error) throw error;
      
      toast.success('Chemical added successfully');
      navigate('/power-washing/chemicals');
    } catch (error) {
      console.error('Failed to create chemical:', error);
      toast.error('Failed to add chemical');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing/chemicals')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chemicals
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Droplets className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Add Chemical</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Chemical Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Sodium Hypochlorite 12.5%"
                required
              />
            </div>
            <div>
              <Label>Chemical Type *</Label>
              <Select value={formData.chemical_type} onValueChange={(v) => updateField('chemical_type', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CHEMICAL_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Brand</Label>
              <Input
                value={formData.brand}
                onChange={(e) => updateField('brand', e.target.value)}
                placeholder="e.g. Clorox"
              />
            </div>
            <div>
              <Label>Dilution Ratio</Label>
              <Input
                value={formData.dilution_ratio}
                onChange={(e) => updateField('dilution_ratio', e.target.value)}
                placeholder="e.g. 1:10"
              />
            </div>
            <div>
              <Label>Supplier</Label>
              <Input
                value={formData.supplier}
                onChange={(e) => updateField('supplier', e.target.value)}
                placeholder="Supplier name"
              />
            </div>
          </CardContent>
        </Card>

        {/* Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Current Quantity</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.current_quantity}
                onChange={(e) => updateField('current_quantity', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Unit of Measure</Label>
              <Select value={formData.unit_of_measure} onValueChange={(v) => updateField('unit_of_measure', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(unit => (
                    <SelectItem key={unit} value={unit}>
                      {unit.charAt(0).toUpperCase() + unit.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reorder Level</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.reorder_level}
                onChange={(e) => updateField('reorder_level', e.target.value)}
                placeholder="Minimum quantity before reorder"
              />
            </div>
            <div>
              <Label>Cost Per Unit ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost_per_unit}
                onChange={(e) => updateField('cost_per_unit', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </CardContent>
        </Card>

        {/* Safety */}
        <Card>
          <CardHeader>
            <CardTitle>Safety Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Safety Notes</Label>
              <Textarea
                value={formData.safety_notes}
                onChange={(e) => updateField('safety_notes', e.target.value)}
                placeholder="Important safety information, handling precautions..."
                rows={3}
              />
            </div>
            <div>
              <Label>SDS URL</Label>
              <Input
                type="url"
                value={formData.sds_url}
                onChange={(e) => updateField('sds_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/power-washing/chemicals')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Add Chemical
          </Button>
        </div>
      </form>
    </div>
  );
}
