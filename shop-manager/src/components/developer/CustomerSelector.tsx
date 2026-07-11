
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface CustomerData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface CustomerSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function CustomerSelector({ value, onValueChange, placeholder = "Select customer..." }: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email')
          .order('first_name', { ascending: true });

        if (error) {
          console.error('Error fetching customers:', error);
        } else {
          setCustomers(data || []);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Loading customers..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {customers.map((customer) => (
          <SelectItem key={customer.id} value={customer.id}>
            {customer.first_name} {customer.last_name} ({customer.email})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
