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
import { ArrowLeft, Save, Loader2, Gauge } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const EQUIPMENT_TYPES = [
  'pressure_washer',
  'surface_cleaner',
  'hose_reel',
  'pump',
  'water_tank',
  'trailer',
  'generator',
  'accessories',
  'other',
];

const CONDITIONS = ['excellent', 'good', 'fair', 'poor'];

export default function PowerWashingEquipmentCreate() {
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
    equipment_type: '',
    brand: '',
    model: '',
    serial_number: '',
    psi_rating: '',
    gpm_rating: '',
    purchase_date: '',
    purchase_price: '',
    condition: 'good',
    next_maintenance_date: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.equipment_type) {
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
        .from('power_washing_equipment')
        .insert({
          shop_id: shopId,
          name: formData.name,
          equipment_type: formData.equipment_type,
          brand: formData.brand || null,
          model: formData.model || null,
          serial_number: formData.serial_number || null,
          psi_rating: formData.psi_rating ? parseInt(formData.psi_rating) : null,
          gpm_rating: formData.gpm_rating ? parseFloat(formData.gpm_rating) : null,
          purchase_date: formData.purchase_date || null,
          purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
          condition: formData.condition,
          next_maintenance_date: formData.next_maintenance_date || null,
          notes: formData.notes || null,
          is_active: true,
        });

      if (error) throw error;
      
      toast.success('Equipment added successfully');
      navigate('/power-washing/equipment');
    } catch (error) {
      console.error('Failed to create equipment:', error);
      toast.error('Failed to add equipment');
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
        <Button variant="ghost" onClick={() => navigate('/power-washing/equipment')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Equipment
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Gauge className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Add Equipment</h1>
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
              <Label>Equipment Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Primary Pressure Washer"
                required
              />
            </div>
            <div>
              <Label>Equipment Type *</Label>
              <Select value={formData.equipment_type} onValueChange={(v) => updateField('equipment_type', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={formData.condition} onValueChange={(v) => updateField('condition', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map(c => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Brand</Label>
              <Input
                value={formData.brand}
                onChange={(e) => updateField('brand', e.target.value)}
                placeholder="e.g. Simpson"
              />
            </div>
            <div>
              <Label>Model</Label>
              <Input
                value={formData.model}
                onChange={(e) => updateField('model', e.target.value)}
                placeholder="e.g. PowerShot 4200"
              />
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input
                value={formData.serial_number}
                onChange={(e) => updateField('serial_number', e.target.value)}
                placeholder="S/N"
              />
            </div>
            <div>
              <Label>PSI Rating</Label>
              <Input
                type="number"
                value={formData.psi_rating}
                onChange={(e) => updateField('psi_rating', e.target.value)}
                placeholder="e.g. 4000"
              />
            </div>
            <div>
              <Label>GPM Rating</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.gpm_rating}
                onChange={(e) => updateField('gpm_rating', e.target.value)}
                placeholder="e.g. 4.0"
              />
            </div>
          </CardContent>
        </Card>

        {/* Purchase & Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase & Maintenance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => updateField('purchase_date', e.target.value)}
              />
            </div>
            <div>
              <Label>Purchase Price</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => updateField('purchase_price', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Next Maintenance Date</Label>
              <Input
                type="date"
                value={formData.next_maintenance_date}
                onChange={(e) => updateField('next_maintenance_date', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Any additional notes about this equipment..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/power-washing/equipment')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Add Equipment
          </Button>
        </div>
      </form>
    </div>
  );
}
