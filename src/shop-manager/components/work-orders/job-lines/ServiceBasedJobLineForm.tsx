import React, { useState } from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { JobLineForm } from './JobLineForm';
import { IntegratedServiceSelector } from '@/components/work-orders/fields/services/IntegratedServiceSelector';
import { ServiceJob } from '@/types/service';
import { SelectedService } from '@/types/selectedService';
import { useServiceSectors } from '@/hooks/useServiceCategories';
import { Button } from '@/components/ui/button';
export interface ServiceBasedJobLineFormProps {
  workOrderId: string;
  onSave: (jobLines: WorkOrderJobLine[]) => void;
  onCancel: () => void;
  jobLine?: WorkOrderJobLine;
  mode?: 'service' | 'manual';
}
export function ServiceBasedJobLineForm({
  workOrderId,
  onSave,
  onCancel,
  jobLine,
  mode = 'service'
}: ServiceBasedJobLineFormProps) {
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const {
    sectors,
    loading,
    error
  } = useServiceSectors();
  const handleServiceSelect = (service: ServiceJob, categoryName: string, subcategoryName: string) => {
    console.log('Service selected:', service.name);
  };
  const handleRemoveService = (serviceId: string) => {
    const updatedServices = selectedServices.filter(s => s.id !== serviceId);
    setSelectedServices(updatedServices);
  };
  const handleUpdateServices = (services: SelectedService[]) => {
    setSelectedServices(services);
  };
  const handleSaveServices = () => {
    // Convert selected services to job lines
    const jobLines: WorkOrderJobLine[] = selectedServices.map((service, index) => ({
      id: service.id,
      work_order_id: workOrderId,
      name: service.name,
      category: service.category,
      subcategory: service.subcategory,
      description: service.description,
      estimated_hours: service.estimated_hours,
      labor_rate: service.labor_rate,
      total_amount: service.total_amount,
      status: service.status,
      display_order: index + 1,
      labor_rate_type: 'standard',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    onSave(jobLines);
  };

  // For manual mode, use the existing JobLineForm
  if (mode === 'manual') {
    return <JobLineForm workOrderId={workOrderId} jobLine={jobLine} onSave={onSave} onCancel={onCancel} isEditing={!!jobLine} mode={mode} />;
  }

  // For service mode, use the comprehensive 4-tier service selector
  return <div className="space-y-6 p-6 bg-slate-200">
      <div className="text-center border-b pb-4">
        <h3 className="text-lg font-semibold">Select Services from Catalog</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose services from the comprehensive service catalog
        </p>
      </div>

      {loading ? <div className="text-center py-8">
          <p className="text-gray-500">Loading services...</p>
        </div> : error ? <div className="text-center py-8">
          <p className="text-red-500">{error}</p>
          <Button type="button" onClick={() => window.location.reload()} variant="outline" className="mt-2">
            Retry
          </Button>
        </div> : sectors.length > 0 ? <IntegratedServiceSelector sectors={sectors} onServiceSelect={handleServiceSelect} selectedServices={selectedServices} onRemoveService={handleRemoveService} onUpdateServices={handleUpdateServices} /> : <div className="text-center py-8 border rounded-md bg-gray-50">
          <p className="text-gray-500">No services available</p>
          <p className="text-sm text-gray-400">Contact your administrator to set up services</p>
        </div>}

      {/* Form actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button type="button" onClick={handleSaveServices} disabled={selectedServices.length === 0}>
          Add Selected Services ({selectedServices.length})
        </Button>
      </div>
    </div>;
}