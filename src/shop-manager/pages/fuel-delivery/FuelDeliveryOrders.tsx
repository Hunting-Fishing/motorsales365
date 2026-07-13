import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Filter, Fuel, ArrowLeft } from 'lucide-react';
import { useFuelDeliveryOrders } from '@/hooks/useFuelDelivery';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';

export default function FuelDeliveryOrders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: orders, isLoading } = useFuelDeliveryOrders();
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'fuel_delivery');

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      order.fuel_delivery_customers?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      order.fuel_delivery_customers?.contact_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'in_transit': return <Badge className="bg-purple-500">In Transit</Badge>;
      case 'scheduled': return <Badge className="bg-blue-500">Scheduled</Badge>;
      case 'pending': return <Badge variant="outline">Pending</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
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
              <Fuel className="h-8 w-8 text-orange-600" />
              {moduleInfo?.displayName || 'Fuel Delivery'} Orders
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and track delivery orders
            </p>
          </div>
          <Button onClick={() => navigate('/fuel-delivery/orders/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredOrders && filteredOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow 
                    key={order.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/fuel-delivery/orders/${order.id}`)}
                  >
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      {order.fuel_delivery_customers?.company_name || order.fuel_delivery_customers?.contact_name}
                    </TableCell>
                    <TableCell>{order.fuel_delivery_locations?.location_name}</TableCell>
                    <TableCell>{order.fuel_delivery_products?.product_name}</TableCell>
                    <TableCell>{order.quantity_ordered?.toLocaleString()} gal</TableCell>
                    <TableCell>
                      {order.scheduled_date ? format(new Date(order.scheduled_date), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${order.total_amount?.toLocaleString() || '0'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Fuel className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No orders found</p>
              <Button variant="link" onClick={() => navigate('/fuel-delivery/orders/new')}>
                Create your first order
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
