
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllInventoryOrders } from "@/services/inventory/orderService";
import { InventoryOrder } from "@/types/inventory/orders";
import { Link } from "react-router-dom";

export function PendingOrdersCard() {
  const [pendingOrders, setPendingOrders] = useState<InventoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const orders = await getAllInventoryOrders();
        // Filter only active orders (ordered or partially received)
        const active = orders.filter(
          order => order.status === 'ordered' || order.status === 'partially received'
        );
        setPendingOrders(active);
      } catch (err) {
        setError("Failed to load pending orders");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Get count of overdue orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const overdueCount = pendingOrders.filter(order => {
    const expectedDate = new Date(order.expected_arrival);
    expectedDate.setHours(0, 0, 0, 0);
    return expectedDate < today;
  }).length;

  return (
    <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <ShoppingCart className="mr-2 h-5 w-5 text-blue-600" />
          Pending Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-gray-500">Loading orders...</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300">
                {pendingOrders.length} Active Order{pendingOrders.length !== 1 ? 's' : ''}
              </Badge>
              
              {overdueCount > 0 && (
                <div className="flex items-center text-red-600 text-sm font-medium">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {overdueCount} Overdue
                </div>
              )}
            </div>
            
            <Button asChild className="w-full mt-2">
              <Link to="/inventory/orders">Manage Orders</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
