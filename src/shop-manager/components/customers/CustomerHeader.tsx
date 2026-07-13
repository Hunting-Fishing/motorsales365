
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Edit, ClipboardList, MessageSquare } from "lucide-react";
import { Customer, getCustomerFullName } from "@/types/customer";

interface CustomerHeaderProps {
  customer: Customer & { name?: string, status?: string };
  setAddInteractionOpen: (open: boolean) => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({ 
  customer, 
  setAddInteractionOpen 
}) => {
  const navigate = useNavigate();
  const customerName = customer.name || getCustomerFullName(customer);
  const customerStatus = customer.status || 'active';

  return (
    <div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate("/customers")} 
        className="mb-4"
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back to Customers
      </Button>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{customerName}</h1>
            <Badge 
              variant={customerStatus === 'active' ? 'default' : 'secondary'}
            >
              {customerStatus === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {customer.company && (
            <p className="text-muted-foreground">{customer.company}</p>
          )}
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button 
            variant="outline"
            onClick={() => setAddInteractionOpen(true)}
          >
            <MessageSquare className="mr-2 h-4 w-4" /> Record Interaction
          </Button>
          <Button 
            variant="outline"
            asChild
          >
            <Link to={`/work-orders/new?customer=${encodeURIComponent(customerName)}`}>
              <ClipboardList className="mr-2 h-4 w-4" /> New Work Order
            </Link>
          </Button>
          <Button 
            variant="outline"
            asChild
          >
            <Link to={`/customers/${customer.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" /> Edit Customer
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
