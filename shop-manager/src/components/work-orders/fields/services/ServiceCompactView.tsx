
import React from 'react';
import { Button } from '@/components/ui/button';
import { ServiceMainCategory, ServiceJob } from '@/types/service';
import { SelectedService } from '@/types/selectedService';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, Plus, Check } from 'lucide-react';

interface ServiceCompactViewProps {
  categories: ServiceMainCategory[];
  onServiceSelect: (service: ServiceJob, categoryName: string, subcategoryName: string) => void;
  selectedServices: SelectedService[];
  maxItems?: number;
}

export function ServiceCompactView({
  categories,
  onServiceSelect,
  selectedServices,
  maxItems = 50
}: ServiceCompactViewProps) {
  // Get all services flattened
  const allServices = categories.flatMap(category =>
    category.subcategories.flatMap(subcategory =>
      subcategory.jobs.map(job => ({
        ...job,
        categoryName: category.name,
        subcategoryName: subcategory.name
      }))
    )
  ).slice(0, maxItems);

  const isServiceSelected = (serviceId: string) => {
    return selectedServices.some(selected => selected.serviceId === serviceId);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-700">Available Services</h4>
        <Badge variant="outline" className="text-xs">
          {allServices.length} services
        </Badge>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {allServices.map((service) => (
          <div
            key={service.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm">{service.name}</span>
                {isServiceSelected(service.id) && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Selected
                  </Badge>
                )}
              </div>
              
              {service.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {service.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="font-medium">
                  {service.categoryName} → {service.subcategoryName}
                </span>
                
                {service.estimatedTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {service.estimatedTime}min
                  </div>
                )}
                
                {service.price && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${service.price}
                  </div>
                )}
              </div>
            </div>

            <Button
              size="sm"
              variant={isServiceSelected(service.id) ? "secondary" : "outline"}
              onClick={() => {
                if (!isServiceSelected(service.id)) {
                  onServiceSelect(service, service.categoryName, service.subcategoryName);
                }
              }}
              disabled={isServiceSelected(service.id)}
              className="ml-4 flex-shrink-0"
            >
              {isServiceSelected(service.id) ? (
                <Check className="h-3 w-3" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
            </Button>
          </div>
        ))}
        
        {allServices.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No services found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
}
