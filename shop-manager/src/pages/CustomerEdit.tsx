
import React from 'react';
import { useParams } from 'react-router-dom';
import { CustomerForm } from '@/components/customers/form/CustomerForm';
import { useCustomerEdit } from '@/hooks/useCustomerEdit';
import type { CustomerFormValues } from '@/components/customers/form/schemas/customerSchema';
import { formatVehicleYear } from '@/types/customer/vehicle';

export default function CustomerEdit() {
  const { customerId } = useParams<{ customerId: string }>();
  
  const {
    formValues,
    isLoading,
    isSubmitting,
    availableShops,
    handleSubmit,
    error
  } = useCustomerEdit(customerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!formValues) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800">Customer not found</p>
        </div>
      </div>
    );
  }

  // Helper function to convert null to empty string
  const nullToEmptyString = (value: any): string => {
    return value === null || value === undefined ? "" : String(value);
  };

  // Transform customer data to match form expected format
  const transformedFormValues: CustomerFormValues = {
    ...formValues,
    // Convert all null string fields to empty strings
    email: nullToEmptyString(formValues.email),
    phone: nullToEmptyString(formValues.phone),
    address: nullToEmptyString(formValues.address),
    city: nullToEmptyString(formValues.city),
    state: nullToEmptyString(formValues.state),
    postal_code: nullToEmptyString(formValues.postal_code),
    country: nullToEmptyString(formValues.country),
    company: nullToEmptyString(formValues.company),
    business_type: nullToEmptyString(formValues.business_type),
    business_industry: nullToEmptyString(formValues.business_industry),
    other_business_industry: nullToEmptyString(formValues.other_business_industry),
    tax_id: nullToEmptyString(formValues.tax_id),
    business_email: nullToEmptyString(formValues.business_email),
    business_phone: nullToEmptyString(formValues.business_phone),
    preferred_payment_method: nullToEmptyString(formValues.preferred_payment_method),
    credit_terms: nullToEmptyString(formValues.credit_terms),
    fleet_company: nullToEmptyString(formValues.fleet_company),
    fleet_manager: nullToEmptyString(formValues.fleet_manager),
    fleet_contact: nullToEmptyString(formValues.fleet_contact),
    preferred_service_type: nullToEmptyString(formValues.preferred_service_type),
    notes: nullToEmptyString(formValues.notes),
    preferred_technician_id: nullToEmptyString(formValues.preferred_technician_id),
    communication_preference: nullToEmptyString(formValues.communication_preference),
    referral_source: nullToEmptyString(formValues.referral_source),
    referral_person_id: nullToEmptyString(formValues.referral_person_id),
    other_referral_details: nullToEmptyString(formValues.other_referral_details),
    household_id: nullToEmptyString(formValues.household_id),
    new_household_name: "", // Form-only field, not in database
    household_relationship: "", // Form-only field, not in database
    // Ensure vehicles array is properly formatted for the form
    vehicles: formValues.vehicles?.map(vehicle => ({
      ...vehicle,
      year: formatVehicleYear(vehicle.year), // Convert number to string if needed
      vin: nullToEmptyString(vehicle.vin),
      license_plate: nullToEmptyString(vehicle.license_plate),
      make: nullToEmptyString(vehicle.make),
      model: nullToEmptyString(vehicle.model),
      color: nullToEmptyString(vehicle.color),
      notes: nullToEmptyString(vehicle.notes),
    })) || [],
    // Ensure tags and segments are arrays
    tags: Array.isArray(formValues.tags) ? formValues.tags : [],
    segments: Array.isArray(formValues.segments) ? formValues.segments : [],
    // Set default boolean values if undefined
    is_fleet: formValues.is_fleet || false,
    auto_billing: formValues.auto_billing || false,
    terms_agreed: formValues.terms_agreed || false,
    create_new_household: false, // Always default for edit mode
  };

  // Debug logging
  console.log("Raw customer data:", formValues);
  console.log("Transformed form values:", transformedFormValues);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
        <p className="text-gray-600">Update customer information</p>
      </div>
      
      <CustomerForm
        defaultValues={transformedFormValues}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        availableShops={availableShops}
        isEditMode={true}
        customerId={customerId}
        formId="customer-edit-form"
      />
    </div>
  );
}
