import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, ArrowLeft, Droplets, Beaker } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';
import { AddWaterProductDialog } from '@/components/water-delivery/AddWaterProductDialog';

export default function WaterDeliveryProducts() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { shopId } = useShopId();
  const { getPriceLabel } = useWaterUnits();

  const { data: products, isLoading } = useQuery({
    queryKey: ['water-delivery-products', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('water_delivery_products')
        .select('*')
        .eq('shop_id', shopId)
        .order('product_name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const filteredProducts = products?.filter(product => 
    product.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    product.water_type?.toLowerCase().includes(search.toLowerCase())
  );

  const getWaterTypeBadge = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'potable': return <Badge className="bg-blue-500">Potable</Badge>;
      case 'non-potable': return <Badge className="bg-amber-500">Non-Potable</Badge>;
      case 'reclaimed': return <Badge className="bg-green-500">Reclaimed</Badge>;
      case 'distilled': return <Badge className="bg-purple-500">Distilled</Badge>;
      case 'industrial': return <Badge className="bg-gray-500">Industrial</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/water-delivery')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Beaker className="h-8 w-8 text-cyan-600" />
              Water Products
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage water types and products
            </p>
          </div>
          <Button 
            className="bg-cyan-600 hover:bg-cyan-700"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
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
                  <TableHead>Product Name</TableHead>
                  <TableHead>Water Type</TableHead>
                  <TableHead>pH Level</TableHead>
                  <TableHead>TDS (ppm)</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="text-right">Price{getPriceLabel()}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell>{getWaterTypeBadge(product.water_type)}</TableCell>
                    <TableCell>{product.ph_level || '-'}</TableCell>
                    <TableCell>{product.tds_ppm || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.certification || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{product.grade || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${product.base_price_per_unit?.toFixed(4) || '0.00'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Droplets className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No products found</p>
              <Button variant="link" onClick={() => setAddDialogOpen(true)}>
                Add your first water product
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddWaterProductDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen} 
      />
    </div>
  );
}
