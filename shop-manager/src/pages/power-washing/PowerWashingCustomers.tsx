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
  MapPin,
  Eye,
  Droplets,
  Building
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { FadeIn, SlideIn } from '@/components/layout/AnimatedPage';
import { AnimatedList } from '@/components/ui/animated-list';
import { NumberTicker } from '@/components/ui/number-ticker';
import { motion } from 'framer-motion';
import { useShopId } from '@/hooks/useShopId';

export default function PowerWashingCustomers() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const { shopId } = useShopId();

  // Fetch customers with their power washing jobs count
  const { data: customers, isLoading } = useQuery({
    queryKey: ['power-washing-customers', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          address,
          company,
          is_fleet,
          business_type,
          created_at,
          power_washing_jobs(count)
        `)
        .eq('shop_id', shopId)
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!shopId
  });

  // Helper to get display name - prioritize company for business accounts
  const getDisplayName = (customer: { company?: string | null; first_name?: string | null; last_name?: string | null }) => {
    if (customer.company) {
      return customer.company;
    }
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
  };

  const filteredCustomers = customers?.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    return (
      c.first_name?.toLowerCase().includes(searchLower) ||
      c.last_name?.toLowerCase().includes(searchLower) ||
      c.company?.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower) ||
      c.phone?.includes(searchTerm) ||
      c.address?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <MobilePageContainer>
      <MobilePageHeader
        title="Customers"
        subtitle="Manage power washing customers"
        icon={<Users className="h-6 w-6 md:h-8 md:w-8 text-cyan-600" />}
        onBack={() => navigate('/power-washing')}
        actions={
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={() => navigate('/power-washing/customers/new')} 
              className="bg-cyan-600 hover:bg-cyan-700 w-full md:w-auto"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Add </span>Customer
            </Button>
          </motion.div>
        }
      />

      {/* Search */}
      <SlideIn direction="down" delay={0.1} className="mb-4 md:mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </SlideIn>

      {/* Customers List */}
      <FadeIn delay={0.15}>
        <Card>
          <CardHeader className="px-3 md:px-6 py-3 md:py-4">
            <CardTitle className="flex items-center justify-between text-base md:text-lg">
              <span>All Customers</span>
              {customers && (
                <Badge variant="secondary" className="text-xs">
                  <NumberTicker value={customers.length} /> customers
                </Badge>
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
                  onClick={() => navigate('/power-washing/customers/new')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Customer
                </Button>
              </div>
            ) : (
              <AnimatedList variant="slide" staggerDelay={0.03} className="space-y-2 md:space-y-3">
                {filteredCustomers?.map((customer) => {
                  const jobsCount = customer.power_washing_jobs?.[0]?.count || 0;
                  
                  return (
                    <motion.div
                      key={customer.id}
                      whileHover={{ y: -2, backgroundColor: 'hsl(var(--muted))' }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="p-3 md:p-4 bg-muted/50 rounded-lg"
                    >
                      {/* Mobile: Stack layout */}
                      <div className="space-y-2 md:space-y-0 md:flex md:items-center md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-base md:text-lg truncate">
                              {getDisplayName(customer)}
                            </span>
                            {customer.company && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                <Building className="h-3 w-3 mr-1" />
                                Business
                              </Badge>
                            )}
                            {jobsCount > 0 && (
                              <Badge className="bg-cyan-500/20 text-cyan-700 border-cyan-500/30 text-xs shrink-0">
                                <Droplets className="h-3 w-3 mr-1" />
                                {jobsCount} job{jobsCount !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          {customer.company && (customer.first_name || customer.last_name) && (
                            <p className="text-sm text-muted-foreground mb-1">
                              Contact: {customer.first_name} {customer.last_name}
                            </p>
                          )}
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
                            <p className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{customer.address}</span>
                            </p>
                          )}
                        </div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/power-washing/customers/${customer.id}`)}
                            className="text-cyan-600 border-cyan-600/30 hover:bg-cyan-600/10 w-full md:w-auto mt-2 md:mt-0 shrink-0"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatedList>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </MobilePageContainer>
  );
}
