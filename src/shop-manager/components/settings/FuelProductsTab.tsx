import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Fuel, Droplets } from 'lucide-react';
import { toast } from 'sonner';

interface FuelProduct {
  id: string;
  product_name: string;
  product_code: string;
  fuel_type: string;
  octane_rating: number | null;
  grade: string | null;
  category: string | null;
  base_price_per_unit: number;
  cost_per_unit: number | null;
  unit_of_measure: string;
  is_active: boolean;
  is_taxable: boolean;
  tax_rate: number;
  description: string | null;
}

const FUEL_CATEGORIES = [
  { value: 'gasoline', label: 'Gasoline' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'biodiesel', label: 'Biodiesel' },
  { value: 'propane', label: 'Propane' },
  { value: 'heating_oil', label: 'Heating Oil' },
  { value: 'kerosene', label: 'Kerosene' },
  { value: 'ethanol', label: 'Ethanol' },
  { value: 'other', label: 'Other' },
];

const FUEL_GRADES = [
  { value: 'Regular', label: 'Regular' },
  { value: 'Mid-Grade', label: 'Mid-Grade' },
  { value: 'Premium', label: 'Premium' },
  { value: 'Super Premium', label: 'Super Premium' },
  { value: 'Ultra Low Sulfur', label: 'Ultra Low Sulfur' },
  { value: 'B5', label: 'B5 (5% Bio)' },
  { value: 'B10', label: 'B10 (10% Bio)' },
  { value: 'B20', label: 'B20 (20% Bio)' },
  { value: 'B100', label: 'B100 (Pure Bio)' },
  { value: 'Standard', label: 'Standard' },
];

const OCTANE_RATINGS = [87, 89, 91, 93, 94];

const emptyProduct: Partial<FuelProduct> = {
  product_name: '',
  product_code: '',
  fuel_type: 'gasoline',
  octane_rating: null,
  grade: null,
  category: 'gasoline',
  base_price_per_unit: 0,
  cost_per_unit: null,
  unit_of_measure: 'gallon',
  is_active: true,
  is_taxable: true,
  tax_rate: 0,
  description: '',
};

