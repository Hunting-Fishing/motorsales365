import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface PartsSupplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface PartsSuppliersSelector {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function PartsSuppliersSelector({ 
  value, 
  onValueChange, 
  placeholder = "Select supplier..." 
}: PartsSuppliersSelector) {
  const [suppliers, setSuppliers] = useState<PartsSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const { data, error } = await supabase
          .from('inventory_suppliers')
          .select('id, name, phone, email, address')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setSuppliers(data || []);
      } catch (error) {
        console.error('Error fetching parts suppliers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <div className="flex items-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading suppliers...
          </div>
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {suppliers.map((supplier) => (
          <SelectItem key={supplier.id} value={supplier.id}>
            <div className="flex flex-col">
              <span className="font-medium">{supplier.name}</span>
              {(supplier.phone || supplier.email) && (
                <span className="text-xs text-muted-foreground">
                  {supplier.phone} {supplier.phone && supplier.email && '•'} {supplier.email}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}