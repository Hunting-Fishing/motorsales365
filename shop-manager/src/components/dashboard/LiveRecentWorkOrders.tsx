
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function LiveRecentWorkOrders() {
  const { workOrders, loading, error } = useWorkOrders();
  const [localError, setLocalError] = useState<string | null>(null);

  // Add safety check and error handling
  useEffect(() => {
    if (error) {
      console.log('LiveRecentWorkOrders: Error from useWorkOrders:', error);
      setLocalError(error);
    }
  }, [error]);

  // Handle loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-48">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-lg">Loading recent work orders...</span>
        </div>
      </div>
    );
  }

  // Handle error state
  if (localError || error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <h3 className="text-sm font-medium text-red-800">
              Unable to load recent work orders
            </h3>
          </div>
          <div className="mt-2 text-sm text-red-700">
            {localError || error || 'An unexpected error occurred'}
          </div>
        </div>
      </div>
    );
  }

  // Handle empty state safely
  const safeWorkOrders = Array.isArray(workOrders) ? workOrders : [];
  const recentWorkOrders = safeWorkOrders.slice(0, 5);

  if (safeWorkOrders.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          <div className="mb-4">
            <Clock className="h-12 w-12 mx-auto opacity-50" />
          </div>
          <p className="text-lg font-medium mb-2">No work orders yet</p>
          <p className="text-sm mb-4">Create your first work order to get started</p>
          <Button asChild>
            <Link to="/work-orders/create">
              Create Work Order
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-500 text-white';
    
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'in-progress':
        return 'bg-blue-500 text-white';
      case 'pending':
        return 'bg-yellow-500 text-black';
      case 'cancelled':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="p-6">
      <div className="space-y-4">
        {recentWorkOrders.map((workOrder) => {
          // Add null checks for all properties
          const workOrderNumber = workOrder?.work_order_number || workOrder?.id?.slice(0, 8) || 'Unknown';
          const customerName = workOrder?.customer_name || 'Unknown Customer';
          const description = workOrder?.description || 'No description available';
          const status = workOrder?.status || 'unknown';
          const createdAt = workOrder?.created_at;
          
          return (
            <div 
              key={workOrder?.id || Math.random()} 
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    Work Order #{workOrderNumber}
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{customerName}</span>
                    </div>
                    {createdAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Badge className={getStatusColor(status)}>
                  {status}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {description}
              </p>
              
              <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/work-orders/${workOrder?.id || ''}`}>
                    View Details
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
        
        {safeWorkOrders.length > 5 && (
          <div className="text-center pt-4">
            <Button variant="outline" asChild>
              <Link to="/work-orders">
                View All Work Orders ({safeWorkOrders.length})
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
