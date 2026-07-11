
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IntegratedServiceSelector } from "@/components/work-orders/fields/services/IntegratedServiceSelector";
import { ServiceSector, ServiceJob } from "@/types/service";
import { SelectedService } from "@/types/selectedService";
import { fetchServiceSectors } from "@/lib/services/serviceApi";
import { Settings } from "lucide-react";

interface WorkOrderInfoSectionProps {
  onServiceSelect?: (service: ServiceJob, categoryName: string, subcategoryName: string) => void;
  selectedServices?: SelectedService[];
  onUpdateServices?: (services: SelectedService[]) => void;
}

export const WorkOrderInfoSection: React.FC<WorkOrderInfoSectionProps> = ({
  onServiceSelect,
  selectedServices = [],
  onUpdateServices
}) => {
  const [serviceSectors, setServiceSectors] = useState<ServiceSector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadServiceSectors = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const sectors = await fetchServiceSectors();
        setServiceSectors(sectors);
      } catch (err) {
        console.error("Failed to load service sectors:", err);
        setError("Failed to load service sectors. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadServiceSectors();
  }, []);

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

  return (
    <Card className="mb-4 border-blue-100">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-transparent">
        <CardTitle className="text-lg flex items-center">
          <Settings className="h-5 w-5 mr-2 text-blue-600" />
          Service Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading services...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
          </div>
        ) : serviceSectors.length > 0 ? (
          <IntegratedServiceSelector
            sectors={serviceSectors}
            onServiceSelect={handleServiceSelect}
            selectedServices={selectedServices}
            onRemoveService={handleRemoveService}
            onUpdateServices={handleUpdateServices}
          />
        ) : (
          <div className="text-center py-8 border rounded-md bg-gray-50">
            <p className="text-gray-500">No services available</p>
            <p className="text-sm text-gray-400">Contact your administrator to set up services</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
