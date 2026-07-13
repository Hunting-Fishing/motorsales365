import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  FileText, 
  Truck, 
  DollarSign, 
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useFuelPurchases, useCreateFuelPurchase, useReceiveFuelPurchase, FuelPurchase } from '@/hooks/fuel-delivery/useFuelPurchases';
import { useFuelProducts } from '@/hooks/useFuelProducts';
import { useFuelDeliveryTrucks } from '@/hooks/useFuelDelivery';
import { useFuelUnits } from '@/hooks/fuel-delivery/useFuelUnits';

export default function FuelDeliveryPurchases() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [receiveDialogPurchase, setReceiveDialogPurchase] = useState<FuelPurchase | null>(null);
  
  const { data: purchases, isLoading } = useFuelPurchases();
  const { data: products } = useFuelProducts();
  const { data: trucks } = useFuelDeliveryTrucks();
  const createPurchase = useCreateFuelPurchase();
  const receivePurchase = useReceiveFuelPurchase();
  const { formatVolume, getUnitLabel, convertFromGallons, convertToGallons } = useFuelUnits();

  const [formData, setFormData] = useState({
    vendor_name: '',
    vendor_account_number: '',
    bol_number: '',
    po_number: '',
    product_id: '',
    quantity: '',
    price_per_gallon: '',
    taxes: '',
    fees: '',
    purchase_date: new Date().toISOString().split('T')[0],
    terminal_name: '',
    terminal_location: '',
    rack_price: '',
    payment_due_date: '',
    notes: ''
  });

  const [receiveFormData, setReceiveFormData] = useState({
    actual_gallons_received: '',
    meter_start_reading: '',
    meter_end_reading: '',
    truck_id: '',
    compartment_id: ''
  });

  const filteredPurchases = purchases?.filter(purchase =>
    purchase.bol_number?.toLowerCase().includes(search.toLowerCase()) ||
    purchase.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
    purchase.po_number?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const quantityInGallons = convertToGallons(parseFloat(formData.quantity) || 0);
    
    await createPurchase.mutateAsync({
      vendor_name: formData.vendor_name,
      vendor_account_number: formData.vendor_account_number || undefined,
      bol_number: formData.bol_number,
      po_number: formData.po_number || undefined,
      product_id: formData.product_id || undefined,
      quantity_gallons: quantityInGallons,
      price_per_gallon: parseFloat(formData.price_per_gallon) || 0,
      taxes: parseFloat(formData.taxes) || undefined,
      fees: parseFloat(formData.fees) || undefined,
      total_cost: (quantityInGallons * (parseFloat(formData.price_per_gallon) || 0)) + 
                  (parseFloat(formData.taxes) || 0) + 
                  (parseFloat(formData.fees) || 0),
      purchase_date: formData.purchase_date,
      terminal_name: formData.terminal_name || undefined,
      terminal_location: formData.terminal_location || undefined,
      rack_price: parseFloat(formData.rack_price) || undefined,
      payment_due_date: formData.payment_due_date || undefined,
      notes: formData.notes || undefined
    });

    setIsDialogOpen(false);
    resetForm();
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveDialogPurchase) return;

    const actualGallons = convertToGallons(parseFloat(receiveFormData.actual_gallons_received) || 0);

    await receivePurchase.mutateAsync({
      id: receiveDialogPurchase.id,
      actual_gallons_received: actualGallons,
      meter_start_reading: parseFloat(receiveFormData.meter_start_reading) || undefined,
      meter_end_reading: parseFloat(receiveFormData.meter_end_reading) || undefined,
      truck_id: receiveFormData.truck_id || undefined,
      compartment_id: receiveFormData.compartment_id || undefined
    });

    setReceiveDialogPurchase(null);
    setReceiveFormData({
      actual_gallons_received: '',
      meter_start_reading: '',
      meter_end_reading: '',
      truck_id: '',
      compartment_id: ''
    });
  };

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      vendor_account_number: '',
      bol_number: '',
      po_number: '',
      product_id: '',
      quantity: '',
      price_per_gallon: '',
      taxes: '',
      fees: '',
      purchase_date: new Date().toISOString().split('T')[0],
      terminal_name: '',
      terminal_location: '',
      rack_price: '',
      payment_due_date: '',
      notes: ''
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'in_transit':
        return <Badge variant="default" className="bg-blue-500"><Truck className="h-3 w-3 mr-1" />In Transit</Badge>;
      case 'received':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Received</Badge>;
      case 'reconciled':
        return <Badge variant="default" className="bg-emerald-600"><CheckCircle className="h-3 w-3 mr-1" />Reconciled</Badge>;
      case 'disputed':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Disputed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'unpaid':
        return <Badge variant="outline" className="text-amber-600 border-amber-600">Unpaid</Badge>;
      case 'partial':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Partial</Badge>;
      case 'paid':
        return <Badge variant="outline" className="text-green-600 border-green-600">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProductDisplay = (purchase: FuelPurchase) => {
    if (!purchase.product) return '-';
    let display = purchase.product.product_name;
    if (purchase.product.octane_rating) {
      display += ` (${purchase.product.octane_rating})`;
    }
    return display;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/fuel-delivery')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Fuel Purchases / BOL
            </h1>
            <p className="text-muted-foreground">Track inbound fuel purchases and bills of lading</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
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
                <p className="text-sm text-muted-foreground">Unpaid</p>
                <p className="text-2xl font-bold">
                  ${purchases?.filter(p => p.payment_status === 'unpaid')
                    .reduce((sum, p) => sum + (p.total_cost || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
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
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-mono font-medium">
                        {purchase.bol_number}
                      </TableCell>
                      <TableCell>
                        {format(new Date(purchase.purchase_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{purchase.vendor_name}</TableCell>
                      <TableCell>{getProductDisplay(purchase)}</TableCell>
                      <TableCell className="text-right">
                        {formatVolume(purchase.quantity_gallons, 0)}
                        {purchase.variance_gallons !== null && purchase.variance_gallons !== 0 && (
                          <span className={`text-xs ml-1 ${purchase.variance_gallons > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ({purchase.variance_gallons > 0 ? '+' : ''}{formatVolume(purchase.variance_gallons, 0)})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${purchase.total_cost?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                      <TableCell>{getPaymentBadge(purchase.payment_status)}</TableCell>
                      <TableCell>
                        {purchase.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReceiveDialogPurchase(purchase);
                              setReceiveFormData({
                                actual_gallons_received: convertFromGallons(purchase.quantity_gallons).toString(),
                                meter_start_reading: '',
                                meter_end_reading: '',
                                truck_id: '',
                                compartment_id: ''
                              });
                            }}
                          >
                            Receive
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Purchase Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Record Fuel Purchase / BOL
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bol_number">BOL Number *</Label>
                <Input
                  id="bol_number"
                  value={formData.bol_number}
                  onChange={(e) => setFormData({ ...formData, bol_number: e.target.value })}
                  placeholder="e.g., BOL-2024-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po_number">PO Number</Label>
                <Input
                  id="po_number"
                  value={formData.po_number}
                  onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor_name">Vendor Name *</Label>
                <Input
                  id="vendor_name"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  placeholder="e.g., Shell, Exxon"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor_account">Account #</Label>
                <Input
                  id="vendor_account"
                  value={formData.vendor_account_number}
                  onChange={(e) => setFormData({ ...formData, vendor_account_number: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product_id">Product</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.product_name}
                        {product.octane_rating ? ` (${product.octane_rating})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Purchase Date *</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity ({getUnitLabel()}) *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_per_gallon">Price/Gal *</Label>
                <Input
                  id="price_per_gallon"
                  type="number"
                  step="0.0001"
                  value={formData.price_per_gallon}
                  onChange={(e) => setFormData({ ...formData, price_per_gallon: e.target.value })}
                  placeholder="0.0000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rack_price">Rack Price</Label>
                <Input
                  id="rack_price"
                  type="number"
                  step="0.0001"
                  value={formData.rack_price}
                  onChange={(e) => setFormData({ ...formData, rack_price: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxes">Taxes</Label>
                <Input
                  id="taxes"
                  type="number"
                  step="0.01"
                  value={formData.taxes}
                  onChange={(e) => setFormData({ ...formData, taxes: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fees">Fees</Label>
                <Input
                  id="fees"
                  type="number"
                  step="0.01"
                  value={formData.fees}
                  onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="terminal_name">Terminal Name</Label>
                <Input
                  id="terminal_name"
                  value={formData.terminal_name}
                  onChange={(e) => setFormData({ ...formData, terminal_name: e.target.value })}
                  placeholder="e.g., Marathon Terminal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terminal_location">Terminal Location</Label>
                <Input
                  id="terminal_location"
                  value={formData.terminal_location}
                  onChange={(e) => setFormData({ ...formData, terminal_location: e.target.value })}
                  placeholder="e.g., Detroit, MI"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_due_date">Payment Due Date</Label>
              <Input
                id="payment_due_date"
                type="date"
                value={formData.payment_due_date}
                onChange={(e) => setFormData({ ...formData, payment_due_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPurchase.isPending}>
                {createPurchase.isPending ? 'Saving...' : 'Record Purchase'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={!!receiveDialogPurchase} onOpenChange={(open) => !open && setReceiveDialogPurchase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Receive Fuel - BOL #{receiveDialogPurchase?.bol_number}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReceive} className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Expected quantity:</p>
              <p className="text-lg font-medium">
                {receiveDialogPurchase && formatVolume(receiveDialogPurchase.quantity_gallons, 0)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual_gallons">Actual Quantity Received ({getUnitLabel()}) *</Label>
              <Input
                id="actual_gallons"
                type="number"
                step="0.01"
                value={receiveFormData.actual_gallons_received}
                onChange={(e) => setReceiveFormData({ ...receiveFormData, actual_gallons_received: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meter_start">Meter Start</Label>
                <Input
                  id="meter_start"
                  type="number"
                  value={receiveFormData.meter_start_reading}
                  onChange={(e) => setReceiveFormData({ ...receiveFormData, meter_start_reading: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meter_end">Meter End</Label>
                <Input
                  id="meter_end"
                  type="number"
                  value={receiveFormData.meter_end_reading}
                  onChange={(e) => setReceiveFormData({ ...receiveFormData, meter_end_reading: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="truck_id">Loaded to Truck</Label>
              <Select
                value={receiveFormData.truck_id}
                onValueChange={(value) => setReceiveFormData({ ...receiveFormData, truck_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select truck (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {trucks?.map((truck) => (
                    <SelectItem key={truck.id} value={truck.id}>
                      {truck.truck_number} - {truck.make} {truck.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReceiveDialogPurchase(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={receivePurchase.isPending}>
                {receivePurchase.isPending ? 'Saving...' : 'Mark as Received'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
