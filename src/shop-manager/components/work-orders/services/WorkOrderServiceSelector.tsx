import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Check, X, ArrowDown } from 'lucide-react';
import { SelectedService } from '@/types/selectedService';
import { useServiceSectors } from '@/hooks/useServiceCategories';
import { IntegratedServiceSelector } from '@/components/work-orders/fields/services/IntegratedServiceSelector';

interface WorkOrderServiceSelectorProps {
  selectedServices: SelectedService[];
  onServiceSelect: (service: any, categoryName: string, subcategoryName: string) => void;
  onRemoveService: (serviceId: string) => void;
  onUpdateServices: (services: SelectedService[]) => void;
  onConvertToJobLines: () => Promise<void>;
  isConverting: boolean;
}

export function WorkOrderServiceSelector({
  selectedServices,
  onServiceSelect,
  onRemoveService,
  onUpdateServices,
  onConvertToJobLines,
  isConverting
}: WorkOrderServiceSelectorProps) {
  const { sectors, loading, error } = useServiceSectors();

  return (
    <div className="space-y-4">
      {/* Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Services to Work Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading services...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          ) : sectors.length > 0 ? (
            <IntegratedServiceSelector
              sectors={sectors}
              onServiceSelect={onServiceSelect}
              selectedServices={selectedServices}
              onRemoveService={onRemoveService}
              onUpdateServices={onUpdateServices}
              onDataRefresh={() => window.location.reload()}
            />
          ) : (
            <div className="text-center py-8 border rounded-md bg-gray-50">
              <p className="text-gray-500">No services available</p>
              <p className="text-sm text-gray-400">Contact your administrator to set up services</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Services Summary */}
      {selectedServices.length > 0 && (
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Check className="h-5 w-5 text-blue-600" />
                Selected Services ({selectedServices.length})
              </span>
              <Button
                onClick={onConvertToJobLines}
                disabled={isConverting}
                className="flex items-center gap-2"
              >
                {isConverting ? (
                  <>Converting...</>
                ) : (
                  <>
                    <ArrowDown className="h-4 w-4" />
                    Add to Labor & Services
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedServices.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex-1">
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-muted-foreground">{service.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{service.category}</Badge>
                      <span className="text-sm text-muted-foreground">
                        ${service.total_amount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveService(service.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}