
import React from 'react';
import { WorkOrder } from '@/types/workOrder';
import { Customer } from '@/types/customer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, MapPin } from 'lucide-react';

interface WorkOrderCustomerInfoProps {
  customer: Customer | null;
  workOrder: WorkOrder;
}

export function WorkOrderCustomerInfo({ customer, workOrder }: WorkOrderCustomerInfoProps) {
  // Use customer data if available, otherwise fall back to work order data
  const customerName = customer 
    ? `${customer.first_name} ${customer.last_name}` 
    : workOrder.customer_name || workOrder.customer || 'Unknown Customer';
    
  const customerEmail = customer?.email || workOrder.customer_email;
  const customerPhone = customer?.phone || workOrder.customer_phone;
  const customerAddress = customer 
    ? `${customer.address || ''} ${customer.city || ''} ${customer.state || ''} ${customer.postal_code || ''}`.trim()
    : `${workOrder.customer_address || ''} ${workOrder.customer_city || ''} ${workOrder.customer_state || ''} ${workOrder.customer_postal_code || ''}`.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Customer Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="font-medium">{customerName}</div>
          {customer?.company && (
            <div className="text-sm text-muted-foreground">{customer.company}</div>
          )}
        </div>
        
        {customerEmail && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a href={`mailto:${customerEmail}`} className="text-blue-600 hover:underline">
              {customerEmail}
            </a>
          </div>
        )}
        
        {customerPhone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${customerPhone}`} className="text-blue-600 hover:underline">
              {customerPhone}
            </a>
          </div>
        )}
        
        {customerAddress && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>{customerAddress}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
