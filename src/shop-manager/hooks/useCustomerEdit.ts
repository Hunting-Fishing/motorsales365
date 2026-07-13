import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/types/customer';
import { getCustomerById } from '@/services/customer/customerQueryService';
import { updateCustomer } from '@/services/customer/customerUpdateService';
import { getAllShops } from '@/services/shops/shopService';
import { convertFormVehicleToCustomerVehicle } from '@/types/customer/vehicle';

export function useCustomerEdit(customerId: string | undefined) {
  const [formValues, setFormValues] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableShops, setAvailableShops] = useState<Array<{ id: string; name: string }>>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!customerId || customerId === "undefined") {
      console.error("Invalid customer ID provided to useCustomerEdit:", customerId);
      setError("Invalid customer ID");
      setIsLoading(false);
      return;
    }

    const fetchCustomer = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const customer = await getCustomerById(customerId);
        if (customer) {
          setFormValues(customer);
        } else {
          setError("Customer not found");
          toast({
            title: "Customer Not Found",
            description: "The customer you are trying to edit does not exist.",
            variant: "destructive",
          });
          navigate('/customers');
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch customer");
        console.error("Error fetching customer:", err);
        toast({
          title: "Error Fetching Customer",
          description: "Failed to retrieve customer details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchShops = async () => {
      try {
        const shops = await getAllShops();
        setAvailableShops(shops.map(shop => ({ id: shop.id, name: shop.name })));
      } catch (err: any) {
        console.error("Error fetching shops:", err);
        toast({
          title: "Error Fetching Shops",
          description: "Failed to retrieve available shops. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchCustomer();
    fetchShops();
  }, [customerId, navigate, toast]);

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Normalize vehicles array
      const vehiclesToUpdate = values.vehicles ? values.vehicles.map(convertFormVehicleToCustomerVehicle) : [];
      
      // Include processed vehicles in the customer update payload
      const customerUpdates = {
        ...values,
        vehicles: vehiclesToUpdate
      };

      // Update customer information
      const updatedCustomer = await updateCustomer(customerId as string, customerUpdates);

      if (updatedCustomer) {
        setFormValues(updatedCustomer);
        toast({
          title: "Customer Updated",
          description: "Customer information has been successfully updated.",
        });
        navigate(`/customers/${customerId}`);
      } else {
        setError("Failed to update customer");
        toast({
          title: "Update Failed",
          description: "Failed to update customer information. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to update customer");
      console.error("Error updating customer:", err);
      toast({
        title: "Update Error",
        description: "An error occurred while updating customer information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formValues,
    isLoading,
    isSubmitting,
    availableShops,
    handleSubmit,
    error
  };
}
