
import React from 'react';
import { WorkOrder } from '@/types/workOrder';
import { Customer } from '@/types/customer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Phone, Mail, MapPin } from 'lucide-react';

interface WorkOrderCustomerCardProps {
  customer: Customer | null;
  workOrder: WorkOrder;
}

export function WorkOrderCustomerCard({ customer, workOrder }: WorkOrderCustomerCardProps) {
  if (!customer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No customer information available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="modern-card gradient-border group hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-4 bg-gradient-subtle rounded-t-lg">
        <CardTitle className="section-title flex items-center gap-2 font-heading text-foreground">
          <User className="h-5 w-5 text-primary" />
          Customer Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 backdrop-blur-sm">
        <div className="space-y-1">
          <p className="font-semibold text-lg text-foreground font-heading gradient-text">
            {customer.first_name} {customer.last_name}
          </p>
          {customer.company && (
            <p className="text-sm font-medium text-muted-foreground font-body">{customer.company}</p>
          )}
        </div>
        
        <div className="space-y-3">
          {customer.email && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-subtle border hover:shadow-md transition-all duration-200">
              <Mail className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium font-body">{customer.email}</span>
            </div>
          )}
          
          {customer.phone && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-subtle border hover:shadow-md transition-all duration-200">
              <Phone className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium font-body">{customer.phone}</span>
            </div>
          )}
          
          {customer.address && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-subtle border hover:shadow-md transition-all duration-200">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm font-medium leading-relaxed font-body">
                {customer.address}
                {customer.city && `, ${customer.city}`}
                {customer.state && `, ${customer.state}`}
                {customer.postal_code && ` ${customer.postal_code}`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
