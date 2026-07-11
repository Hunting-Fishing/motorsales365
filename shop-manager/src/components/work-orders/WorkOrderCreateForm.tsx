
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { WorkOrderForm } from './WorkOrderForm';
import { WorkOrderErrorBoundary } from './WorkOrderErrorBoundary';

interface WorkOrderCreateFormProps {
  form?: any;
  onSubmit?: () => Promise<void>;
}

function WorkOrderCreateFormContent({ form, onSubmit }: WorkOrderCreateFormProps) {
  const navigate = useNavigate();

  const handleFormSubmit = async (data: any) => {
    try {
      console.log('Work order form submitted:', data);
      if (onSubmit) {
        await onSubmit();
      }
    } catch (error) {
      console.error('Error submitting work order form:', error);
      throw error; // Re-throw to be caught by error boundary
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Work Order</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkOrderForm onSubmit={handleFormSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}

export function WorkOrderCreateForm({ form, onSubmit }: WorkOrderCreateFormProps) {
  return (
    <WorkOrderErrorBoundary>
      <WorkOrderCreateFormContent form={form} onSubmit={onSubmit} />
    </WorkOrderErrorBoundary>
  );
}
