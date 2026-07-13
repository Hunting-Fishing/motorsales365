
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WorkOrder } from '@/types/workOrder';
import { Customer } from '@/types/customer';
import { Vehicle } from '@/types/vehicle';

interface Shop {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  tax_id?: string;
}

interface InvoiceData {
  customer: Customer | null;
  vehicle: Vehicle | null;
  shop: Shop | null;
  taxRate: number;
  loading: boolean;
  error: string | null;
}

export const useWorkOrderInvoiceData = (workOrder: WorkOrder): InvoiceData => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [taxRate, setTaxRate] = useState(0.08); // Default tax rate
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch customer data if customer_id exists
        if (workOrder.customer_id) {
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', workOrder.customer_id)
            .maybeSingle();

          if (customerError) {
            console.error('Error fetching customer:', customerError);
          } else {
            setCustomer(customerData);
          }
        }

        // Fetch vehicle data if vehicle_id exists
        if (workOrder.vehicle_id) {
          const { data: vehicleData, error: vehicleError } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', workOrder.vehicle_id)
            .maybeSingle();

          if (vehicleError) {
            console.error('Error fetching vehicle:', vehicleError);
          } else {
            setVehicle(vehicleData as any); // Type assertion for vehicle data from Supabase
          }
        }

        // Fetch shop data - try to get from user's profile first
        const { data: { user } } = await supabase.auth.getUser();
        let shopId = null;

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('shop_id')
            .or(`id.eq.${user.id},user_id.eq.${user.id}`)
            .maybeSingle();

          shopId = profile?.shop_id;
        }

        // If no shop from profile, get the first shop as fallback
        if (!shopId) {
          const { data: firstShop } = await supabase
            .from('shops')
            .select('id')
            .limit(1)
            .maybeSingle();

          shopId = firstShop?.id;
        }

        if (shopId) {
          const { data: shopData, error: shopError } = await supabase
            .from('shops')
            .select('*')
            .eq('id', shopId)
            .maybeSingle();

          if (shopError) {
            console.error('Error fetching shop:', shopError);
          } else {
            setShop(shopData);
          }

          // Try to fetch tax rate from company tax settings
          const { data: taxSettings } = await supabase
            .from('company_settings')
            .select('settings_value')
            .eq('shop_id', shopId)
            .eq('settings_key', 'tax_settings')
            .maybeSingle();

          if (taxSettings?.settings_value && typeof taxSettings.settings_value === 'object') {
            const settingsValue = taxSettings.settings_value as { parts_tax_rate?: number };
            if (settingsValue.parts_tax_rate) {
              setTaxRate(settingsValue.parts_tax_rate / 100);
            }
          }
        }

      } catch (err) {
        console.error('Error fetching invoice data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch invoice data');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, [workOrder.customer_id, workOrder.vehicle_id]);

  return {
    customer,
    vehicle,
    shop,
    taxRate,
    loading,
    error
  };
};
