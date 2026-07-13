import React, { useState, useEffect, useRef } from 'react';
import { ServiceSector, ServiceJob } from '@/types/service';
import { SelectedService, ServiceSelectionSummary } from '@/types/selectedService';
import { HierarchicalServiceSelector } from './HierarchicalServiceSelector';
import { SelectedServiceCard } from './SelectedServiceCard';
import { ServiceSelectionSummary as SummaryComponent } from './ServiceSelectionSummary';
import { CollapsedServiceSelector } from './CollapsedServiceSelector';
import { ResponsiveGrid } from '@/components/ui/responsive-grid';

interface EnhancedServiceSelectorProps {
  sectors: ServiceSector[];
  onServiceSelect: (service: ServiceJob, categoryName: string, subcategoryName: string) => void;
  selectedServices: SelectedService[];
  onRemoveService: (serviceId: string) => void;
  onUpdateServices: (services: SelectedService[]) => void;
}

export function EnhancedServiceSelector({
  sectors,
  onServiceSelect,
  selectedServices,
  onRemoveService,
  onUpdateServices
}: EnhancedServiceSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(selectedServices.length === 0);
  const [lastAddedServiceId, setLastAddedServiceId] = useState<string | null>(null);
  const selectedServicesRef = useRef<HTMLDivElement>(null);

  // Calculate summary
  const summary: ServiceSelectionSummary = {
    totalServices: selectedServices.length,
    totalEstimatedTime: selectedServices.reduce((total, service) => 
      total + (service.estimatedTime || 0), 0),
    totalEstimatedCost: selectedServices.reduce((total, service) => 
      total + (service.price || 0), 0),
    services: selectedServices
  };

  // Handle service selection - only call parent callback, don't manage state here
  const handleServiceSelect = (service: ServiceJob, categoryName: string, subcategoryName: string) => {
    // Just call the parent callback - let the parent manage the state
    onServiceSelect(service, categoryName, subcategoryName);

    // Scroll to selected services after a brief delay
    setTimeout(() => {
      selectedServicesRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }, 100);
  };

  const handleRemoveService = (serviceId: string) => {
    onRemoveService(serviceId);

    // If no services left, expand the selector
    if (selectedServices.length <= 1) {
      setIsExpanded(true);
    }
  };

  const handleExpand = () => {
    setIsExpanded(true);
  };

  // Clear the last added service animation after it's been shown
  useEffect(() => {
    if (lastAddedServiceId) {
      const timer = setTimeout(() => {
        setLastAddedServiceId(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lastAddedServiceId]);

  // Track when services are added to show animation
  useEffect(() => {
    if (selectedServices.length > 0) {
      const latestService = selectedServices[selectedServices.length - 1];
      setLastAddedServiceId(latestService.id);
    }
  }, [selectedServices.length]);

  return (
    <div className="space-y-4">
      {/* Selected Services Section */}
      {selectedServices.length > 0 && (
        <div ref={selectedServicesRef} className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700">Selected Services</h4>
            <span className="text-xs text-slate-500">
              {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''}
            </span>
          </div>

          <ResponsiveGrid cols={{ default: 1, md: 2 }} gap="sm">
            {selectedServices.map((service) => (
              <SelectedServiceCard
                key={service.id}
                service={service}
                onRemove={handleRemoveService}
                isNew={service.id === lastAddedServiceId}
              />
            ))}
          </ResponsiveGrid>

          <SummaryComponent summary={summary} />
        </div>
      )}

      {/* Service Selector Section */}
      {isExpanded ? (
        <div className="space-y-4">
          {selectedServices.length > 0 && (
            <div className="flex items-center justify-between border-t pt-4">
              <h4 className="text-sm font-medium text-slate-700">Add More Services</h4>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Collapse
              </button>
            </div>
          )}
          
          <HierarchicalServiceSelector
            sectors={sectors}
            selectedServices={selectedServices}
            onServiceSelect={handleServiceSelect}
            onRemoveService={handleRemoveService}
            onUpdateServices={onUpdateServices}
          />
        </div>
      ) : (
        <CollapsedServiceSelector
          onExpand={handleExpand}
          serviceCount={selectedServices.length}
        />
      )}
    </div>
  );
}
