
import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { Customer, getCustomerFullName } from "@/types/customer";
import { Skeleton } from "@/components/ui/skeleton";
import { SendSmsDialog } from "@/components/sms/SendSmsDialog";

interface CustomerTableProps {
  customers: Customer[];
  isLoading: boolean;
}

export function CustomerTable({ customers, isLoading }: CustomerTableProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);

  const handleMessageClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSmsDialogOpen(true);
  };
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Vehicles</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No customers found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Vehicles</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const fullName = getCustomerFullName(customer);
              const vehicleCount = customer.vehicles?.length || 0;
              const hasVehicles = vehicleCount > 0;
              const isFleetCustomer = customer.is_fleet === true;

              return (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    <Link 
                      to={`/customers/${customer.id}`}
                      className="hover:underline text-blue-600"
                    >
                      {fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.company || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={hasVehicles ? "default" : "secondary"}>
                      {vehicleCount} {vehicleCount === 1 ? 'vehicle' : 'vehicles'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isFleetCustomer ? "default" : "outline"}>
                      {isFleetCustomer ? 'Fleet' : 'Individual'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/customers/${customer.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/customers/${customer.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleMessageClick(customer)}
                        title="Send SMS"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* SMS Dialog */}
      {selectedCustomer && (
        <SendSmsDialog
          open={smsDialogOpen}
          onOpenChange={setSmsDialogOpen}
          customer={selectedCustomer}
        />
      )}
    </>
  );
}
