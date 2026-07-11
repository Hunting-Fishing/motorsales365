
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryFormField } from '../InventoryFormField';
import { Separator } from '@/components/ui/separator';
import { WebLinksSection } from './WebLinksSection';

interface AdditionalInfoSectionProps {
  values: any;
  errors: any;
  onChange: (field: string, value: any) => void;
}

export function AdditionalInfoSection({ values, errors, onChange }: AdditionalInfoSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InventoryFormField
              label="Date Last Ordered"
              name="dateBought"
              type="date"
              value={values.dateBought || ''}
              onChange={(e) => onChange('dateBought', e.target.value)}
              error={errors.dateBought}
            />
            
            <InventoryFormField
              label="Date Last Used"
              name="dateLast"
              type="date"
              value={values.dateLast || ''}
              onChange={(e) => onChange('dateLast', e.target.value)}
              error={errors.dateLast}
            />
          </div>

          <Separator className="my-4" />

          <InventoryFormField
            label="Notes"
            name="notes"
            value={values.notes || ''}
            onChange={(e) => onChange('notes', e.target.value)}
            error={errors.notes}
            placeholder="Enter any additional notes about this item"
            as="textarea"
            description="Internal notes about this inventory item"
          />
        </CardContent>
      </Card>

      {/* Web Links Section */}
      <WebLinksSection 
        values={values}
        onChange={onChange}
      />
    </div>
  );
}
