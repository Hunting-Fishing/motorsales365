
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { 
  getAllInventoryOrders, 
  createInventoryOrder, 
  receiveInventoryOrder, 
  cancelInventoryOrder 
} from '@/services/inventory/orderService';
import { 
  InventoryOrder, 
  CreateInventoryOrderDto, 
  ReceiveInventoryOrderDto 
} from '@/types/inventory/orders';

export function useInventoryOrders() {
  const [orders, setOrders] = useState<InventoryOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<InventoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [dateRangeFilter, setDateRangeFilter] = useState<{from?: Date, to?: Date}>({});

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, statusFilter, supplierFilter, dateRangeFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllInventoryOrders();
      setOrders(data);
      setFilteredOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory orders');
      toast({
        title: 'Error',
        description: 'Failed to fetch inventory orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData: CreateInventoryOrderDto) => {
    try {
      await createInventoryOrder(orderData);
      toast({
        title: 'Success',
        description: 'Order created successfully',
        variant: 'success',
      });
      await fetchOrders();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to create order',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const receiveOrder = async (receiveData: ReceiveInventoryOrderDto) => {
    try {
      await receiveInventoryOrder(receiveData);
      toast({
        title: 'Success',
        description: 'Inventory received successfully',
        variant: 'success',
      });
      await fetchOrders();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to receive inventory',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await cancelInventoryOrder(orderId);
      toast({
        title: 'Success',
        description: 'Order cancelled successfully',
        variant: 'success',
      });
      await fetchOrders();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to cancel order',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Apply status filter
    if (statusFilter.length > 0) {
      filtered = filtered.filter(order => statusFilter.includes(order.status));
    }

    // Apply supplier filter
    if (supplierFilter) {
      filtered = filtered.filter(order => 
        order.supplier.toLowerCase().includes(supplierFilter.toLowerCase())
      );
    }

    // Apply date range filter
    if (dateRangeFilter.from) {
      const fromDate = new Date(dateRangeFilter.from);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.order_date);
        return orderDate >= fromDate;
      });
    }

    if (dateRangeFilter.to) {
      const toDate = new Date(dateRangeFilter.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.order_date);
        return orderDate <= toDate;
      });
    }

    setFilteredOrders(filtered);
  };

  return {
    orders: filteredOrders,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    supplierFilter,
    setSupplierFilter,
    dateRangeFilter,
    setDateRangeFilter,
    createOrder,
    receiveOrder,
    cancelOrder,
    refreshOrders: fetchOrders
  };
}
