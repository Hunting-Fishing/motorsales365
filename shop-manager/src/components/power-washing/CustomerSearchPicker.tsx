import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  User, 
  Building2, 
  Phone, 
  Mail, 
  MapPin,
  Check,
  ChevronDown,
  Plus,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface CustomerSearchPickerProps {
  shopId: string;
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onCreateNewCustomer: () => void;
}

export function CustomerSearchPicker({ 
  shopId, 
  selectedCustomer, 
  onSelectCustomer,
  onCreateNewCustomer 
}: CustomerSearchPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['power-washing-customers-picker', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone, company, address, city, state, postal_code, latitude, longitude')
        .eq('shop_id', shopId)
        .order('last_name', { ascending: true })
        .limit(500);
      
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!shopId,
  });

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!search.trim()) return customers;
    
    const searchLower = search.toLowerCase();
    return customers.filter(c => {
      const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
      return fullName.includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.toLowerCase().includes(searchLower) ||
        c.company?.toLowerCase().includes(searchLower);
    });
  }, [customers, search]);

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onSelectCustomer(null);
    setSearch('');
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center justify-between">
        <span>Select Existing Customer</span>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          onClick={onCreateNewCustomer}
          className="text-xs h-6"
        >
          <Plus className="h-3 w-3 mr-1" />
          New Customer
        </Button>
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between h-auto min-h-10 py-2",
              !selectedCustomer && "text-muted-foreground"
            )}
          >
            {selectedCustomer ? (
              <div className="flex items-center gap-2 text-left flex-1">
                <div className="flex-shrink-0">
                  {selectedCustomer.company ? (
                    <Building2 className="h-4 w-4 text-primary" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </p>
                  {selectedCustomer.company && (
                    <p className="text-xs text-muted-foreground truncate">{selectedCustomer.company}</p>
                  )}
                </div>
              </div>
            ) : (
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search customers...
              </span>
            )}
            <div className="flex items-center gap-1">
              {selectedCustomer && (
                <X 
                  className="h-4 w-4 hover:text-destructive cursor-pointer" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                />
              )}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading customers...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-muted-foreground mb-2">No customers found</p>
                <Button type="button" variant="outline" size="sm" onClick={onCreateNewCustomer}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create New Customer
                </Button>
              </div>
            ) : (
              <div className="p-1">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    className={cn(
                      "w-full text-left p-3 rounded-md hover:bg-accent transition-colors",
                      selectedCustomer?.id === customer.id && "bg-accent"
                    )}
                    onClick={() => handleSelect(customer)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {customer.company ? (
                          <Building2 className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {customer.first_name} {customer.last_name}
                          </p>
                          {selectedCustomer?.id === customer.id && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        {customer.company && (
                          <p className="text-sm text-primary truncate">{customer.company}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          {customer.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </span>
                          )}
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </span>
                          )}
                        </div>
                        {customer.address && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1 truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {customer.address}
                            {customer.city && `, ${customer.city}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Selected Customer Summary Card */}
      {selectedCustomer && (
        <div className="p-3 bg-accent/50 rounded-lg border border-accent mt-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span className="font-medium">Selected:</span>
            <span>{selectedCustomer.first_name} {selectedCustomer.last_name}</span>
            {selectedCustomer.company && (
              <Badge variant="secondary" className="text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                {selectedCustomer.company}
              </Badge>
            )}
          </div>
          {selectedCustomer.address && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {selectedCustomer.address}, {selectedCustomer.city}, {selectedCustomer.state} {selectedCustomer.postal_code}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
