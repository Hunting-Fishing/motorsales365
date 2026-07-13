
import { useInventoryOrders } from "@/hooks/inventory/useInventoryOrders";
import { InventoryOrdersHeader } from "./InventoryOrdersHeader";
import { InventoryOrdersFilters } from "./InventoryOrdersFilters";
import { InventoryOrdersTable } from "./InventoryOrdersTable";
import { OverdueOrdersAlert } from "./OverdueOrdersAlert";
import { useReceiveDialog } from "./useReceiveDialog";
import { useCancelDialog } from "./useCancelDialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function InventoryOrdersPage() {
  const { 
    orders, 
    loading, 
    error,
    statusFilter,
    setStatusFilter,
    supplierFilter,
    setSupplierFilter,
    dateRangeFilter,
    setDateRangeFilter
  } = useInventoryOrders();
  
  const { openReceiveDialog } = useReceiveDialog();
  const { openCancelDialog } = useCancelDialog();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[500px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-[500px] space-y-4">
        <div className="text-xl font-semibold text-red-500">Error loading inventory orders</div>
        <div className="text-gray-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InventoryOrdersHeader />
      
      <OverdueOrdersAlert orders={orders} />
      
      <InventoryOrdersFilters 
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        supplierFilter={supplierFilter}
        setSupplierFilter={setSupplierFilter}
        dateRangeFilter={dateRangeFilter}
        setDateRangeFilter={setDateRangeFilter}
      />
      
      <InventoryOrdersTable 
        orders={orders} 
        onReceive={openReceiveDialog} 
        onCancel={openCancelDialog} 
      />
    </div>
  );
}
