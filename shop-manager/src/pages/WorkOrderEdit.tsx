
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { getWorkOrderById, updateWorkOrder } from '@/services/workOrder';
import { WorkOrder } from '@/types/workOrder';
import { WorkOrderForm } from '@/components/work-orders/WorkOrderForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WorkOrderEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkOrder = async () => {
      if (!id) {
        setError('No work order ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching work order for edit:', id);
        const workOrderData = await getWorkOrderById(id);
        
        if (!workOrderData) {
          setError('Work order not found');
          return;
        }
        
        setWorkOrder(workOrderData);
      } catch (err: any) {
        console.error('Error fetching work order:', err);
        setError(err.message || 'Failed to fetch work order');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkOrder();
  }, [id]);

  const handleUpdateWorkOrder = async (updatedData: any) => {
    if (!id) return;

    try {
      console.log('Updating work order:', id, updatedData);
      
      const updatedWorkOrder = await updateWorkOrder(id, updatedData);
      
      toast({
        title: 'Success',
        description: 'Work order updated successfully!',
      });

      // Navigate back to work order details
      navigate(`/work-orders/${id}`);
      
    } catch (error) {
      console.error('Error updating work order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update work order. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-lg">Loading work order...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Work Order</h3>
            <p className="text-red-700">{error || 'Work order not found'}</p>
            <Button
              variant="outline"
              onClick={() => navigate('/work-orders')}
              className="mt-4"
            >
              Back to Work Orders
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/work-orders/${id}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Details
            </Button>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Work Order</h1>
              <p className="text-sm text-gray-600 mt-1">
                Work Order #{workOrder.work_order_number || workOrder.id.slice(0, 8)}
                {workOrder.customer_name && ` • ${workOrder.customer_name}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <WorkOrderForm
          onSubmit={handleUpdateWorkOrder}
          initialValues={{
            customer: workOrder.customer_name || workOrder.customer || '',
            customerEmail: workOrder.customer_email || '',
            customerPhone: workOrder.customer_phone || '',
            customerAddress: workOrder.customer_address || '',
            description: workOrder.description || '',
            status: workOrder.status || 'pending',
            priority: workOrder.priority || 'medium',
            technician: workOrder.technician || '',
            location: workOrder.location || '',
            notes: workOrder.notes || '',
            vehicleMake: workOrder.vehicle_make || '',
            vehicleModel: workOrder.vehicle_model || '',
            vehicleYear: workOrder.vehicle_year || '',
            licensePlate: workOrder.vehicle_license_plate || '',
            vin: workOrder.vehicle_vin || '',
            inventoryItems: workOrder.inventoryItems || [],
          }}
        />
      </div>
    </div>
  );
};

export default WorkOrderEdit;
