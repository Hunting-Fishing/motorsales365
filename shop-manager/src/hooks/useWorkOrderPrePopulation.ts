
import { useState, useEffect } from 'react';
import { Customer } from '@/types/customer';
import { supabase } from '@/integrations/supabase/client';

interface PrePopulatedData {
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerZip?: string;
  vehicleId?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleLicensePlate?: string;
  vehicleVin?: string;
}

export function useWorkOrderPrePopulation(prePopulatedData: PrePopulatedData) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomerData = async () => {
      if (!prePopulatedData.customerId) {
        console.log('No customer ID provided, using URL data directly');
        return;
      }

      setLoading(true);
      try {
        console.log('Loading customer data for ID:', prePopulatedData.customerId);
        
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select(`
            *,
            vehicles (*)
          `)
          .eq('id', prePopulatedData.customerId)
          .maybeSingle();

        if (customerError) {
          console.error('Error loading customer:', customerError);
          setError('Failed to load customer data');
          return;
        }

        if (customer) {
          setSelectedCustomer(customer);
          console.log('Customer loaded:', customer);

          // If vehicle information is provided in URL, try to match it with customer's vehicles
          if (prePopulatedData.vehicleId && customer.vehicles) {
            const matchedVehicle = customer.vehicles.find((v: any) => v.id === prePopulatedData.vehicleId);
            if (matchedVehicle) {
              setSelectedVehicle(matchedVehicle);
              console.log('Vehicle matched:', matchedVehicle);
            }
          }
        }
      } catch (err) {
        console.error('Exception loading customer data:', err);
        setError('Failed to load customer data');
      } finally {
        setLoading(false);
      }
    };

    loadCustomerData();
  }, [prePopulatedData.customerId]);

  const getInitialFormData = () => {
    const formData: any = {
      // Default values
      status: 'pending',
      priority: 'medium',
      inventoryItems: [],
    };

    // Customer information from database or URL
    if (selectedCustomer) {
      formData.customer = `${selectedCustomer.first_name} ${selectedCustomer.last_name}`.trim();
      formData.customerEmail = selectedCustomer.email || '';
      formData.customerPhone = selectedCustomer.phone || '';
      formData.customerAddress = selectedCustomer.address || '';
    } else if (prePopulatedData.customerName) {
      formData.customer = prePopulatedData.customerName;
      formData.customerEmail = prePopulatedData.customerEmail || '';
      formData.customerPhone = prePopulatedData.customerPhone || '';
      formData.customerAddress = prePopulatedData.customerAddress || '';
    }

    // Vehicle information from database or URL
    if (selectedVehicle) {
      formData.vehicleMake = selectedVehicle.make || '';
      formData.vehicleModel = selectedVehicle.model || '';
      formData.vehicleYear = selectedVehicle.year?.toString() || '';
      formData.licensePlate = selectedVehicle.license_plate || '';
      formData.vin = selectedVehicle.vin || '';
    } else {
      formData.vehicleMake = prePopulatedData.vehicleMake || '';
      formData.vehicleModel = prePopulatedData.vehicleModel || '';
      formData.vehicleYear = prePopulatedData.vehicleYear || '';
      formData.licensePlate = prePopulatedData.vehicleLicensePlate || '';
      formData.vin = prePopulatedData.vehicleVin || '';
    }

    console.log('Generated form data:', formData);
    return formData;
  };

  return {
    selectedCustomer,
    selectedVehicle,
    loading,
    error,
    getInitialFormData,
    setSelectedCustomer,
    setSelectedVehicle
  };
}
