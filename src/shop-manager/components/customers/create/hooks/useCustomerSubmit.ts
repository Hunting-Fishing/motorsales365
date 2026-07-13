import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { CustomerFormValues } from '@/components/customers/form/schemas/customerSchema';
import { createCustomer } from '@/services/customer/customerCreateService';
import { convertFormVehicleToCustomerVehicle } from '@/types/customer/vehicle';
import { Customer } from '@/types/customer';

export function useCustomerSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const resetState = () => {
    setIsSubmitting(false);
    setIsSuccess(false);
    setNewCustomerId(null);
    setError(null);
  };

  const handleSubmit = async (data: CustomerFormValues): Promise<Customer | null> => {
    setIsSubmitting(true);
    setIsSuccess(false);
    setNewCustomerId(null);
    setError(null);

    try {
      const { customerData, vehiclesToCreate } = await processCustomerData(data);

      const newCustomer: Customer | null = await createCustomer(customerData, vehiclesToCreate);

      if (newCustomer) {
        setNewCustomerId(newCustomer.id);
        setIsSuccess(true);
        toast({
          title: "Customer Created",
          description: "Customer has been successfully created.",
        });
        navigate(`/customers/${newCustomer.id}`);
        return newCustomer;
      } else {
        setError("Failed to create customer");
        toast({
          title: "Error",
          description: "Failed to create customer. Please try again.",
          variant: "destructive",
        });
        return null;
      }
    } catch (err: any) {
      setError(err.message || "Failed to create customer");
      console.error("Create customer failed:", err);
      toast({
        title: "Error",
        description: "Failed to create customer. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const processCustomerData = async (data: CustomerFormValues) => {
    console.log("Processing customer data:", data);

    if (!data) {
      throw new Error("No data provided");
    }

    // Extract form-specific fields that shouldn't be saved to the database
    const {
      vehicles,
      create_new_household,
      new_household_name,
      household_relationship,
      ...customerData
    } = data;

    // Process vehicles
    const vehiclesToCreate = vehicles ? vehicles.map(convertFormVehicleToCustomerVehicle) : [];

    return {
      customerData: customerData,
      vehiclesToCreate: vehiclesToCreate,
    };
  };

  return {
    isSubmitting,
    isSuccess,
    newCustomerId,
    error,
    handleSubmit,
    resetState,
  };
}
