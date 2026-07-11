
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Customer, getCustomerFullName } from "@/types/customer";
import { ServiceHistoryTable } from "@/components/service-history/ServiceHistoryTable";

interface CustomerServiceTabProps {
  customer: Customer & { name?: string };
  customerWorkOrders: any[];
}

export const CustomerServiceTab: React.FC<CustomerServiceTabProps> = ({
  customer,
  customerWorkOrders
}) => {
  const customerName = customer.name || getCustomerFullName(customer);
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Service History</h2>
        <Button 
          asChild
          variant="outline"
        >
          <Link to={`/customer-service-history/${encodeURIComponent(customerName)}`}>
            <FileText className="mr-2 h-4 w-4" /> View Full History
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg">Work Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ServiceHistoryTable 
            workOrders={customerWorkOrders} 
            showEquipment={true}
          />
          
          {customerWorkOrders.length === 0 && (
            <div className="text-center py-6 text-slate-500">
              No service history found for this customer.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
