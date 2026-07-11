import React, { useMemo } from 'react';
import { ServiceSector, ServiceJob } from '@/types/service';
import { SelectedService } from '@/types/selectedService';
import { SmartServiceSelector } from './SmartServiceSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
interface IntegratedServiceSelectorProps {
  sectors: ServiceSector[];
  onServiceSelect: (service: ServiceJob, categoryName: string, subcategoryName: string) => void;
  selectedServices?: SelectedService[];
  onRemoveService?: (serviceId: string) => void;
  onUpdateServices?: (services: SelectedService[]) => void;
  onDataRefresh?: () => void;
}
export const IntegratedServiceSelector: React.FC<IntegratedServiceSelectorProps> = ({
  sectors,
  onServiceSelect,
  selectedServices = [],
  onRemoveService,
  onUpdateServices,
  onDataRefresh
}) => {
  const handleServiceSelect = (service: ServiceJob, categoryName: string, subcategoryName: string) => {
    // Check if service is already selected
    const isAlreadySelected = selectedServices.some(s => s.serviceId === service.id || s.id === service.id);
    if (isAlreadySelected) return;

    // Create new selected service
    const newService: SelectedService = {
      id: `${service.id}-${Date.now()}`,
      // Unique ID for the selection
      serviceId: service.id,
      name: service.name,
      description: service.description,
      category: categoryName,
      subcategory: subcategoryName,
      categoryName: categoryName,
      subcategoryName: subcategoryName,
      estimatedTime: service.estimatedTime,
      price: service.price,
      estimated_hours: service.estimatedTime ? service.estimatedTime / 60 : 0,
      labor_rate: service.price || 0,
      total_amount: service.price || 0,
      status: 'pending'
    };

    // Update services list
    if (onUpdateServices) {
      onUpdateServices([...selectedServices, newService]);
    }

    // Also call the original callback
    onServiceSelect(service, categoryName, subcategoryName);
  };
  const handleRemoveService = (serviceId: string) => {
    if (onUpdateServices) {
      const updatedServices = selectedServices.filter(s => s.id !== serviceId);
      onUpdateServices(updatedServices);
    }
    if (onRemoveService) {
      onRemoveService(serviceId);
    }
  };
  return <div className="space-y-4 bg-background">
      <SmartServiceSelector 
        sectors={sectors} 
        onServiceSelect={handleServiceSelect} 
        selectedServices={selectedServices} 
        onRemoveService={handleRemoveService} 
        onUpdateServices={onUpdateServices}
        onDataRefresh={onDataRefresh}
      />

      {/* Selected Services Summary */}
      {selectedServices.length > 0 && <Card className="border-2 border-emerald-200 shadow-xl bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardHeader className="bg-gradient-to-r from-emerald-100 to-teal-100 border-b-2 border-emerald-200">
            <CardTitle className="text-lg font-bold text-emerald-800 flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {selectedServices.length}
              </div>
              Selected Services ({selectedServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
            <div className="space-y-3">
              {selectedServices.map(service => <div key={service.id} className="group flex items-center justify-between p-4 border-2 border-emerald-200 rounded-xl bg-gradient-to-r from-white to-emerald-50 hover:from-emerald-100 hover:to-teal-100 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-102 relative overflow-hidden">
                  <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm animate-scale-in">
                    ✓
                  </div>
                  <div className="flex-1 pr-8">
                    <div className="font-bold text-lg text-emerald-900">{service.name}</div>
                    <div className="text-sm text-emerald-700 font-medium mt-1">
                      🏢 {service.category} › 🔧 {service.subcategory}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      {service.estimatedTime && <span className="bg-emerald-200 text-emerald-800 px-2 py-1 rounded-md text-xs font-bold">
                          ⏱️ {service.estimatedTime} min
                        </span>}
                      {service.price && <span className="bg-green-500 text-white px-2 py-1 rounded-md text-xs font-bold">
                          💰 ${service.price}
                        </span>}
                    </div>
                  </div>
                  <button onClick={() => handleRemoveService(service.id)} className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    Remove
                  </button>
                </div>)}
            </div>
          </CardContent>
        </Card>}
    </div>;
};