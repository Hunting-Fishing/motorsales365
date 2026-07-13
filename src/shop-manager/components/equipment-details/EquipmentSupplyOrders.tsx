import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, ShoppingCart, Package, Clock, CheckCircle, XCircle, Truck, Filter, MoreVertical, Trash2, Edit, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { CreateEquipmentOrderDialog } from './CreateEquipmentOrderDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface OrderItem {
  id: string;
  item_name: string;
  item_category: string;
  quantity: number;
  unit_price: number | null;
  received_quantity: number;
  notes: string | null;
}

interface SupplyOrder {
  id: string;
  order_number: string | null;
  status: string;
  requested_by_name: string | null;
  supplier: string | null;
  order_date: string;
  expected_delivery: string | null;
  total_estimated_cost: number | null;
  notes: string | null;
  created_at: string;
  items?: OrderItem[];
}

interface EquipmentSupplyOrdersProps {
  equipmentId: string;
  shopId?: string;
}

const STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20', icon: Clock },
  { value: 'ordered', label: 'Ordered', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: ShoppingCart },
  { value: 'partial', label: 'Partial', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Package },
  { value: 'received', label: 'Received', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: XCircle },
];

const ITEM_CATEGORIES = [
  { value: 'tools', label: 'Tools', color: 'bg-purple-500/10 text-purple-600' },
  { value: 'consumables', label: 'Consumables', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'safety', label: 'Safety', color: 'bg-orange-500/10 text-orange-600' },
  { value: 'cleaning', label: 'Cleaning', color: 'bg-cyan-500/10 text-cyan-600' },
  { value: 'fittings', label: 'Fittings', color: 'bg-indigo-500/10 text-indigo-600' },
  { value: 'parts', label: 'Parts', color: 'bg-emerald-500/10 text-emerald-600' },
  { value: 'ppe', label: 'PPE', color: 'bg-red-500/10 text-red-600' },
  { value: 'other', label: 'Other', color: 'bg-slate-500/10 text-slate-600' },
];

export function EquipmentSupplyOrders({ equipmentId, shopId }: EquipmentSupplyOrdersProps) {
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<SupplyOrder | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadOrders();
  }, [equipmentId]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('equipment_supply_orders')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Load items for each order
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: items } = await supabase
            .from('equipment_supply_order_items')
            .select('*')
            .eq('order_id', order.id);
          return { ...order, items: items || [] };
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('equipment_supply_orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Order status updated');
      loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  const deleteOrder = async () => {
    if (!deleteOrderId) return;
    try {
      const { error } = await supabase
        .from('equipment_supply_orders')
        .delete()
        .eq('id', deleteOrderId);

      if (error) throw error;
      toast.success('Order deleted');
      setDeleteOrderId(null);
      loadOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order');
    }
  };

  const getStatusInfo = (status: string) => {
    return STATUSES.find(s => s.value === status) || STATUSES[0];
  };

  const getCategoryInfo = (category: string) => {
    return ITEM_CATEGORIES.find(c => c.value === category) || ITEM_CATEGORIES[ITEM_CATEGORIES.length - 1];
  };

  const toggleExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = !searchQuery || 
      order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items?.some(item => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const orderCounts = {
    pending: orders.filter(o => o.status === 'pending').length,
    ordered: orders.filter(o => o.status === 'ordered').length,
    received: orders.filter(o => o.status === 'received').length,
  };

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{orderCounts.pending} pending</Badge>
            <Badge variant="outline" className="bg-blue-500/10">{orderCounts.ordered} ordered</Badge>
            <Badge variant="outline" className="bg-green-500/10">{orderCounts.received} received</Badge>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search orders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map(status => (
              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Order List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No orders found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Create an order to track supplies and materials'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Order
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => {
            const statusInfo = getStatusInfo(order.status);
            const StatusIcon = statusInfo.icon;
            const isExpanded = expandedOrders.has(order.id);
            const itemCount = order.items?.length || 0;
            
            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(order.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h4 className="font-medium">
                            {order.order_number || `Order #${order.id.slice(0, 8)}`}
                          </h4>
                          <Badge className={statusInfo.color} variant="outline">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                          <Badge variant="outline">
                            <Package className="h-3 w-3 mr-1" />
                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {order.supplier && (
                            <span className="flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {order.supplier}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(order.order_date), 'MMM d, yyyy')}
                          </span>
                          {order.total_estimated_cost && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${order.total_estimated_cost.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {order.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, 'ordered')}
                          >
                            Mark Ordered
                          </Button>
                        )}
                        {order.status === 'ordered' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-green-600"
                            onClick={() => updateOrderStatus(order.id, 'received')}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Received
                          </Button>
                        )}
                        
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditOrder(order)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {order.status !== 'cancelled' && (
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Order
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteOrderId(order.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Expanded Items */}
                    <CollapsibleContent>
                      {order.items && order.items.length > 0 && (
                        <div className="mt-4 pt-4 border-t space-y-2">
                          <h5 className="text-sm font-medium mb-2">Order Items</h5>
                          {order.items.map(item => {
                            const categoryInfo = getCategoryInfo(item.item_category);
                            return (
                              <div 
                                key={item.id} 
                                className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg text-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className={categoryInfo.color}>
                                    {categoryInfo.label}
                                  </Badge>
                                  <span className="font-medium">{item.item_name}</span>
                                  <span className="text-muted-foreground">×{item.quantity}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  {item.unit_price && (
                                    <span className="text-muted-foreground">
                                      ${(item.unit_price * item.quantity).toFixed(2)}
                                    </span>
                                  )}
                                  {item.received_quantity > 0 && (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-600">
                                      {item.received_quantity}/{item.quantity} received
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {order.notes && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-muted-foreground">{order.notes}</p>
                        </div>
                      )}
                    </CollapsibleContent>
                  </CardContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CreateEquipmentOrderDialog
        open={createDialogOpen || !!editOrder}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditOrder(null);
          }
        }}
        equipmentId={equipmentId}
        shopId={shopId}
        order={editOrder}
        onSuccess={() => {
          loadOrders();
          setCreateDialogOpen(false);
          setEditOrder(null);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteOrderId} onOpenChange={() => setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this order and all its items? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteOrder} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
