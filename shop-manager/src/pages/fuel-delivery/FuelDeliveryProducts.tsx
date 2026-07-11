import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Package, ArrowLeft } from 'lucide-react';
import { useFuelDeliveryProducts, useCreateFuelDeliveryProduct } from '@/hooks/useFuelDelivery';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useFuelUnits } from '@/hooks/fuel-delivery/useFuelUnits';

export default function FuelDeliveryProducts() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: products, isLoading } = useFuelDeliveryProducts();
  const { volumeUnit } = useFuelUnits();
  const createProduct = useCreateFuelDeliveryProduct();

  const [formData, setFormData] = useState({
    product_name: '',
    product_code: '',
    fuel_type: '',
    unit_of_measure: volumeUnit === 'litres' ? 'liter' : 'gallon',
    base_price_per_unit: '',
    cost_per_unit: '',
    tax_rate: '8',
    is_taxable: true,
    minimum_order_quantity: '',
    description: ''
  });

  const filteredProducts = products?.filter(product =>
    product.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    product.product_code?.toLowerCase().includes(search.toLowerCase()) ||
    product.fuel_type?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProduct.mutateAsync({
      ...formData,
      base_price_per_unit: parseFloat(formData.base_price_per_unit) || undefined,
      cost_per_unit: parseFloat(formData.cost_per_unit) || undefined,
      tax_rate: parseFloat(formData.tax_rate) || 0,
      minimum_order_quantity: parseFloat(formData.minimum_order_quantity) || undefined
    });
    setIsDialogOpen(false);
    setFormData({
      product_name: '',
      product_code: '',
      fuel_type: '',
      unit_of_measure: volumeUnit === 'litres' ? 'liter' : 'gallon',
      base_price_per_unit: '',
      cost_per_unit: '',
      tax_rate: '8',
      is_taxable: true,
      minimum_order_quantity: '',
      description: ''
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/fuel-delivery')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Package className="h-8 w-8 text-orange-600" />
              Fuel Products
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage fuel products and pricing
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Product Name *</Label>
                    <Input
                      value={formData.product_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                      placeholder="Diesel #2"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Product Code</Label>
                    <Input
                      value={formData.product_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, product_code: e.target.value }))}
                      placeholder="DSL2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fuel Type *</Label>
                    <Select value={formData.fuel_type} onValueChange={(v) => setFormData(prev => ({ ...prev, fuel_type: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="gasoline_regular">Gasoline (Regular)</SelectItem>
                        <SelectItem value="gasoline_premium">Gasoline (Premium)</SelectItem>
                        <SelectItem value="heating_oil">Heating Oil</SelectItem>
                        <SelectItem value="propane">Propane</SelectItem>
                        <SelectItem value="kerosene">Kerosene</SelectItem>
                        <SelectItem value="biodiesel">Biodiesel</SelectItem>
                        <SelectItem value="def">DEF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit of Measure</Label>
                    <Select value={formData.unit_of_measure} onValueChange={(v) => setFormData(prev => ({ ...prev, unit_of_measure: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gallon">Gallon</SelectItem>
                        <SelectItem value="liter">Liter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Base Price per Unit</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.base_price_per_unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, base_price_per_unit: e.target.value }))}
                      placeholder="3.50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost per Unit</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost_per_unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost_per_unit: e.target.value }))}
                      placeholder="3.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: e.target.value }))}
                      placeholder="8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Order Qty</Label>
                    <Input
                      type="number"
                      value={formData.minimum_order_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, minimum_order_quantity: e.target.value }))}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <div className="flex items-center justify-between">
                      <Label>Taxable</Label>
                      <Switch
                        checked={formData.is_taxable}
                        onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_taxable: v }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Product description..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createProduct.isPending}>
                    {createProduct.isPending ? 'Creating...' : 'Add Product'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Tax Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell>{product.product_code || '-'}</TableCell>
                    <TableCell className="capitalize">{product.fuel_type?.replace('_', ' ')}</TableCell>
                    <TableCell>${product.base_price_per_unit?.toFixed(2) || '0.00'}/{product.unit_of_measure}</TableCell>
                    <TableCell>${product.cost_per_unit?.toFixed(2) || '0.00'}/{product.unit_of_measure}</TableCell>
                    <TableCell>{product.tax_rate}%</TableCell>
                    <TableCell>
                      {product.is_active ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No products found</p>
              <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                Add your first product
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
