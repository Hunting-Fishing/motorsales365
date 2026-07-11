import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  FileText, 
  Truck, 
  DollarSign, 
  CheckCircle,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';

interface WaterPurchase {
  id: string;
  vendor_name: string;
  bol_number: string;
  po_number: string | null;
  product_id: string | null;
  quantity_gallons: number;
  price_per_gallon: number;
  total_cost: number;
  purchase_date: string;
  status: string;
  payment_status: string;
  notes: string | null;
  water_delivery_products?: { product_name: string };
}

export default function WaterDeliveryPurchases() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { formatVolume, getVolumeLabel, convertToGallons } = useWaterUnits();

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['water-delivery-purchases'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_purchases')
        .select(`
          *,
          water_delivery_products(product_name)
        `)
        .order('purchase_date', { ascending: false });
      if (error) throw error;
      return data as WaterPurchase[];
    }
  });

  const { data: products } = useQuery({
    queryKey: ['water-delivery-products'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_products')
        .select('id, product_name')
        .order('product_name');
      if (error) throw error;
      return data;
    }
  });

  const createPurchase = useMutation({
    mutationFn: async (purchaseData: any) => {
      const { data: profile } = await supabase.from('profiles').select('shop_id').single();
      const { error } = await (supabase as any)
        .from('water_delivery_purchases')
        .insert({ ...purchaseData, shop_id: profile?.shop_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-purchases'] });
      toast.success('Purchase recorded');
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const [formData, setFormData] = useState({
    vendor_name: '',
    bol_number: '',
    po_number: '',
    product_id: '',
    quantity: '',
    price_per_gallon: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const filteredPurchases = purchases?.filter(purchase =>
    purchase.bol_number?.toLowerCase().includes(search.toLowerCase()) ||
    purchase.vendor_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const quantityInGallons = convertToGallons(parseFloat(formData.quantity) || 0);
    const pricePerGallon = parseFloat(formData.price_per_gallon) || 0;
    
    await createPurchase.mutateAsync({
      vendor_name: formData.vendor_name,
      bol_number: formData.bol_number,
      po_number: formData.po_number || null,
      product_id: formData.product_id || null,
      quantity_gallons: quantityInGallons,
      price_per_gallon: pricePerGallon,
      total_cost: quantityInGallons * pricePerGallon,
      purchase_date: formData.purchase_date,
      notes: formData.notes || null,
      status: 'pending',
      payment_status: 'unpaid'
    });
  };

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      bol_number: '',
      po_number: '',
      product_id: '',
      quantity: '',
      price_per_gallon: '',
      purchase_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'in_transit':
        return <Badge className="bg-blue-500"><Truck className="h-3 w-3 mr-1" />In Transit</Badge>;
      case 'received':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Received</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'unpaid':
        return <Badge variant="outline" className="text-amber-600 border-amber-600">Unpaid</Badge>;
      case 'paid':
        return <Badge variant="outline" className="text-green-600 border-green-600">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/water-delivery')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-cyan-600" />
              Water Purchases / BOL
            </h1>
            <p className="text-muted-foreground">Track inbound water purchases and bills of lading</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {purchases?.filter(p => p.status === 'pending').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Truck className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold">
                  {purchases?.filter(p => p.status === 'in_transit').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Received</p>
                <p className="text-2xl font-bold">
                  {purchases?.filter(p => p.status === 'received').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unpaid Total</p>
                <p className="text-2xl font-bold">
                  ${purchases?.filter(p => p.payment_status === 'unpaid')
                    .reduce((sum, p) => sum + (p.total_cost || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle>Purchase Records</CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search BOL, vendor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Purchase
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !filteredPurchases?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No purchase records found</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Record First Purchase
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>BOL #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-mono font-medium">{purchase.bol_number}</TableCell>
                      <TableCell>{format(new Date(purchase.purchase_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{purchase.vendor_name}</TableCell>
                      <TableCell>{purchase.water_delivery_products?.product_name || '-'}</TableCell>
                      <TableCell className="text-right">{formatVolume(purchase.quantity_gallons, 0)}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${purchase.total_cost?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                      <TableCell>{getPaymentBadge(purchase.payment_status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Record Water Purchase / BOL
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>BOL Number *</Label>
                <Input
                  value={formData.bol_number}
                  onChange={(e) => setFormData({ ...formData, bol_number: e.target.value })}
                  placeholder="e.g., BOL-2024-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>PO Number</Label>
                <Input
                  value={formData.po_number}
                  onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor Name *</Label>
                <Input
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  placeholder="e.g., Municipal Water"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Product</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantity ({getVolumeLabel()}) *</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Price per {getVolumeLabel(false)} *</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.price_per_gallon}
                  onChange={(e) => setFormData({ ...formData, price_per_gallon: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Purchase Date *</Label>
                <Input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createPurchase.isPending}>
                {createPurchase.isPending ? 'Recording...' : 'Record Purchase'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