export function FuelProductsTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<FuelProduct> | null>(null);
  const [formData, setFormData] = useState<Partial<FuelProduct>>(emptyProduct);

  const { data: products, isLoading } = useQuery({
    queryKey: ['fuel-products-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_delivery_products')
        .select('*')
        .order('fuel_type', { ascending: true })
        .order('octane_rating', { ascending: true, nullsFirst: false })
        .order('product_name', { ascending: true });
      
      if (error) throw error;
      return data as FuelProduct[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (product: Partial<FuelProduct>) => {
      const { data: shopData } = await supabase.from('shops').select('id').limit(1).single();
      const { error } = await supabase.from('fuel_delivery_products').insert([{
        product_name: product.product_name!,
        product_code: product.product_code!,
        fuel_type: product.fuel_type || 'gasoline',
        octane_rating: product.octane_rating,
        grade: product.grade,
        category: product.category,
        base_price_per_unit: product.base_price_per_unit || 0,
        cost_per_unit: product.cost_per_unit,
        unit_of_measure: product.unit_of_measure || 'gallon',
        is_active: product.is_active ?? true,
        is_taxable: product.is_taxable ?? true,
        tax_rate: product.tax_rate || 0,
        description: product.description,
        shop_id: shopData?.id!,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-products-settings'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-products'] });
      toast.success('Fuel product created');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create product: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...product }: Partial<FuelProduct>) => {
      const { error } = await supabase
        .from('fuel_delivery_products')
        .update(product)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-products-settings'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-products'] });
      toast.success('Fuel product updated');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update product: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fuel_delivery_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-products-settings'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-products'] });
      toast.success('Fuel product deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete product: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData(emptyProduct);
    setEditingProduct(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (product: FuelProduct) => {
    setEditingProduct(product);
    setFormData(product);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.product_name || !formData.product_code) {
      toast.error('Product name and code are required');
      return;
    }

    if (editingProduct?.id) {
      updateMutation.mutate({ ...formData, id: editingProduct.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getCategoryLabel = (category: string | null) => {
    return FUEL_CATEGORIES.find(c => c.value === category)?.label || category || 'Unknown';
  };

  const getDisplayName = (product: FuelProduct) => {
    let name = product.product_name;
    if (product.octane_rating) {
      name += ` (${product.octane_rating})`;
    }
    if (product.grade && !name.includes(product.grade)) {
      name += ` - ${product.grade}`;
    }
    return name;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              Fuel Products
            </CardTitle>
            <CardDescription>
              Manage fuel types, grades, and pricing for your delivery operations
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setFormData(emptyProduct); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Fuel Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Fuel Product' : 'Add New Fuel Product'}</DialogTitle>
                <DialogDescription>
                  Configure fuel product details including category, grade, and pricing
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product_name">Product Name *</Label>
                    <Input
                      id="product_name"
                      value={formData.product_name || ''}
                      onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                      placeholder="e.g., Regular Unleaded 87"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product_code">Product Code *</Label>
                    <Input
                      id="product_code"
                      value={formData.product_code || ''}
                      onChange={(e) => setFormData({ ...formData, product_code: e.target.value.toUpperCase() })}
                      placeholder="e.g., REG87"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category || 'gasoline'}
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        category: value, 
                        fuel_type: value,
                        octane_rating: value === 'gasoline' ? formData.octane_rating : null 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {FUEL_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.category === 'gasoline' && (
                    <div className="space-y-2">
                      <Label htmlFor="octane_rating">Octane Rating</Label>
                      <Select
                        value={formData.octane_rating?.toString() || ''}
                        onValueChange={(value) => setFormData({ ...formData, octane_rating: value ? parseInt(value) : null })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select octane" />
                        </SelectTrigger>
                        <SelectContent>
                          {OCTANE_RATINGS.map((rating) => (
                            <SelectItem key={rating} value={rating.toString()}>
                              {rating} Octane
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade</Label>
                    <Select
                      value={formData.grade || ''}
                      onValueChange={(value) => setFormData({ ...formData, grade: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {FUEL_GRADES.map((grade) => (
                          <SelectItem key={grade.value} value={grade.value}>
                            {grade.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="base_price_per_unit">Price per Unit ($)</Label>
                    <Input
                      id="base_price_per_unit"
                      type="number"
                      step="0.01"
                      value={formData.base_price_per_unit || ''}
                      onChange={(e) => setFormData({ ...formData, base_price_per_unit: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost_per_unit">Cost per Unit ($)</Label>
                    <Input
                      id="cost_per_unit"
                      type="number"
                      step="0.01"
                      value={formData.cost_per_unit || ''}
                      onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || null })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_of_measure">Unit of Measure</Label>
                    <Select
                      value={formData.unit_of_measure || 'gallon'}
                      onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gallon">Gallon</SelectItem>
                        <SelectItem value="liter">Liter</SelectItem>
                        <SelectItem value="pound">Pound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional product description"
                  />
                </div>

                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active ?? true}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_taxable"
                      checked={formData.is_taxable ?? true}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_taxable: checked })}
                    />
                    <Label htmlFor="is_taxable">Taxable</Label>
                  </div>
                  {formData.is_taxable && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                      <Input
                        id="tax_rate"
                        type="number"
                        step="0.01"
                        className="w-20"
                        value={formData.tax_rate || ''}
                        onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading products...</div>
          ) : products?.length === 0 ? (
            <div className="text-center py-8">
              <Droplets className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No fuel products configured yet.</p>
              <p className="text-sm text-muted-foreground">Click "Add Fuel Product" to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Octane/Grade</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.product_code}</Badge>
                    </TableCell>
                    <TableCell>{getCategoryLabel(product.category || product.fuel_type)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {product.octane_rating && (
                          <Badge variant="secondary">{product.octane_rating}</Badge>
                        )}
                        {product.grade && (
                          <Badge variant="outline">{product.grade}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      ${product.base_price_per_unit.toFixed(2)}/{product.unit_of_measure}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? 'default' : 'secondary'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this fuel product?')) {
                              deleteMutation.mutate(product.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
