import React from 'react';
import { UseFormReturn } from 'react-hook-form';

interface DebugVehicleFormProps {
  form: UseFormReturn<any>;
  index: number;
  makes: any[];
  isLoadingMakes: boolean;
  makesError: string | null;
}

export const DebugVehicleForm: React.FC<DebugVehicleFormProps> = ({
  form,
  index,
  makes,
  isLoadingMakes,
  makesError
}) => {
  const vehicleData = form.watch(`vehicles.${index}`);
  const formErrors = form.formState.errors;
  const vehicleErrors = formErrors.vehicles?.[index];

  // Only show debug info in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">
      <h4 className="font-semibold mb-2">🐛 Debug Info - Vehicle {index + 1}</h4>
      
      <div className="space-y-2">
        <div>
          <strong>Makes Status:</strong>
          <div className="ml-2">
            Loading: {isLoadingMakes ? 'Yes' : 'No'}<br/>
            Count: {makes.length}<br/>
            Error: {makesError || 'None'}
          </div>
        </div>

        <div>
          <strong>Current Vehicle Data:</strong>
          <pre className="ml-2 text-xs bg-white dark:bg-gray-900 p-2 rounded overflow-auto">
            {JSON.stringify(vehicleData, null, 2)}
          </pre>
        </div>

        {vehicleErrors && (
          <div>
            <strong>Validation Errors:</strong>
            <pre className="ml-2 text-xs bg-red-50 dark:bg-red-900 p-2 rounded overflow-auto text-red-800 dark:text-red-200">
              {JSON.stringify(vehicleErrors, null, 2)}
            </pre>
          </div>
        )}

        <div>
          <strong>Form State:</strong>
          <div className="ml-2">
            Is Valid: {form.formState.isValid ? 'Yes' : 'No'}<br/>
            Is Dirty: {form.formState.isDirty ? 'Yes' : 'No'}<br/>
            Is Submitting: {form.formState.isSubmitting ? 'Yes' : 'No'}
          </div>
        </div>
      </div>
    </div>
  );
};