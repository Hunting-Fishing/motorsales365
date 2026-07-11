import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useSpecialRates, SpecialRate, RATE_CATEGORIES } from '@/hooks/fuel-delivery/useSpecialRates';

interface SpecialRatesTabProps {
  shopId: string | null;
}

export function SpecialRatesTab({ shopId }: SpecialRatesTabProps) {
  const { rates, isLoading, createRate, updateRate, deleteRate, isCreating, isUpdating } = useSpecialRates(shopId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<SpecialRate | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    rate_type: 'flat' as 'flat' | 'percentage' | 'per_gallon',
    rate_value: '',
    applies_to: [] as string[],
    start_time: '',
    end_time: '',
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      rate_type: 'flat',
      rate_value: '',
      applies_to: [],
      start_time: '',
      end_time: '',
      is_active: true,
    });
    setEditingRate(null);
  };

  const openEditDialog = (rate: SpecialRate) => {
    setEditingRate(rate);
    setFormData({
      name: rate.name,
      rate_type: rate.rate_type,
      rate_value: String(rate.rate_value),
      applies_to: rate.applies_to || [],
      start_time: rate.start_time?.slice(0, 5) || '',
      end_time: rate.end_time?.slice(0, 5) || '',
      is_active: rate.is_active,
    });
    setDialogOpen(true);
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      applies_to: prev.applies_to.includes(category)
        ? prev.applies_to.filter(c => c !== category)
        : [...prev.applies_to, category],
    }));
  };

  const handleSubmit = () => {
    if (!shopId) return;

    const rateData: Omit<SpecialRate, 'id'> = {
      shop_id: shopId,
      name: formData.name,
      rate_type: formData.rate_type,
      rate_value: parseFloat(formData.rate_value) || 0,
      applies_to: formData.applies_to,
      start_time: formData.start_time ? formData.start_time + ':00' : undefined,
      end_time: formData.end_time ? formData.end_time + ':00' : undefined,
      is_active: formData.is_active,
    };

    if (editingRate?.id) {
      updateRate({ id: editingRate.id, ...rateData });
    } else {
      createRate(rateData);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this special rate?')) {
      deleteRate(id);
    }
  };

  const formatRateValue = (rate: SpecialRate) => {
    switch (rate.rate_type) {
      case 'flat':
        return `+$${rate.rate_value.toFixed(2)}`;
      case 'percentage':
        return `+${rate.rate_value}%`;
      case 'per_gallon':
        return `+$${rate.rate_value.toFixed(2)}/gal`;
      default:
        return String(rate.rate_value);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-500" />
            <CardTitle>Special Rates</CardTitle>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Rate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRate ? 'Edit Rate' : 'Add Special Rate'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Rate Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., After Hours Premium"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rate Type</Label>
                    <Select 
                      value={formData.rate_type} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, rate_type: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat Fee ($)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="per_gallon">Per Gallon ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rate Value</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.rate_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, rate_value: e.target.value }))}
                      placeholder={formData.rate_type === 'percentage' ? '15' : '25.00'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Applies To</Label>
                  <div className="flex flex-wrap gap-2">
                    {RATE_CATEGORIES.map((cat) => (
                      <Badge
                        key={cat.value}
                        variant={formData.applies_to.includes(cat.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleCategory(cat.value)}
                      >
                        {cat.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time (optional)</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time (optional)</Label>
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label>Active</Label>
                </div>

                <Button 
                  onClick={handleSubmit} 
                  disabled={!formData.name || !formData.rate_value || isCreating || isUpdating}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingRate ? 'Update Rate' : 'Create Rate'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Configure surcharges for after-hours, weekends, holidays, and emergency deliveries
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No special rates configured</p>
            <p className="text-sm">Add rates for after-hours or emergency deliveries</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rates.map((rate) => (
              <div 
                key={rate.id} 
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  rate.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rate.name}</span>
                    <Badge variant="secondary" className="font-mono">
                      {formatRateValue(rate)}
                    </Badge>
                    {!rate.is_active && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">Inactive</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {rate.applies_to?.map((cat) => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {RATE_CATEGORIES.find(c => c.value === cat)?.label || cat}
                      </Badge>
                    ))}
                    {rate.start_time && rate.end_time && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {rate.start_time.slice(0, 5)} - {rate.end_time.slice(0, 5)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(rate)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => rate.id && handleDelete(rate.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
