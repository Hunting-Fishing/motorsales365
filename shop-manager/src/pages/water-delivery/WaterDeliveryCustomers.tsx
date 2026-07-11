import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, ArrowLeft, Users, Mail, Phone, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AddWaterDeliveryCustomerDialog } from '@/components/water-delivery/customers/AddWaterDeliveryCustomerDialog';
import { EditWaterDeliveryCustomerDialog } from '@/components/water-delivery/customers/EditWaterDeliveryCustomerDialog';

export default function WaterDeliveryCustomers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const getCustomerDisplayName = (customer: any) => {
    const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ');
    return name || customer.company_name || customer.email || 'Unknown';
  };
  const { shopId } = useShopId();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['water-delivery-customers', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('water_delivery_customers')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const filteredCustomers = customers?.filter(customer => 
    customer.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    customer.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    customer.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    customer.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/water-delivery')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="h-8 w-8 text-cyan-600" />
              Water Delivery Customers
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage customer accounts and information
            </p>
          </div>
          <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCustomers && filteredCustomers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow 
                    key={customer.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/water-delivery/customers/${customer.id}`)}
                  >
                    <TableCell className="font-medium">{customer.company_name || '-'}</TableCell>
                    <TableCell>{getCustomerDisplayName(customer)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {customer.email || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {customer.phone || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.payment_terms || 'Standard'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(customer);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No customers found</p>
              <Button variant="link">Add your first customer</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddWaterDeliveryCustomerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      {selectedCustomer && (
        <EditWaterDeliveryCustomerDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          customer={selectedCustomer}
        />
      )}
    </div>
  );
}
