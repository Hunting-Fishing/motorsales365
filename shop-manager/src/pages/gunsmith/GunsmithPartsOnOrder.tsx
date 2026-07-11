import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  useGunsmithPendingPartOrders, 
  useUpdateJobPartOrderStatus,
  useCreateJobPartOrder,
  type GunsmithJobPartOrder 
} from '@/hooks/useGunsmithJobPartOrders';
import { 
  Package, 
  Search, 
  MoreVertical, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Wrench,
  ExternalLink,
  Plus,
  ShoppingCart,
  Truck,
  DollarSign,
  Calendar,
  Hash,
  Loader2,
  User,
  UserPlus
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QuickAddCustomerDialog } from '@/components/gunsmith/QuickAddCustomerDialog';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  ordered: { label: 'Ordered', variant: 'default', icon: <Clock className="h-3 w-3" /> },
  backordered: { label: 'Backordered', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
  received: { label: 'Received', variant: 'secondary', icon: <CheckCircle className="h-3 w-3" /> },
  installed: { label: 'Installed', variant: 'outline', icon: <Wrench className="h-3 w-3" /> },
};

export default function GunsmithPartsOnOrder() {
  const navigate = useNavigate();
  const { data: orders, isLoading } = useGunsmithPendingPartOrders();
  const updateStatus = useUpdateJobPartOrderStatus();
  const createOrder = useCreateJobPartOrder();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [acknowledgedPriceWarning, setAcknowledgedPriceWarning] = useState(false);
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

  const { data: jobs } = useQuery({
    queryKey: ['gunsmith-jobs-for-order', orderFormData.customer_id],
    queryFn: async () => {
      let query = (supabase as any)
        .from('gunsmith_jobs')
        .select('id, job_number, customer_id, customers(first_name, last_name), gunsmith_firearms(make, model)')
        .in('status', ['pending', 'in_progress', 'waiting_parts'])
        .order('created_at', { ascending: false });

      if (orderFormData.customer_id) {
        query = query.eq('customer_id', orderFormData.customer_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = 
      order.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.job?.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${order.job?.customer?.first_name} ${order.job?.customer?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (order: GunsmithJobPartOrder, newStatus: string) => {
    const updates: { id: string; status: string; received_date?: string; installed_date?: string } = {
      id: order.id,
      status: newStatus,
    };

    if (newStatus === 'received' && !order.received_date) {
      updates.received_date = new Date().toISOString().split('T')[0];
    }
    if (newStatus === 'installed' && !order.installed_date) {
      updates.installed_date = new Date().toISOString().split('T')[0];
    }

    updateStatus.mutate(updates);
  };

  const handleCustomerCreated = (customerId: string) => {
    refetchCustomers();
    setOrderFormData({ ...orderFormData, customer_id: customerId, job_id: '' });
  };

  const handleOrderSubmit = async () => {
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

    setIsAddOrderOpen(false);
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
  const exceedsSuggestedRetail = suggestedRetailNum > 0 && retailPrice > suggestedRetailNum;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parts on Order</h1>
          <p className="text-muted-foreground">Track all parts ordered for customer jobs</p>
        </div>
        <Button onClick={() => setIsAddOrderOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Quick Add Order
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by part, supplier, job #, or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="backordered">Backordered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pending Orders ({filteredOrders?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !filteredOrders || filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No pending part orders</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const config = statusConfig[order.status] || statusConfig.ordered;
                const customerName = order.job?.customer 
                  ? `${order.job.customer.first_name} ${order.job.customer.last_name}`
                  : 'Unknown Customer';
                const firearmInfo = order.job?.firearm
                  ? `${order.job.firearm.make} ${order.job.firearm.model}`
                  : '';

                return (
                  <div 
                    key={order.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/50 rounded-lg gap-4"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{order.part_name}</span>
                        <Badge variant={config.variant} className="flex items-center gap-1">
                          {config.icon}
                          {config.label}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>PN: {order.part_number} - Qty: {order.quantity_ordered}</p>
                        {order.supplier && <p>Supplier: {order.supplier}</p>}
                        {order.unit_cost && (
                          <p>Cost: ${order.unit_cost.toFixed(2)} ea - Total: ${order.total_cost?.toFixed(2)}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{order.job?.job_number || 'N/A'}</span>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => navigate(`/gunsmith/jobs/${order.job_id}`)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-muted-foreground">{customerName}</span>
                      {firearmInfo && (
                        <span className="text-muted-foreground text-xs">{firearmInfo}</span>
                      )}
                      {order.expected_date && (
                        <span className="text-xs">
                          Expected: {format(new Date(order.expected_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {order.status === 'ordered' && (
                          <>
                            <DropdownMenuItem onClick={() => handleStatusChange(order, 'received')}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Received
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(order, 'backordered')}>
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Mark Backordered
                            </DropdownMenuItem>
                          </>
                        )}
                        {order.status === 'backordered' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(order, 'received')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Received
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => navigate(`/gunsmith/jobs/${order.job_id}`)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Job
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOrderOpen} onOpenChange={setIsAddOrderOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
              Add Part Order
            </DialogTitle>
            <DialogDescription>
              Create a part order for a customer and optional RO#
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hash className="h-3 w-3" />
                RO# <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Select
                value={orderFormData.job_id}
                onValueChange={(v) => setOrderFormData({ ...orderFormData, job_id: v })}
                disabled={!orderFormData.customer_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={orderFormData.customer_id ? "Select an RO# or leave empty..." : "Select a customer first"} />
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
            </div>

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

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Pricing
              </div>
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
              {exceedsSuggestedRetail && !acknowledgedPriceWarning && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-red-700">Price exceeds Suggested Retail</p>
                      <p className="text-red-600/80 text-xs mt-1">
                        Your retail price (${retailPrice.toFixed(2)}) is ${(retailPrice - suggestedRetailNum).toFixed(2)} above the MSRP (${suggestedRetailNum.toFixed(2)}).
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
            </div>

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
          </div>
        </DialogContent>
      </Dialog>

      <QuickAddCustomerDialog
        open={isAddCustomerOpen}
        onOpenChange={setIsAddCustomerOpen}
        onCustomerCreated={handleCustomerCreated}
      />
    </div>
  );
}
