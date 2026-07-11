import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  Search, 
  Phone,
  Mail,
  Crosshair,
  Eye
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickAddCustomerDialog } from '@/components/gunsmith/QuickAddCustomerDialog';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

export default function GunsmithCustomers() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Fetch customers with their firearms count
  const { data: customers, isLoading } = useQuery({
    queryKey: ['gunsmith-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          address,
          created_at,
          gunsmith_firearms(count)
        `)
        .order('first_name');
      
      if (error) throw error;
      return data;
    }
  });

  const filteredCustomers = customers?.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    return (
      c.first_name?.toLowerCase().includes(searchLower) ||
      c.last_name?.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower) ||
      c.phone?.includes(searchTerm)
    );
  });

  return (
    <MobilePageContainer>
      <MobilePageHeader
        title="Customers"
        subtitle="Manage customer records and firearms"
        icon={<Users className="h-6 w-6 md:h-8 md:w-8 text-amber-600" />}
        onBack={() => navigate('/gunsmith')}
        actions={
          <Button 
            onClick={() => navigate('/gunsmith/customers/new')} 
            className="bg-amber-600 hover:bg-amber-700 w-full md:w-auto"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Add </span>Customer
          </Button>
        }
      />

      {/* Search */}
      <div className="mb-4 md:mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customers List */}
      <Card>
        <CardHeader className="px-3 md:px-6 py-3 md:py-4">
          <CardTitle className="flex items-center justify-between text-base md:text-lg">
            <span>All Customers</span>
            {customers && (
              <Badge variant="secondary" className="text-xs">{customers.length} customers</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
          {isLoading ? (
            <div className="space-y-2 md:space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 md:h-20 w-full" />)}
            </div>
          ) : filteredCustomers?.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-muted-foreground">
              <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
              <p className="text-sm md:text-base">No customers found</p>
              <Button 
                variant="outline" 
                className="mt-3 md:mt-4"
                size="sm"
                onClick={() => navigate('/gunsmith/customers/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Customer
              </Button>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {filteredCustomers?.map((customer) => {
                const firearmsCount = customer.gunsmith_firearms?.[0]?.count || 0;
                
                return (
                  <div 
                    key={customer.id} 
                    className="p-3 md:p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                  >
                    {/* Mobile: Stack layout */}
                    <div className="space-y-2 md:space-y-0 md:flex md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-base md:text-lg truncate">
                            {customer.first_name} {customer.last_name}
                          </span>
                          {firearmsCount > 0 && (
                            <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30 text-xs shrink-0">
                              <Crosshair className="h-3 w-3 mr-1" />
                              {firearmsCount}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-muted-foreground">
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span className="truncate">{customer.phone}</span>
                            </span>
                          )}
                          {customer.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[180px] md:max-w-none">{customer.email}</span>
                            </span>
                          )}
                        </div>
                        {customer.address && (
                          <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">{customer.address}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/gunsmith/customers/${customer.id}`)}
                        className="text-amber-600 border-amber-600/30 hover:bg-amber-600/10 w-full md:w-auto mt-2 md:mt-0 shrink-0"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Customer Dialog */}
      <QuickAddCustomerDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </MobilePageContainer>
  );
}
