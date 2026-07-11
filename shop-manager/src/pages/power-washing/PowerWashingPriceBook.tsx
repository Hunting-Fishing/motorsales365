import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  DollarSign,
  Plus,
  ArrowLeft,
  Edit,
  Trash2,
  Save,
  X,
  Clock,
  Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

interface PriceItem {
  id: string;
  service_name: string;
  category: string;
  description: string | null;
  unit_type: string;
  base_price: number;
  min_price: number | null;
  max_price: number | null;
  estimated_duration_minutes: number | null;
  includes_materials: boolean | null;
  is_active: boolean | null;
}

const CATEGORIES = ['Residential', 'Commercial', 'Industrial', 'Specialty'];
const UNIT_TYPES = [
  { value: 'sqft', label: 'Per Sq Ft' },
  { value: 'linear_ft', label: 'Per Linear Ft' },
  { value: 'hour', label: 'Per Hour' },
  { value: 'flat', label: 'Flat Rate' },
  { value: 'each', label: 'Each' },
];

export default function PowerWashingPriceBook() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [formData, setFormData] = useState({
    service_name: '',
    category: 'Residential',
    description: '',
    unit_type: 'sqft',
    base_price: '',
    min_price: '',
    max_price: '',
    estimated_duration_minutes: '',
    includes_materials: true,
    is_active: true,
  });

  const { data: priceItems, isLoading } = useQuery({
    queryKey: ['power-washing-price-book', filterCategory],
    queryFn: async () => {
      let query = supabase
        .from('power_washing_price_book')
        .select('*')
        .order('category', { ascending: true })
        .order('display_order', { ascending: true });
      
      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PriceItem[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: shopData } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const payload = {
        shop_id: shopData?.shop_id,
        service_name: formData.service_name,
        category: formData.category,
        description: formData.description || null,
        unit_type: formData.unit_type,
        base_price: parseFloat(formData.base_price),
        min_price: formData.min_price ? parseFloat(formData.min_price) : null,
        max_price: formData.max_price ? parseFloat(formData.max_price) : null,
        estimated_duration_minutes: formData.estimated_duration_minutes ? parseInt(formData.estimated_duration_minutes) : null,
        includes_materials: formData.includes_materials,
        is_active: formData.is_active,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('power_washing_price_book')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('power_washing_price_book')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-price-book'] });
      toast.success(editingItem ? 'Service updated' : 'Service added');
      closeDialog();
    },
    onError: () => {
      toast.error('Failed to save service');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('power_washing_price_book')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-price-book'] });
      toast.success('Service deleted');
    },
  });

  const openDialog = (item?: PriceItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        service_name: item.service_name,
        category: item.category,
        description: item.description || '',
        unit_type: item.unit_type,
        base_price: item.base_price.toString(),
        min_price: item.min_price?.toString() || '',
        max_price: item.max_price?.toString() || '',
        estimated_duration_minutes: item.estimated_duration_minutes?.toString() || '',
        includes_materials: item.includes_materials ?? true,
        is_active: item.is_active ?? true,
      });
    } else {
      setEditingItem(null);
      setFormData({
        service_name: '',
        category: 'Residential',
        description: '',
        unit_type: 'sqft',
        base_price: '',
        min_price: '',
        max_price: '',
        estimated_duration_minutes: '',
        includes_materials: true,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const groupedItems = priceItems?.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PriceItem[]>) || {};

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              Price Book
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your service pricing and estimates
            </p>
          </div>
          <div className="flex gap-3">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        </div>
      </div>

      {/* Price Book */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : priceItems && priceItems.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Layers className="h-5 w-5" />
                {category}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <Card key={item.id} className={`border-border ${!item.is_active ? 'opacity-60' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{item.service_name}</CardTitle>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openDialog(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-red-500"
                            onClick={() => deleteMutation.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-bold text-green-500">
                            ${item.base_price.toFixed(2)}
                          </span>
                          <Badge variant="outline">
                            {UNIT_TYPES.find(u => u.value === item.unit_type)?.label}
                          </Badge>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          {item.estimated_duration_minutes && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {item.estimated_duration_minutes} min
                            </Badge>
                          )}
                          {item.includes_materials && (
                            <Badge variant="secondary" className="text-xs">
                              Materials included
                            </Badge>
                          )}
                          {!item.is_active && (
                            <Badge variant="destructive" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {(item.min_price || item.max_price) && (
                          <p className="text-xs text-muted-foreground">
                            Range: ${item.min_price?.toFixed(2) || '—'} - ${item.max_price?.toFixed(2) || '—'}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="p-12 text-center">
            <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">No Services in Price Book</h3>
            <p className="text-muted-foreground mb-4">
              Add your services and pricing for quick estimates
            </p>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Service
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Service Name *</Label>
              <Input
                value={formData.service_name}
                onChange={(e) => setFormData(prev => ({ ...prev, service_name: e.target.value }))}
                placeholder="e.g., Driveway Cleaning"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit Type *</Label>
                <Select 
                  value={formData.unit_type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, unit_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Service description..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Base Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Min Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.min_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Max Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.max_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label>Est. Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.estimated_duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration_minutes: e.target.value }))}
                placeholder="60"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.includes_materials}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, includes_materials: v }))}
                />
                <Label>Includes materials</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))}
                />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={() => saveMutation.mutate()} disabled={!formData.service_name || !formData.base_price}>
                <Save className="h-4 w-4 mr-2" />
                {editingItem ? 'Update' : 'Add'} Service
              </Button>
              <Button variant="outline" onClick={closeDialog}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
