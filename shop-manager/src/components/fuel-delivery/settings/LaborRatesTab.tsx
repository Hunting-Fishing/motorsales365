import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Pencil, Trash2, Loader2, Star } from 'lucide-react';
import { useLaborRates, LaborRate } from '@/hooks/fuel-delivery/useLaborRates';

interface LaborRatesTabProps {
  shopId: string | null;
}

export function LaborRatesTab({ shopId }: LaborRatesTabProps) {
  const { rates, isLoading, createRate, updateRate, deleteRate, setDefaultRate, isCreating, isUpdating } = useLaborRates(shopId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<LaborRate | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hourly_rate: '',
    is_default: false,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      hourly_rate: '',
      is_default: false,
      is_active: true,
    });
    setEditingRate(null);
  };

  const openEditDialog = (rate: LaborRate) => {
    setEditingRate(rate);
    setFormData({
      name: rate.name,
      description: rate.description || '',
      hourly_rate: String(rate.hourly_rate),
      is_default: rate.is_default,
      is_active: rate.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!shopId) return;

    const rateData: Omit<LaborRate, 'id'> = {
      shop_id: shopId,
      name: formData.name,
      description: formData.description || undefined,
      hourly_rate: parseFloat(formData.hourly_rate) || 0,
      is_default: formData.is_default,
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
    if (confirm('Delete this labor rate?')) {
      deleteRate(id);
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
            <Clock className="h-5 w-5 text-orange-500" />
            <CardTitle>Labor Rates</CardTitle>
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
                <DialogTitle>{editingRate ? 'Edit Rate' : 'Add Labor Rate'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Rate Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Standard, Senior Tech, Emergency"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description of when this rate applies"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hourly Rate ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                    placeholder="75.00"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_default}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                    />
                    <Label>Default Rate</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label>Active</Label>
                  </div>
                </div>

                <Button 
                  onClick={handleSubmit} 
                  disabled={!formData.name || !formData.hourly_rate || isCreating || isUpdating}
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
          Configure hourly labor rates for different service types
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No labor rates configured</p>
            <p className="text-sm">Add rates for different technician levels or service types</p>
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
                    {rate.is_default && (
                      <Badge className="bg-orange-500">
                        <Star className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                    {!rate.is_active && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">Inactive</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    ${rate.hourly_rate.toFixed(2)}/hour
                    {rate.description && ` • ${rate.description}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!rate.is_default && rate.is_active && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => rate.id && setDefaultRate(rate.id)}
                    >
                      Set Default
                    </Button>
                  )}
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
