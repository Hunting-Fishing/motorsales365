
import React from 'react';
import { SelectedService } from '@/types/selectedService';
import { Button } from '@/components/ui/button';
import { X, Clock, DollarSign } from 'lucide-react';

interface SelectedServiceCardProps {
  service: SelectedService;
  onRemove: (serviceId: string) => void;
  isNew?: boolean;
}

export function SelectedServiceCard({ service, onRemove, isNew = false }: SelectedServiceCardProps) {
  return (
    <div className={`border rounded-lg p-3 bg-white relative transition-all duration-300 ${
      isNew ? 'ring-2 ring-blue-300 bg-blue-50' : ''
    }`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(service.id)}
        className="absolute top-1 right-1 h-6 w-6 p-0 hover:bg-red-100"
      >
        <X className="h-3 w-3" />
      </Button>
      
      <div className="pr-6">
        <h4 className="font-medium text-sm text-gray-900">{service.name}</h4>
        <p className="text-xs text-gray-600 mt-1">
          {service.category} • {service.subcategory}
        </p>
        
        {service.description && (
          <p className="text-xs text-gray-500 mt-1">{service.description}</p>
        )}
        
        <div className="flex items-center gap-3 mt-2">
          {service.estimatedTime && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {service.estimatedTime}min
            </div>
          )}
          {service.price && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <DollarSign className="h-3 w-3" />
              ${service.price}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
