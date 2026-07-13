
import React, { useState, useEffect } from "react";
import { IntegratedServiceSelector } from "./services/IntegratedServiceSelector";
import { ServiceSector, ServiceJob } from "@/types/service";
import { SelectedService } from "@/types/selectedService";
import { useServiceSectors } from "@/hooks/useServiceCategories";

interface ServicesSectionProps {
  onServiceSelect?: (service: ServiceJob, categoryName: string, subcategoryName: string) => void;
  selectedServices?: SelectedService[];
  onUpdateServices?: (services: SelectedService[]) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  onServiceSelect,
  selectedServices = [],
  onUpdateServices
}) => {
  const { sectors, loading, error } = useServiceSectors();

  const handleServiceSelect = (service: ServiceJob, categoryName: string, subcategoryName: string) => {
    if (onServiceSelect) {
      onServiceSelect(service, categoryName, subcategoryName);
    }
  };

  const handleRemoveService = (serviceId: string) => {
    if (onUpdateServices) {
      const updatedServices = selectedServices.filter(s => s.id !== serviceId);
      onUpdateServices(updatedServices);
    }
  };

  const handleUpdateServices = (services: SelectedService[]) => {
    if (onUpdateServices) {
      onUpdateServices(services);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading services...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (sectors.length === 0) {
    return (
      <div className="text-center py-8 border rounded-md bg-gray-50">
        <p className="text-gray-500">No services available</p>
        <p className="text-sm text-gray-400">Contact your administrator to set up services</p>
      </div>
    );
  }

  return (
    <IntegratedServiceSelector
      sectors={sectors}
      onServiceSelect={handleServiceSelect}
      selectedServices={selectedServices}
      onRemoveService={handleRemoveService}
      onUpdateServices={handleUpdateServices}
    />
  );
};
