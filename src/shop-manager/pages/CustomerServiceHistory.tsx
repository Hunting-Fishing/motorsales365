
import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ServiceHistoryTable } from '@/components/service-history/ServiceHistoryTable';
import { useWorkOrdersByCustomer } from '@/hooks/useWorkOrdersByCustomer';
import { useCustomerByName } from '@/hooks/useCustomerByName';
import { WorkOrder } from '@/types/workOrder';
import { Customer } from '@/types/customer';
import { mapDatabaseWorkOrder } from '@/utils/workOrders/typeMappers';
import { toast } from '@/hooks/use-toast';

const CustomerServiceHistory = () => {
  const { customerName } = useParams<{ customerName: string }>();
  const decodedCustomerName = customerName ? decodeURIComponent(customerName) : '';
  
  const { customer, loading: customerLoading, error: customerError } = useCustomerByName(decodedCustomerName);
  const { workOrders, loading: workOrdersLoading, error: workOrdersError } = useWorkOrdersByCustomer(customer?.id || '');

  const loading = customerLoading || workOrdersLoading;
  const error = customerError || workOrdersError;

  // Map work orders to ensure proper formatting
  const mappedWorkOrders = React.useMemo(() => {
    return workOrders.map(wo => mapDatabaseWorkOrder(wo));
  }, [workOrders]);

  const handleExportHistory = () => {
    toast({
      title: "Export Started",
      description: "Your service history export is being prepared.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center py-12">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600 text-lg">Loading service history...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto p-6">
          <div className="bg-white rounded-xl shadow-sm border border-red-200/60 p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
            <p className="text-slate-600">{error}</p>
            <Button asChild className="mt-4">
              <Link to="/customers">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Customers
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto p-6">
          <div className="bg-white rounded-xl shadow-sm border border-yellow-200/60 p-8 text-center">
            <h1 className="text-2xl font-bold text-yellow-600 mb-2">Customer Not Found</h1>
            <p className="text-slate-600">No customer found with the name "{decodedCustomerName}"</p>
            <Button asChild className="mt-4">
              <Link to="/customers">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Customers
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button asChild variant="outline" size="sm">
                <Link to="/customers">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Customers
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Service History
                </h1>
                <p className="text-lg text-slate-600 mt-1">
                  Complete service record for {customer.first_name} {customer.last_name}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportHistory} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export History
              </Button>
              <Button asChild>
                <Link to={`/customers/${customer.id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  View Customer Details
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Service History Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Complete Service History ({mappedWorkOrders.length} records)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ServiceHistoryTable 
              workOrders={mappedWorkOrders} 
              showEquipment={true}
            />
            
            {mappedWorkOrders.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium mb-2">No Service History</h3>
                <p>No service records found for this customer.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerServiceHistory;
