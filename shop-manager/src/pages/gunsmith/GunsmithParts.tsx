import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Plus, 
  Search,
  ArrowLeft,
  AlertTriangle,
  ShoppingCart,
  Truck,
  DollarSign,
  Calendar,
  Hash,
  Loader2,
  User,
  UserPlus
} from 'lucide-react';
import { QuickAddCustomerDialog } from '@/components/gunsmith/QuickAddCustomerDialog';
import { useGunsmithParts, useCreateGunsmithPart } from '@/hooks/useGunsmith';
import { useGunsmithPendingPartOrders, useCreateJobPartOrder } from '@/hooks/useGunsmithJobPartOrders';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function GunsmithParts() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'inventory' | 'order'>('inventory');
  const [formData, setFormData] = useState({
    part_number: '',
    name: '',
    description: '',
    category: '',
    manufacturer: '',
    quantity: '',
    min_quantity: '',
    unit_cost: '',
    markup_percent: 30,
    suggested_retail: '',
    retail_price: '',
    location: '',
    supplier: ''
  });
  const [inventoryPriceWarningAck, setInventoryPriceWarningAck] = useState(false);
  const [orderFormData, setOrderFormData] = useState({
    customer_id: '',
    job_id: '',
    part_number: '',
    part_name: '',
    supplier: '',
    supplier_contact: '',
    quantity_ordered: 1,
    unit_cost: '',
    markup_percent: 30,
    suggested_retail: '',
    expected_date: '',
    notes: '',
  });
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [acknowledgedPriceWarning, setAcknowledgedPriceWarning] = useState(false);
  
  const { data: parts, isLoading } = useGunsmithParts();
  const { data: pendingOrders } = useGunsmithPendingPartOrders();
  const createPart = useCreateGunsmithPart();
  const createOrder = useCreateJobPartOrder();

  // Fetch customers for order form
  const { data: customers, refetch: refetchCustomers } = useQuery({
    queryKey: ['customers-for-order'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch jobs for the order form dropdown (filtered by customer if selected)
  const { data: jobs } = useQuery({
    queryKey: ['gunsmith-jobs-for-order', orderFormData.customer_id],
    queryFn: async () => {
      let query = (supabase as any)
        .from('gunsmith_jobs')
        .select('id, job_number, customer_id, customers(first_name, last_name), gunsmith_firearms(make, model)')
        .in('status', ['pending', 'in_progress', 'waiting_parts'])
        .order('created_at', { ascending: false });
      
      // Filter by customer if one is selected
      if (orderFormData.customer_id) {
        query = query.eq('customer_id', orderFormData.customer_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleCustomerCreated = (customerId: string) => {
    refetchCustomers();
    setOrderFormData({ ...orderFormData, customer_id: customerId, job_id: '' });
  };

  const filteredParts = parts?.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockParts = parts?.filter(p => p.quantity <= p.min_quantity) || [];

  const handleSubmit = () => {
    createPart.mutate({
      part_number: formData.part_number || undefined,
      name: formData.name,
      category: formData.category || undefined,
      manufacturer: formData.manufacturer || undefined,
      quantity: formData.quantity ? parseInt(formData.quantity) : 0,
      min_quantity: formData.min_quantity ? parseInt(formData.min_quantity) : 0,
      unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : undefined,
      retail_price: formData.retail_price ? parseFloat(formData.retail_price) : undefined,
      location: formData.location || undefined
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFormData({
          part_number: '', name: '', description: '', category: '',
          manufacturer: '', quantity: '', min_quantity: '', unit_cost: '',
          markup_percent: 30, suggested_retail: '',
          retail_price: '', location: '', supplier: ''
        });
        setInventoryPriceWarningAck(false);
      }
    });
  };

  const handleOrderSubmit = async () => {
    // Require customer and part info
    if (!orderFormData.customer_id || !orderFormData.part_number || !orderFormData.part_name) return;
    
    await createOrder.mutateAsync({
      job_id: orderFormData.job_id || undefined,
      customer_id: orderFormData.customer_id,
      part_number: orderFormData.part_number,
      part_name: orderFormData.part_name,
      supplier: orderFormData.supplier || undefined,
      supplier_contact: orderFormData.supplier_contact || undefined,
      quantity_ordered: orderFormData.quantity_ordered,
      unit_cost: orderFormData.unit_cost ? parseFloat(orderFormData.unit_cost) : undefined,
      expected_date: orderFormData.expected_date || undefined,
      notes: orderFormData.notes || undefined,
    });

    setIsDialogOpen(false);
    setOrderFormData({
      customer_id: '',
      job_id: '',
      part_number: '',
      part_name: '',
      supplier: '',
      supplier_contact: '',
      quantity_ordered: 1,
      unit_cost: '',
      markup_percent: 30,
      suggested_retail: '',
      expected_date: '',
      notes: '',
    });
    setAcknowledgedPriceWarning(false);
  };

  const unitCostNum = orderFormData.unit_cost ? parseFloat(orderFormData.unit_cost) : 0;
  const suggestedRetailNum = orderFormData.suggested_retail ? parseFloat(orderFormData.suggested_retail) : 0;
  const retailPrice = unitCostNum * (1 + orderFormData.markup_percent / 100);
  const totalCost = unitCostNum * orderFormData.quantity_ordered;
  const totalRetail = retailPrice * orderFormData.quantity_ordered;
  const exceedsSuggestedRetail = suggestedRetailNum > 0 && retailPrice > suggestedRetailNum;

  // Inventory form calculations
  const invUnitCost = formData.unit_cost ? parseFloat(formData.unit_cost) : 0;
  const invSuggestedRetail = formData.suggested_retail ? parseFloat(formData.suggested_retail) : 0;
  const invCalculatedRetail = invUnitCost * (1 + formData.markup_percent / 100);
  const invExceedsMSRP = invSuggestedRetail > 0 && invCalculatedRetail > invSuggestedRetail;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('order') === '1') {
      setDialogMode('order');
      setIsDialogOpen(true);
    }
  }, [location.search]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gunsmith')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Package className="h-8 w-8 text-amber-600" />
              Parts Inventory
            </h1>
            <p className="text-muted-foreground mt-1">Manage gunsmith parts and supplies</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/gunsmith/parts-on-order">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Parts on Order
              {pendingOrders && pendingOrders.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingOrders.length}
                </Badge>
              )}
            </Link>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Part
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-amber-600" />
                  Add Part
                </DialogTitle>
                <DialogDescription>
                  Add a part to inventory or order for a specific job
                </DialogDescription>
              </DialogHeader>
              
              <Tabs value={dialogMode} onValueChange={(v) => setDialogMode(v as 'inventory' | 'order')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="inventory" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Add to Inventory
                  </TabsTrigger>
                  <TabsTrigger value="order" className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Order for Job
                  </TabsTrigger>
                </TabsList>

                {/* Add to Inventory Tab */}
                <TabsContent value="inventory" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Part Number</Label>
                      <Input
                        value={formData.part_number}
                        onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Input
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Springs, Triggers"
                      />
                    </div>
                    <div>
                      <Label>Manufacturer</Label>
                      <Input
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Min Quantity</Label>
                      <Input
                        type="number"
                        value={formData.min_quantity}
                        onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Pricing Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      Pricing
                    </div>

                    {/* Cost & MSRP Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Unit Cost</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.unit_cost}
                            onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                            placeholder="0.00"
                            className="pl-7 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Suggested Retail (MSRP)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.suggested_retail}
                            onChange={(e) => {
                              setFormData({ ...formData, suggested_retail: e.target.value });
                              setInventoryPriceWarningAck(false);
                            }}
                            placeholder="0.00"
                            className="pl-7 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Markup Row */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Markup %</Label>
                        <span className="text-xs font-medium text-amber-600">{formData.markup_percent}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={formData.markup_percent}
                          onChange={(e) => {
                            const newMarkup = parseInt(e.target.value);
                            const newRetail = invUnitCost * (1 + newMarkup / 100);
                            setFormData({ 
                              ...formData, 
                              markup_percent: newMarkup,
                              retail_price: newRetail > 0 ? newRetail.toFixed(2) : ''
                            });
                            setInventoryPriceWarningAck(false);
                          }}
                          className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-600"
                        />
                        <Input
                          type="number"
                          min="0"
                          max="200"
                          value={formData.markup_percent}
                          onChange={(e) => {
                            const newMarkup = parseInt(e.target.value) || 0;
                            const newRetail = invUnitCost * (1 + newMarkup / 100);
                            setFormData({ 
                              ...formData, 
                              markup_percent: newMarkup,
                              retail_price: newRetail > 0 ? newRetail.toFixed(2) : ''
                            });
                            setInventoryPriceWarningAck(false);
                          }}
                          className="w-20 text-sm text-center"
                        />
                      </div>
                    </div>

                    {/* Retail Row */}
                    <div className="space-y-2">
                      <Label className="text-xs">Your Retail Price</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.retail_price}
                          onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
                          placeholder="0.00"
                          className={`pl-7 text-sm ${invExceedsMSRP ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        />
                        {invExceedsMSRP && (
                          <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>

                    {/* Price Exceeds MSRP Warning */}
                    {invExceedsMSRP && !inventoryPriceWarningAck && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium text-red-700">Price exceeds Suggested Retail</p>
                            <p className="text-red-600/80 text-xs mt-1">
                              Your retail price (${invCalculatedRetail.toFixed(2)}) is ${(invCalculatedRetail - invSuggestedRetail).toFixed(2)} above the MSRP (${invSuggestedRetail.toFixed(2)}).
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setInventoryPriceWarningAck(true)}
                          className="w-full text-xs border-red-500/30 text-red-700 hover:bg-red-500/10"
                        >
                          I understand, continue with this price
                        </Button>
                      </div>
                    )}

                    {invExceedsMSRP && inventoryPriceWarningAck && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        Pricing above MSRP acknowledged
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Shelf A-3"
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleSubmit}
                    disabled={!formData.name || (invExceedsMSRP && !inventoryPriceWarningAck) || createPart.isPending}
                  >
                    {createPart.isPending ? 'Adding...' : 'Add to Inventory'}
                  </Button>
                </TabsContent>

                {/* Order for Job Tab */}
                <TabsContent value="order" className="space-y-4 mt-4">
                  {/* Customer Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      Customer *
                    </Label>
                    <div className="flex gap-2">
                      <Select 
                        value={orderFormData.customer_id} 
                        onValueChange={(v) => setOrderFormData({ ...orderFormData, customer_id: v, job_id: '' })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select a customer..." />
                        </SelectTrigger>
                        <SelectContent>
                          {customers?.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.first_name} {customer.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsAddCustomerOpen(true)}
                        className="shrink-0 border-amber-600/30 text-amber-600 hover:bg-amber-600/10"
                        title="Add new customer"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Job Selection (optional, filtered by customer) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Hash className="h-3 w-3" />
                      Link to Job <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <Select 
                      value={orderFormData.job_id} 
                      onValueChange={(v) => setOrderFormData({ ...orderFormData, job_id: v })}
                      disabled={!orderFormData.customer_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={orderFormData.customer_id ? "Select a job or leave empty..." : "Select a customer first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs?.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            No active jobs for this customer
                          </div>
                        ) : (
                          jobs?.map((job: any) => (
                            <SelectItem key={job.id} value={job.id}>
                              {job.job_number}
                              {job.gunsmith_firearms && ` - ${job.gunsmith_firearms.make} ${job.gunsmith_firearms.model}`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {orderFormData.customer_id && !orderFormData.job_id && (
                      <p className="text-xs text-muted-foreground">
                        Parts can be ordered without linking to a specific job
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Part Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Package className="h-4 w-4" />
                      Part Details
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Part Number *</Label>
                        <Input
                          value={orderFormData.part_number}
                          onChange={(e) => setOrderFormData({ ...orderFormData, part_number: e.target.value })}
                          placeholder="GLK-19-TB"
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label className="text-xs">Part Name *</Label>
                        <Input
                          value={orderFormData.part_name}
                          onChange={(e) => setOrderFormData({ ...orderFormData, part_name: e.target.value })}
                          placeholder="Glock 19 Trigger Bar"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={orderFormData.quantity_ordered}
                        onChange={(e) => setOrderFormData({ ...orderFormData, quantity_ordered: parseInt(e.target.value) || 1 })}
                        className="w-24 text-sm"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Supplier Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Truck className="h-4 w-4" />
                      Supplier
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Supplier Name</Label>
                        <Input
                          value={orderFormData.supplier}
                          onChange={(e) => setOrderFormData({ ...orderFormData, supplier: e.target.value })}
                          placeholder="Brownells"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Order # / Contact</Label>
                        <Input
                          value={orderFormData.supplier_contact}
                          onChange={(e) => setOrderFormData({ ...orderFormData, supplier_contact: e.target.value })}
                          placeholder="ORD-12345"
                          className="text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Pricing */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      Pricing
                    </div>
                    
                    {/* Cost & MSRP Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Unit Cost</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={orderFormData.unit_cost}
                            onChange={(e) => setOrderFormData({ ...orderFormData, unit_cost: e.target.value })}
                            placeholder="0.00"
                            className="pl-7 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Suggested Retail (MSRP)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={orderFormData.suggested_retail}
                            onChange={(e) => {
                              setOrderFormData({ ...orderFormData, suggested_retail: e.target.value });
                              setAcknowledgedPriceWarning(false);
                            }}
                            placeholder="0.00"
                            className="pl-7 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Markup Row */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Markup %</Label>
                        <span className="text-xs font-medium text-amber-600">{orderFormData.markup_percent}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={orderFormData.markup_percent}
                          onChange={(e) => {
                            setOrderFormData({ ...orderFormData, markup_percent: parseInt(e.target.value) });
                            setAcknowledgedPriceWarning(false);
                          }}
                          className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-600"
                        />
                        <Input
                          type="number"
                          min="0"
                          max="200"
                          value={orderFormData.markup_percent}
                          onChange={(e) => {
                            setOrderFormData({ ...orderFormData, markup_percent: parseInt(e.target.value) || 0 });
                            setAcknowledgedPriceWarning(false);
                          }}
                          className="w-20 text-sm text-center"
                        />
                      </div>
                    </div>

                    {/* Retail Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Your Retail Price</Label>
                        <div className={`h-9 flex items-center px-3 rounded-md text-sm font-medium ${
                          exceedsSuggestedRetail 
                            ? 'bg-red-500/10 border border-red-500/30 text-red-700' 
                            : 'bg-green-500/10 border border-green-500/20 text-green-700'
                        }`}>
                          ${retailPrice.toFixed(2)}
                          {exceedsSuggestedRetail && (
                            <AlertTriangle className="h-3 w-3 ml-auto" />
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Total Retail (Ã—{orderFormData.quantity_ordered})</Label>
                        <div className="h-9 flex items-center px-3 bg-amber-500/10 rounded-md text-sm font-bold text-amber-600">
                          ${totalRetail.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Price Exceeds MSRP Warning */}
                    {exceedsSuggestedRetail && !acknowledgedPriceWarning && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium text-red-700">Price exceeds Suggested Retail</p>
                            <p className="text-red-600/80 text-xs mt-1">
                              Your retail price (${retailPrice.toFixed(2)}) is ${(retailPrice - suggestedRetailNum).toFixed(2)} above the manufacturer's suggested retail price (${suggestedRetailNum.toFixed(2)}).
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setAcknowledgedPriceWarning(true)}
                          className="w-full text-xs border-red-500/30 text-red-700 hover:bg-red-500/10"
                        >
                          I understand, continue with this price
                        </Button>
                      </div>
                    )}

                    {exceedsSuggestedRetail && acknowledgedPriceWarning && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        Pricing above MSRP acknowledged
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Timing */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Timing & Notes
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Expected Arrival</Label>
                      <Input
                        type="date"
                        value={orderFormData.expected_date}
                        onChange={(e) => setOrderFormData({ ...orderFormData, expected_date: e.target.value })}
                        className="w-48 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Notes</Label>
                      <Textarea
                        value={orderFormData.notes}
                        onChange={(e) => setOrderFormData({ ...orderFormData, notes: e.target.value })}
                        placeholder="Special instructions..."
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-amber-600 hover:bg-amber-700" 
                    onClick={handleOrderSubmit}
                    disabled={
                      !orderFormData.customer_id || 
                      !orderFormData.part_number || 
                      !orderFormData.part_name || 
                      (exceedsSuggestedRetail && !acknowledgedPriceWarning) ||
                      createOrder.isPending
                    }
                  >
                    {createOrder.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Order...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Create Part Order
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockParts.length > 0 && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="text-foreground">
              {lowStockParts.length} part(s) are at or below minimum stock level
            </span>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search parts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Parts List */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredParts?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No parts in inventory</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredParts?.map((part) => (
                <div 
                  key={part.id} 
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium">{part.name}</span>
                      {part.part_number && (
                        <Badge variant="outline">{part.part_number}</Badge>
                      )}
                      {part.category && (
                        <Badge variant="secondary">{part.category}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {part.manufacturer}
                      {part.location && ` - Location: ${part.location}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant={part.quantity <= part.min_quantity ? 'destructive' : 'default'}
                        className="text-sm"
                      >
                        Qty: {part.quantity}
                      </Badge>
                    </div>
                    {part.retail_price && (
                      <p className="text-sm text-muted-foreground">
                        ${part.retail_price.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Add Customer Dialog */}
      <QuickAddCustomerDialog
        open={isAddCustomerOpen}
        onOpenChange={setIsAddCustomerOpen}
        onCustomerCreated={handleCustomerCreated}
      />
    </div>
  );
}

